import crypto from 'node:crypto';
import path from 'node:path';
import sharp from 'sharp';

/**
 * ============================================================================
 * ALOR SPA — Secure Image Processing & Validation Engine
 * Validates magic numbers, strips metadata, enforces size bounds, and optimizes to WebP
 * ============================================================================
 */

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

export const ALLOWED_SHARP_FORMATS = ['jpeg', 'png', 'webp'] as const;

export interface ProcessedImageResult {
  buffer: Buffer;
  filename: string;
  originalName: string;
  mimeType: 'image/webp';
  fileSize: number;
  width: number;
  height: number;
}

export class MediaValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MediaValidationError';
  }
}

/**
 * Sanitizes original filename to prevent XSS or display breakages.
 */
export function sanitizeOriginalFilename(rawName: string): string {
  const base = path.basename(rawName).trim();
  // Keep letters, digits, Arabic chars, dots, hyphens, underscores, spaces
  const cleaned = base.replace(/[^\w\s.\u0600-\u06FF-]/gi, '_');
  return cleaned.slice(0, 150) || 'unnamed_image';
}

/**
 * Generates an unguessable, collision-free filename with webp extension.
 */
export function generateSafeFilename(ext = 'webp'): string {
  const uuid = crypto.randomUUID().replace(/-/g, '');
  const timestamp = Date.now();
  return `alor_${timestamp}_${uuid}.${ext}`;
}

/**
 * Validates raw file buffer for size, real binary signature (magic bytes), and format.
 * Throws MediaValidationError if invalid or dangerous.
 */
export async function validateImageBuffer(buffer: Buffer): Promise<sharp.Metadata> {
  if (!buffer || buffer.length === 0) {
    throw new MediaValidationError('الملف المرسل فارغ.');
  }

  if (buffer.length > MAX_FILE_SIZE_BYTES) {
    const sizeMb = (buffer.length / (1024 * 1024)).toFixed(1);
    throw new MediaValidationError(`حجم الملف (${sizeMb} MB) يتجاوز الحد الأقصى المسموح به (10 ميجابايت).`);
  }

  // Inspect binary structure through Sharp's libvips decoder
  let metadata: sharp.Metadata;
  try {
    metadata = await sharp(buffer).metadata();
  } catch (_err) {
    throw new MediaValidationError('الملف المرفوع تالف أو ليس صورة صالحة (فشل في قراءة ترويسة الصورة).');
  }

  if (!metadata.format || !(ALLOWED_SHARP_FORMATS as readonly string[]).includes(metadata.format)) {
    throw new MediaValidationError(
      `صيغة الصورة (${metadata.format || 'غير معروفة'}) غير مدعومة. الصيغ المسموحة هي: JPG, JPEG, PNG, WebP فقط.`
    );
  }

  if (!metadata.width || !metadata.height || metadata.width <= 0 || metadata.height <= 0) {
    throw new MediaValidationError('أبعاد الصورة غير صالحة.');
  }

  // Limit extreme pixel dimensions to prevent decompression bombs (e.g. 8000x8000 max)
  if (metadata.width > 8192 || metadata.height > 8192) {
    throw new MediaValidationError('أبعاد الصورة تفوق الحد الأقصى المسموح به (8192×8192 بكسل).');
  }

  return metadata;
}

/**
 * Processes, optimizes, and strips sensitive EXIF/GPS metadata from an image buffer.
 * Re-encodes cleanly to modern WebP format with preserved aspect ratio.
 */
export async function processAndOptimizeImage(
  buffer: Buffer,
  rawOriginalName: string
): Promise<ProcessedImageResult> {
  // 1. Strict validation
  await validateImageBuffer(buffer);

  // 2. Process image with Sharp
  // - .rotate(): auto-rotates based on EXIF orientation if present
  // - Note: not calling .withMetadata() strips all EXIF tags, GPS coordinates, camera serials
  // - .webp(): encodes to clean, optimized WebP format
  const pipeline = sharp(buffer)
    .rotate() // Auto-orient then strip metadata
    .webp({
      quality: 85,
      effort: 4,
      lossless: false,
    });

  const optimizedBuffer = await pipeline.toBuffer();

  // 3. Inspect final dimensions
  const finalMeta = await sharp(optimizedBuffer).metadata();

  const originalName = sanitizeOriginalFilename(rawOriginalName);
  const filename = generateSafeFilename('webp');

  return {
    buffer: optimizedBuffer,
    filename,
    originalName,
    mimeType: 'image/webp',
    fileSize: optimizedBuffer.length,
    width: finalMeta.width ?? 0,
    height: finalMeta.height ?? 0,
  };
}
