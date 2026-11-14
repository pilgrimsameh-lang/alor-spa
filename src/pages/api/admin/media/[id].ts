import type { APIRoute } from 'astro';
import { getDb } from '../../../../server/db/index';
import { hasPermission } from '../../../../server/auth/rbac';
import { checkMediaUsage } from '../../../../server/media/dependency-check';
import { mediaUpdateSchema } from '../../../../server/validation/crud-schemas';
import { getStorageAdapter } from '../../../../server/storage/adapter';
import { recordActivityLog } from '../../../../server/audit/log-activity';

export const prerender = false;

// GET: Single media details and references
export const GET: APIRoute = async ({ params, locals }) => {
  const user = locals.user;
  if (!user || !hasPermission(user, 'media:read')) {
    return new Response(JSON.stringify({ success: false, error: 'غير مصرح لك باستعراض بيانات الوسائط' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const id = params.id;
  if (!id) {
    return new Response(JSON.stringify({ success: false, error: 'معرف الوسائط مطلوب' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { client } = getDb();
  const res = await client.execute({
    sql: `SELECT m.*, u.full_name as uploader_name
          FROM media_files m
          LEFT JOIN admin_users u ON m.uploaded_by = u.id
          WHERE m.id = ?;`,
    args: [id],
  });

  if (res.rows.length === 0) {
    return new Response(JSON.stringify({ success: false, error: 'ملف الوسائط غير موجود' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const media = res.rows[0];
  const usage = await checkMediaUsage(client, id);

  return new Response(
    JSON.stringify({
      success: true,
      data: {
        ...media,
        usage,
      },
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  );
};

// PATCH: Update metadata (Alt text, title)
export const PATCH: APIRoute = async ({ params, request, locals }) => {
  const user = locals.user;
  if (!user || !hasPermission(user, 'media:write')) {
    return new Response(JSON.stringify({ success: false, error: 'ليس لديك صلاحية تعديل بيانات الوسائط' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const id = params.id;
  if (!id) {
    return new Response(JSON.stringify({ success: false, error: 'معرف الوسائط مطلوب' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { client } = getDb();
  const existingRes = await client.execute({
    sql: 'SELECT * FROM media_files WHERE id = ?;',
    args: [id],
  });

  if (existingRes.rows.length === 0) {
    return new Response(JSON.stringify({ success: false, error: 'ملف الوسائط غير موجود' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const oldValues = existingRes.rows[0];

  try {
    const rawBody = await request.json();
    const parsed = mediaUpdateSchema.parse(rawBody);
    const now = Date.now();

    await client.execute({
      sql: `UPDATE media_files SET
        alt_ar = ?,
        alt_en = ?,
        title_ar = ?,
        title_en = ?,
        updated_at = ?
      WHERE id = ?;`,
      args: [
        parsed.alt_ar,
        parsed.alt_en,
        parsed.title_ar ?? null,
        parsed.title_en ?? null,
        now,
        id,
      ],
    });

    await recordActivityLog(client, {
      userId: user.id,
      action: 'UPDATE',
      entityType: 'MEDIA',
      entityId: id,
      oldValues: {
        alt_ar: oldValues.alt_ar,
        alt_en: oldValues.alt_en,
        title_ar: oldValues.title_ar,
        title_en: oldValues.title_en,
      },
      newValues: parsed,
      ipAddress: request.headers.get('x-forwarded-for') || null,
      userAgent: request.headers.get('user-agent') || null,
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'تم تحديث بيانات الصورة بنجاح.',
        data: {
          id,
          ...parsed,
          updated_at: now,
        },
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        success: false,
        error: err.errors ? err.errors.map((e: any) => e.message).join('، ') : err.message,
      }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};

// DELETE: Safe deletion checking referential integrity
export const DELETE: APIRoute = async ({ params, request, locals }) => {
  const user = locals.user;
  if (!user || !hasPermission(user, 'media:write')) {
    return new Response(JSON.stringify({ success: false, error: 'ليس لديك صلاحية حذف ملفات الوسائط' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const id = params.id;
  if (!id) {
    return new Response(JSON.stringify({ success: false, error: 'معرف الوسائط مطلوب' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { client } = getDb();
  const existingRes = await client.execute({
    sql: 'SELECT * FROM media_files WHERE id = ?;',
    args: [id],
  });

  if (existingRes.rows.length === 0) {
    return new Response(JSON.stringify({ success: false, error: 'ملف الوسائط غير موجود' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const mediaRow = existingRes.rows[0];

  // 1. Strict dependency check
  const usage = await checkMediaUsage(client, id);
  if (usage.isInUse) {
    return new Response(
      JSON.stringify({
        success: false,
        error: usage.summaryMessageAr,
        errorEn: usage.summaryMessageEn,
        references: usage.references,
      }),
      {
        status: 409, // Conflict
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // 2. Delete file from storage adapter (if local file in uploads)
  const storage = getStorageAdapter();
  const storagePath = String(mediaRow.storage_path);
  // Only delete files under uploads/ directory to guarantee initial static assets (like images/services/*) are never touched
  if (storagePath.startsWith('uploads/')) {
    try {
      await storage.delete(storagePath);
    } catch (storageErr) {
      console.error('[MediaDelete] Could not delete physical file:', storageErr);
    }
  }

  // 3. Delete database record
  await client.execute({
    sql: 'DELETE FROM media_files WHERE id = ?;',
    args: [id],
  });

  // 4. Record audit log
  await recordActivityLog(client, {
    userId: user.id,
    action: 'DELETE',
    entityType: 'MEDIA',
    entityId: id,
    oldValues: {
      filename: mediaRow.filename,
      original_name: mediaRow.original_name,
      storage_path: mediaRow.storage_path,
      public_url: mediaRow.public_url,
    },
    ipAddress: request.headers.get('x-forwarded-for') || null,
    userAgent: request.headers.get('user-agent') || null,
  });

  return new Response(
    JSON.stringify({
      success: true,
      message: 'تم حذف ملف الصورة بنجاح.',
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  );
};
