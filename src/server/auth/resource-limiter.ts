import fs from 'node:fs';
import os from 'node:os';

/**
 * ============================================================================
 * ALOR SPA — Argon2 Resource Limiter & Concurrency Semaphore
 * Strict memory-budget enforcement with cgroups v1/v2 awareness
 * ============================================================================
 */

export class ResourceLimiterError extends Error {
  constructor(message: string, public readonly statusCode = 503) {
    super(message);
    this.name = 'ResourceLimiterError';
  }
}

/**
 * Calculates safe concurrency for Argon2 operations based on container cgroups
 * or host operating system memory.
 * Each Argon2 operation requires 64 MiB RAM.
 * If available memory after deducting base overhead (350 MiB) is under 64 MiB,
 * returns 0 to prevent Out-Of-Memory (OOM) termination.
 */
export function getSafeArgon2Concurrency(configuredLimit = 2): number {
  let cgroupLimit = Infinity;
  let cgroupUsage = 0;

  try {
    // 1. Check cgroups v2
    if (fs.existsSync('/sys/fs/cgroup/memory.max')) {
      const maxStr = fs.readFileSync('/sys/fs/cgroup/memory.max', 'utf8').trim();
      if (maxStr !== 'max') {
        const parsed = parseInt(maxStr, 10);
        if (!isNaN(parsed)) cgroupLimit = parsed;
      }
      if (fs.existsSync('/sys/fs/cgroup/memory.current')) {
        const usageStr = fs.readFileSync('/sys/fs/cgroup/memory.current', 'utf8').trim();
        const parsed = parseInt(usageStr, 10);
        if (!isNaN(parsed)) cgroupUsage = parsed;
      }
    }
    // 2. Check cgroups v1
    else if (fs.existsSync('/sys/fs/cgroup/memory/memory.limit_in_bytes')) {
      const limitStr = fs.readFileSync('/sys/fs/cgroup/memory/memory.limit_in_bytes', 'utf8').trim();
      const parsedLimit = parseInt(limitStr, 10);
      if (!isNaN(parsedLimit) && parsedLimit < 9000000000000000) {
        cgroupLimit = parsedLimit;
      }
      if (fs.existsSync('/sys/fs/cgroup/memory/memory.usage_in_bytes')) {
        const usageStr = fs.readFileSync('/sys/fs/cgroup/memory/memory.usage_in_bytes', 'utf8').trim();
        const parsed = parseInt(usageStr, 10);
        if (!isNaN(parsed)) cgroupUsage = parsed;
      }
    }
  } catch {
    // Fall back cleanly to os.freemem() if cgroup files cannot be read
  }

  const cgroupAvailable =
    cgroupLimit !== Infinity ? Math.max(0, cgroupLimit - cgroupUsage) : os.freemem();
  const effectiveFreeRam = Math.min(cgroupAvailable, os.freemem());

  // Base overhead for Node runtime, SQLite cache and buffers: 350 MiB
  const baseOverhead = 350 * 1024 * 1024;
  const memoryForArgon2 = effectiveFreeRam - baseOverhead;

  // If available memory is less than 1 full 64 MiB Argon2 block: strictly return 0!
  if (memoryForArgon2 < 64 * 1024 * 1024) {
    return 0;
  }

  const allowableSlots = Math.floor(memoryForArgon2 / (64 * 1024 * 1024));
  return Math.max(0, Math.min(configuredLimit, allowableSlots));
}

interface QueuedItem {
  resolve: (release: () => void) => void;
  reject: (err: Error) => void;
  timer: NodeJS.Timeout;
}

export class Argon2ResourceLimiter {
  private activeCount = 0;
  private queue: QueuedItem[] = [];
  private capacity: number;

  constructor(defaultLimit = 2) {
    this.capacity = getSafeArgon2Concurrency(defaultLimit);
  }

  public getCapacity(): number {
    return this.capacity;
  }

  public getActiveCount(): number {
    return this.activeCount;
  }

  public getQueueLength(): number {
    return this.queue.length;
  }

  /**
   * Refreshes the effective capacity dynamically (e.g. periodically or on memory pressure).
   */
  public refreshCapacity(defaultLimit = 2): void {
    this.capacity = getSafeArgon2Concurrency(defaultLimit);
  }

  /**
   * Sets capacity directly (useful for testing zero-capacity and concurrency limits).
   */
  public _setCapacityForTesting(capacity: number): void {
    this.capacity = capacity;
  }

  /**
   * Acquires a concurrency slot for Argon2 computation.
   * If capacity is 0 or all slots are busy and queue timeout expires, rejects with 503.
   * 
   * CRITICAL REQUIREMENT:
   * The returned `release` callback MUST ONLY be called when the native Argon2 thread
   * completes its calculation. It must NEVER be called prematurely.
   */
  public acquire(timeoutMs = 2500): Promise<() => void> {
    if (this.capacity <= 0) {
      return Promise.reject(
        new ResourceLimiterError(
          'Insufficient memory capacity to process cryptographic operations.',
          503
        )
      );
    }

    if (this.activeCount < this.capacity) {
      this.activeCount++;
      let released = false;
      const release = () => {
        if (released) return;
        released = true;
        this.activeCount--;
        this.processNext();
      };
      return Promise.resolve(release);
    }

    return new Promise<() => void>((resolve, reject) => {
      const timer = setTimeout(() => {
        const idx = this.queue.findIndex((q) => q.resolve === resolve);
        if (idx !== -1) {
          this.queue.splice(idx, 1);
        }
        reject(
          new ResourceLimiterError(
            'Cryptographic resource queue timeout exceeded.',
            503
          )
        );
      }, timeoutMs);

      this.queue.push({ resolve, reject, timer });
    });
  }

  private processNext(): void {
    if (this.queue.length === 0 || this.activeCount >= this.capacity) {
      return;
    }

    const next = this.queue.shift();
    if (!next) return;

    clearTimeout(next.timer);
    this.activeCount++;

    let released = false;
    const release = () => {
      if (released) return;
      released = true;
      this.activeCount--;
      this.processNext();
    };

    next.resolve(release);
  }

  public _resetForTesting(): void {
    for (const item of this.queue) {
      clearTimeout(item.timer);
    }
    this.queue = [];
    this.activeCount = 0;
    this.capacity = getSafeArgon2Concurrency(2);
  }
}

export const argon2Limiter = new Argon2ResourceLimiter(2);
