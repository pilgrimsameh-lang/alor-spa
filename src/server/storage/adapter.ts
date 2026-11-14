import fs from 'node:fs';
import path from 'node:path';
import type { R2Bucket } from '@cloudflare/workers-types';

/**
 * ============================================================================
 * ALOR SPA — Pluggable Storage Adapter Architecture
 * Decouples media storage from local filesystem or Cloudflare R2
 * ============================================================================
 */

export interface StorageSaveResult {
  storagePath: string;
  publicUrl: string;
}

export interface StorageAdapter {
  save(filename: string, buffer: Buffer | Uint8Array, mimeType: string): Promise<StorageSaveResult>;
  delete(storagePath: string): Promise<boolean>;
  exists(storagePath: string): Promise<boolean>;
  getUrl(storagePath: string): string;
}

/**
 * Local File System Storage Adapter
 * Stores uploaded assets safely inside public/uploads/media/
 * Used in local development environments.
 */
export class LocalStorageAdapter implements StorageAdapter {
  private readonly uploadDir: string;
  private readonly publicBaseUrl: string;

  constructor(customUploadDir?: string, publicBaseUrl = '/uploads/media') {
    this.uploadDir = customUploadDir
      ? path.resolve(customUploadDir)
      : path.resolve(process.cwd ? process.cwd() : '.', 'public', 'uploads', 'media');
    this.publicBaseUrl = publicBaseUrl.replace(/\/+$/, '');
  }

  private resolveSafePath(filenameOrPath: string): string {
    const sanitized = path.basename(filenameOrPath);
    const resolved = path.resolve(this.uploadDir, sanitized);
    if (!resolved.startsWith(this.uploadDir)) {
      throw new Error('محاولة وصول غير مصرح بها إلى مسارات النظام (Path Traversal Detected).');
    }
    return resolved;
  }

  private async ensureDir(): Promise<void> {
    if (typeof fs?.existsSync === 'function' && !fs.existsSync(this.uploadDir)) {
      await fs.promises.mkdir(this.uploadDir, { recursive: true });
    }
  }

  async save(filename: string, buffer: Buffer | Uint8Array, _mimeType: string): Promise<StorageSaveResult> {
    await this.ensureDir();
    const safeFilename = path.basename(filename);
    const targetPath = this.resolveSafePath(safeFilename);

    if (typeof fs?.existsSync === 'function' && fs.existsSync(targetPath)) {
      throw new Error(`الملف باسم (${safeFilename}) موجود بالفعل، يرجى اختيار اسم فريد.`);
    }

    if (fs?.promises?.writeFile) {
      await fs.promises.writeFile(targetPath, buffer);
    }

    const relativeStoragePath = path.posix ? path.posix.join('uploads', 'media', safeFilename) : `uploads/media/${safeFilename}`;
    const publicUrl = `${this.publicBaseUrl}/${safeFilename}`;

    return {
      storagePath: relativeStoragePath,
      publicUrl,
    };
  }

  async delete(storagePath: string): Promise<boolean> {
    try {
      const filename = path.basename(storagePath);
      const targetPath = this.resolveSafePath(filename);

      if (typeof fs?.existsSync === 'function' && fs.existsSync(targetPath)) {
        await fs.promises.unlink(targetPath);
        return true;
      }
      return false;
    } catch (err) {
      console.error('[LocalStorageAdapter] Failed to delete file:', err);
      return false;
    }
  }

  async exists(storagePath: string): Promise<boolean> {
    try {
      const filename = path.basename(storagePath);
      const targetPath = this.resolveSafePath(filename);
      if (fs?.promises?.access) {
        await fs.promises.access(targetPath, fs.constants?.F_OK ?? 0);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  getUrl(storagePath: string): string {
    const filename = path.basename(storagePath);
    return `${this.publicBaseUrl}/${filename}`;
  }
}

/**
 * Cloudflare R2 Storage Adapter
 * Persists uploaded assets directly into a Cloudflare R2 bucket.
 */
export class CloudflareR2StorageAdapter implements StorageAdapter {
  private readonly bucket: R2Bucket;
  private readonly publicBaseUrl: string;

  constructor(bucket: R2Bucket, publicBaseUrl = '/uploads/media') {
    this.bucket = bucket;
    this.publicBaseUrl = publicBaseUrl.replace(/\/+$/, '');
  }

  async save(filename: string, buffer: Buffer | Uint8Array, mimeType: string): Promise<StorageSaveResult> {
    const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `uploads/media/${safeFilename}`;

    await this.bucket.put(storagePath, buffer, {
      httpMetadata: {
        contentType: mimeType,
      },
    });

    const publicUrl = `${this.publicBaseUrl}/${safeFilename}`;
    return {
      storagePath,
      publicUrl,
    };
  }

  async delete(storagePath: string): Promise<boolean> {
    try {
      await this.bucket.delete(storagePath);
      return true;
    } catch (err) {
      console.error('[CloudflareR2StorageAdapter] Failed to delete file:', err);
      return false;
    }
  }

  async exists(storagePath: string): Promise<boolean> {
    try {
      const obj = await this.bucket.head(storagePath);
      return obj !== null;
    } catch {
      return false;
    }
  }

  getUrl(storagePath: string): string {
    const filename = storagePath.split('/').pop() || storagePath;
    return `${this.publicBaseUrl}/${filename}`;
  }
}

let defaultAdapter: StorageAdapter | null = null;

export function getStorageAdapter(r2Bucket?: R2Bucket | null, customDir?: string): StorageAdapter {
  if (r2Bucket) {
    return new CloudflareR2StorageAdapter(r2Bucket);
  }
  if (customDir) {
    return new LocalStorageAdapter(customDir);
  }
  if (!defaultAdapter) {
    defaultAdapter = new LocalStorageAdapter();
  }
  return defaultAdapter;
}
