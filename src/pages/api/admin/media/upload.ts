import type { APIRoute } from 'astro';
import crypto from 'node:crypto';
import { getDb } from '../../../../server/db/index';
import { hasPermission } from '../../../../server/auth/rbac';
import { processAndOptimizeImage, MediaValidationError } from '../../../../server/media/processor';
import { getStorageAdapter } from '../../../../server/storage/adapter';
import { recordActivityLog } from '../../../../server/audit/log-activity';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  const user = locals.user;
  if (!user || !hasPermission(user, 'media:write')) {
    return new Response(
      JSON.stringify({ success: false, error: 'ليس لديك صلاحية لرفع الصور والوسائط' }),
      {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // Enforce multipart/form-data
  const contentType = request.headers.get('content-type') || '';
  if (!contentType.includes('multipart/form-data')) {
    return new Response(
      JSON.stringify({ success: false, error: 'نوع المحتوى يجب أن يكون multipart/form-data' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  let savedStoragePath: string | null = null;
  const storage = getStorageAdapter();

  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || typeof file === 'string' || !(file instanceof File) || file.size === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'يرجى اختيار ملف صورة صالح للرفع.' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const altAr = (formData.get('alt_ar') as string | null)?.trim() || '';
    const altEn = (formData.get('alt_en') as string | null)?.trim() || '';
    const titleAr = (formData.get('title_ar') as string | null)?.trim() || null;
    const titleEn = (formData.get('title_en') as string | null)?.trim() || null;

    // Convert File to Node Buffer
    const arrayBuffer = await file.arrayBuffer();
    const inputBuffer = Buffer.from(arrayBuffer);

    // Process, validate magic bytes, strip metadata, optimize to WebP
    const processed = await processAndOptimizeImage(inputBuffer, file.name);

    // Save to pluggable storage adapter
    const saved = await storage.save(processed.filename, processed.buffer, processed.mimeType);
    savedStoragePath = saved.storagePath;

    // Insert into SQLite database
    const { client } = getDb();
    const id = crypto.randomUUID();
    const now = Date.now();

    await client.execute({
      sql: `INSERT INTO media_files (
        id, filename, original_name, mime_type, file_size, width, height,
        storage_path, public_url, alt_ar, alt_en, title_ar, title_en,
        uploaded_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      args: [
        id,
        processed.filename,
        processed.originalName,
        processed.mimeType,
        processed.fileSize,
        processed.width,
        processed.height,
        saved.storagePath,
        saved.publicUrl,
        altAr,
        altEn,
        titleAr,
        titleEn,
        user.id,
        now,
        now,
      ],
    });

    // Record activity log
    await recordActivityLog(client, {
      userId: user.id,
      action: 'CREATE',
      entityType: 'MEDIA',
      entityId: id,
      newValues: {
        filename: processed.filename,
        original_name: processed.originalName,
        mime_type: processed.mimeType,
        file_size: processed.fileSize,
        width: processed.width,
        height: processed.height,
        public_url: saved.publicUrl,
      },
      ipAddress: request.headers.get('x-forwarded-for') || null,
      userAgent: request.headers.get('user-agent') || null,
    });

    const newMedia = {
      id,
      filename: processed.filename,
      original_name: processed.originalName,
      mime_type: processed.mimeType,
      file_size: processed.fileSize,
      width: processed.width,
      height: processed.height,
      storage_path: saved.storagePath,
      public_url: saved.publicUrl,
      alt_ar: altAr,
      alt_en: altEn,
      title_ar: titleAr,
      title_en: titleEn,
      uploaded_by: user.id,
      created_at: now,
      updated_at: now,
    };

    return new Response(
      JSON.stringify({
        success: true,
        message: 'تم رفع ومعالجة الصورة بنجاح.',
        data: newMedia,
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (err: any) {
    // If storage file was written before error occurred, clean it up to prevent orphan files
    if (savedStoragePath) {
      try {
        await storage.delete(savedStoragePath);
      } catch (cleanupErr) {
        console.error('[Upload] Failed to clean up file after failure:', cleanupErr);
      }
    }

    if (err instanceof MediaValidationError) {
      return new Response(JSON.stringify({ success: false, error: err.message }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.error('[Upload] Unexpected error:', err);
    return new Response(
      JSON.stringify({
        success: false,
        error: err.message || 'حدث خطأ غير متوقع أثناء رفع الصورة.',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
