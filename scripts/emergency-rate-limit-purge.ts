import readline from 'node:readline';
import { getDb } from '../src/server/db/index';
import { getServerConfig } from '../src/server/config';
import { computeHmacKey } from '../src/server/auth/rate-limit';
import { safeParseIp } from '../src/server/auth/ip';

/**
 * ============================================================================
 * ALOR SPA — Interactive Emergency Rate Limit Purge Script
 * Safely unblocks an administrator IP by resetting failures and advancing generation
 * Requires an Interactive TTY to prevent unauthorized batch execution
 * ============================================================================
 */

function prompt(query: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(query, (ans) => {
      rl.close();
      resolve(ans.trim());
    });
  });
}

export async function emergencyRateLimitPurge(
  customDbPath?: string,
  inputIp?: string,
  customSecret?: string
): Promise<{ success: boolean; message: string }> {
  const isDirectRun = process.argv[1] && (
    process.argv[1].endsWith('emergency-rate-limit-purge.ts') ||
    process.argv[1].endsWith('emergency-rate-limit-purge.js')
  );

  if (isDirectRun && !process.stdin.isTTY) {
    throw new Error('تشغيل سكريبت فك الحظر يتطلب طرفية تفاعلية حقيقية (Interactive TTY).');
  }

  const { client } = getDb(customDbPath);
  const config = getServerConfig();

  let ip = inputIp;
  if (!ip) {
    console.log('\n===============================================================');
    console.log(' ALOR SPA — أداة الطوارئ لفك حظر عنوان IP المحظور');
    console.log('===============================================================\n');

    ip = await prompt('أدخل عنوان IP المراد فك حظره (مثال: 192.168.1.50): ');
  }

  const parsed = safeParseIp(ip);
  if (!parsed) {
    return { success: false, message: 'عنوان IP غير صالح.' };
  }

  const normalizedIp = parsed.toString();

  if (!inputIp) {
    const confirm = await prompt(`هل أنت متأكد من فك حظر العنوان (${normalizedIp})؟ (اكتب YES للتأكيد): `);
    if (confirm !== 'YES') {
      return { success: false, message: 'تم إلغاء العملية.' };
    }
  }

  const now = Date.now();
  const secret = customSecret || config.RATE_LIMIT_SECRET || config.SESSION_SECRET;
  const version = config.RATE_LIMIT_KEY_VERSION || 1;
  const ipKey = computeHmacKey(normalizedIp, secret, version);

  // Check if record exists
  const res = await client.execute({
    sql: `SELECT * FROM rate_limit_records WHERE key = ?;`,
    args: [ipKey],
  });

  const record = res.rows[0];
  if (!record) {
    return { success: false, message: `لم يتم العثور على أي سجل محاولات للعنوان ${normalizedIp}.` };
  }

  // Atomically reset failures and advance generation without deleting active leases
  await client.execute({
    sql: `UPDATE rate_limit_records
          SET failures = 0,
              first_failure_at = NULL,
              blocked_until = NULL,
              generation = generation + 1,
              updated_at = ?
          WHERE key = ?;`,
    args: [now, ipKey],
  });

  return {
    success: true,
    message: `تم فك الحظر وتصفير العداد للعنوان ${normalizedIp} بنجاح، ورُفع الجيل إلى ${Number(record.generation) + 1}.`,
  };
}

const isDirectRun = process.argv[1] && (
  process.argv[1].endsWith('emergency-rate-limit-purge.ts') ||
  process.argv[1].endsWith('emergency-rate-limit-purge.js')
);

if (isDirectRun) {
  emergencyRateLimitPurge()
    .then((res) => {
      if (res.success) {
        console.log(`\n✓ ${res.message}\n`);
        process.exit(0);
      } else {
        console.error(`\n✗ ${res.message}\n`);
        process.exit(1);
      }
    })
    .catch((err) => {
      console.error(`\n✗ خطأ غير متوقع: ${err.message}\n`);
      process.exit(1);
    });
}
