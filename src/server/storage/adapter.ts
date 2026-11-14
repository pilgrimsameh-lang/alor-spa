import fs from 'node:fs';
import path from 'node:path';

/**
 * ============================================================================
 * ALOR SPA — Pluggable Storage Adapter Architecture
 * Decouples media storage from local filesystem or future cloud providers (S3/R2)
 * ============================================================================
 */

export interface StorageSaveResult {
  storagePath: string;
  publicUrl: string;
}

export interface StorageAdapter {
  save(filename: string, buffer: Buffer, mimeType: string): Promise<StorageSaveResult>;
  delete(storagePath: string): Promise<boolean>;
  exists(storagePath: string): Promise<boolean>;
  getUrl(storagePath: string): string;
}

/**
 * Local File System Storage Adapter
 * Stores uploaded assets safely inside public/uploads/media/
 * Survives server restarts and enforces strict path-traversal prevention
 */
export class LocalStorageAdapter implements StorageAdapter {
  private readonly uploadDir: string;
  private readonly publicBaseUrl: string;

  constructor(customUploadDir?: string, publicBaseUrl = '/uploads/media') {
    this.uploadDir = customUploadDir
      ? path.resolve(customUploadDir)
      : path.resolve(process.cwd(), 'public', 'uploads', 'media');
    this.publicBaseUrl = publicBaseUrl.replace(/\/+$/, '');
  }

  /**
   * Resolves a sanitized file path ensuring it does not escape the upload directory.
   * Throws an error on path traversal attempts.
   */
  private resolveSafePath(filenameOrPath: string): string {
    const sanitized = path.basename(filenameOrPath);
    const resolved = path.resolve(this.uploadDir, sanitized);
    if (!resolved.startsWith(this.uploadDir)) {
      throw new Error('محاولة وصول غير مصرح بها إلى مسارات النظام (Path Traversal Detected).');
    }
    return resolved;
  }

  /**
   * Ensures the storage destination directory exists.
   */
  private async ensureDir(): Promise<void> {
    if (!fs.existsSync(this.uploadDir)) {
      await fs.promises.mkdir(this.uploadDir, { recursive: true });
    }
  }

  /**
   * Persists a file buffer safely to disk.
   */
  async save(filename: string, buffer: Buffer, _mimeType: string): Promise<StorageSaveResult> {
    await this.ensureDir();
    const safeFilename = path.basename(filename);
    const targetPath = this.resolveSafePath(safeFilename);

    if (fs.existsSync(targetPath)) {
      throw new Error(`الملف باسم (${safeFilename}) موجود بالفعل، يرجى اختيار اسم فريد.`);
    }

    await fs.promises.writeFile(targetPath, buffer);

    const relativeStoragePath = path.posix.join('uploads', 'media', safeFilename);
    const publicUrl = `${this.publicBaseUrl}/${safeFilename}`;

    return {
      storagePath: relativeStoragePath,
      publicUrl,
    };
  }

  /**
   * Deletes a file from storage.
   */
  async delete(storagePath: string): Promise<boolean> {
    try {
      const filename = path.basename(storagePath);
      const targetPath = this.resolveSafePath(filename);

      if (fs.existsSync(targetPath)) {
        await fs.promises.unlink(targetPath);
        return true;
      }
      return false;
    } catch (err) {
      console.error('[LocalStorageAdapter] Failed to delete file:', err);
      return false;
    }
  }

  /**
   * Checks whether a file exists in storage.
   */
  async exists(storagePath: string): Promise<boolean> {
    try {
      const filename = path.basename(storagePath);
      const targetPath = this.resolveSafePath(filename);
      await fs.promises.access(targetPath, fs.constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Returns the public URL for a stored file.
   */
  getUrl(storagePath: string): string {
    const filename = path.basename(storagePath);
    return `${this.publicBaseUrl}/${filename}`;
  }
}

// Global cached singleton instance
let defaultAdapter: StorageAdapter | null = null;

export function getStorageAdapter(customDir?: string): StorageAdapter {
  if (customDir) {
    return new LocalStorageAdapter(customDir);
  }
  if (!defaultAdapter) {
    defaultAdapter = new LocalStorageAdapter();
  }
  return defaultAdapter;
}
