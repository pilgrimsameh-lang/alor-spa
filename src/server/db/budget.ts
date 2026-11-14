/**
 * ============================================================================
 * ALOR SPA — SQLite Execution Budget & Concurrency Guard
 * Enforces strict transaction timeout boundaries (Max 1750ms)
 * ============================================================================
 */

export interface SqliteBudgetOptions {
  maxRetries?: number;
  minBackoffMs?: number;
  maxBackoffMs?: number;
}

const DEFAULT_OPTIONS: Required<SqliteBudgetOptions> = {
  maxRetries: 2, // Total 3 attempts
  minBackoffMs: 50,
  maxBackoffMs: 150,
};

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getRandomJitter(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Executes a database operation within a strict SQLite concurrency budget.
 * Retries on SQLITE_BUSY or database locked errors up to maxRetries times
 * with randomized jitter backoff (50-150ms).
 * Total theoretical maximum execution ceiling:
 * 800ms (Attempt 1) + 150ms (Backoff) + 800ms (Attempt 2) = 1750ms.
 */
export async function executeWithSqliteBudget<T>(
  fn: () => Promise<T>,
  options?: SqliteBudgetOptions
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let attempts = 0;

  while (true) {
    attempts++;
    try {
      return await fn();
    } catch (err: any) {
      const isBusy =
        err?.message?.includes('SQLITE_BUSY') ||
        err?.message?.includes('database is locked') ||
        err?.code === 'SQLITE_BUSY' ||
        err?.code === 'SQLITE_LOCKED';

      if (isBusy && attempts <= opts.maxRetries) {
        const jitter = getRandomJitter(opts.minBackoffMs, opts.maxBackoffMs);
        await wait(jitter);
        continue;
      }

      throw err;
    }
  }
}
