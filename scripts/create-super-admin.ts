import readline from 'node:readline';
import crypto from 'node:crypto';
import { eq } from 'drizzle-orm';
import { getDb } from '../src/server/db/index';
import { adminUsers, adminRoles, activityLogs } from '../src/server/db/schema';
import { hashPassword, validatePasswordStrength } from '../src/server/auth/password';

/**
 * Reads a line from console, hiding characters if TTY is active
 */
function promptHidden(query: string): Promise<string> {
  return new Promise((resolve) => {
    const isTTY = process.stdin.isTTY;

    if (!isTTY) {
      // Non-interactive fallback (e.g. piped input in tests)
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });
      rl.question(query, (answer) => {
        rl.close();
        resolve(answer.trim());
      });
      return;
    }

    const stdin = process.stdin;
    process.stdout.write(query);

    let password = '';
    const onData = (char: Buffer) => {
      const c = char.toString();
      if (c === '\n' || c === '\r' || c === '\u0004') {
        stdin.removeListener('data', onData);
        stdin.setRawMode(false);
        process.stdout.write('\n');
        resolve(password.trim());
      } else if (c === '\u0003') {
        // Ctrl+C
        process.stdout.write('\n');
        process.exit(1);
      } else if (c === '\b' || c === '\x7f') {
        // Backspace
        if (password.length > 0) {
          password = password.slice(0, -1);
        }
      } else {
        password += c;
      }
    };

    stdin.setRawMode(true);
    stdin.resume();
    stdin.on('data', onData);
  });
}

function promptRegular(query: string): Promise<string> {
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

export interface BootstrapInput {
  fullName?: string;
  username?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  customDbPath?: string;
}

/**
 * Core bootstrap logic extracted for testing and CLI execution
 */
export async function createSuperAdmin(providedInput?: BootstrapInput): Promise<{
  success: boolean;
  userId?: string;
  error?: string;
}> {
  const customDbPath = providedInput?.customDbPath || process.env.ALOR_TEST_DB_PATH;
  const { db, client } = getDb(customDbPath);

  // 1. Verify Database readiness and migration status
  try {
    const cols = await client.execute('PRAGMA table_info(admin_users);');
    const colNames = cols.rows.map((r: any) => r.name);
    if (!colNames.includes('failed_login_attempts') || !colNames.includes('locked_until')) {
      return {
        success: false,
        error: 'قاعدة البيانات غير جاهزة أو أن الترحيلات الأمنية لم تطبق بعد.',
      };
    }
  } catch (err: any) {
    return {
      success: false,
      error: `فشل الاتصال بقاعدة البيانات: ${err.message}`,
    };
  }

  // 2. Verify super_admin role exists
  const [superAdminRole] = await db
    .select()
    .from(adminRoles)
    .where(eq(adminRoles.id, 'role_super_admin'))
    .limit(1);

  if (!superAdminRole) {
    return {
      success: false,
      error: 'دور المدير العام (role_super_admin) غير موجود في جدول الأدوار.',
    };
  }

  // 3. Strictly reject if ANY super_admin account already exists
  const existingSuperAdmins = await db
    .select()
    .from(adminUsers)
    .where(eq(adminUsers.role_id, 'role_super_admin'));

  if (existingSuperAdmins.length > 0) {
    return {
      success: false,
      error: 'يوجد بالفعل حساب مدير عام (super_admin) مسجل في النظام. هذا السكريبت مخصص لإنشاء الحساب الأول فقط.',
    };
  }

  // 4. Gather inputs
  let fullName = providedInput?.fullName;
  let username = providedInput?.username;
  let email = providedInput?.email;
  let password = providedInput?.password;
  let confirmPassword = providedInput?.confirmPassword;

  if (!fullName) {
    fullName = await promptRegular('الاسم الكامل (Full Name): ');
  }
  if (!username) {
    username = await promptRegular('اسم المستخدم (Username): ');
  }
  if (!email) {
    email = await promptRegular('البريد الإلكتروني (Email): ');
  }
  if (!password) {
    password = await promptHidden('كلمة المرور (Password - مخفية، 12 حرفاً كحد أدنى): ');
  }
  if (!confirmPassword) {
    confirmPassword = await promptHidden('تأكيد كلمة المرور (Confirm Password): ');
  }

  // 5. Input Validations
  if (!fullName || fullName.length < 2) {
    return { success: false, error: 'الاسم الكامل يجب ألا يقل عن حرفين.' };
  }

  if (!username || username.length < 3 || !/^[a-zA-Z0-9_.-]+$/.test(username)) {
    return {
      success: false,
      error: 'اسم المستخدم يجب أن يتكون من 3 أحرف على الأقل، ويحتوي على أحرف وأرقام ورموز (- _ .) فقط.',
    };
  }

  const normalizedEmail = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalizedEmail)) {
    return { success: false, error: 'صيغة البريد الإلكتروني غير صالحة.' };
  }

  if (password !== confirmPassword) {
    return { success: false, error: 'كلمتا المرور غير متطابقتين.' };
  }

  const strengthCheck = validatePasswordStrength(password);
  if (!strengthCheck.valid) {
    return { success: false, error: strengthCheck.error || 'كلمة المرور ضعيفة.' };
  }

  // 6. Check unique constraints for username and email
  const [existingEmail] = await db
    .select()
    .from(adminUsers)
    .where(eq(adminUsers.email, normalizedEmail))
    .limit(1);

  if (existingEmail) {
    return { success: false, error: 'البريد الإلكتروني مسجل بالفعل لمستخدم آخر.' };
  }

  const [existingUser] = await db
    .select()
    .from(adminUsers)
    .where(eq(adminUsers.username, username.trim()))
    .limit(1);

  if (existingUser) {
    return { success: false, error: 'اسم المستخدم مسجل بالفعل.' };
  }

  // 7. Hash Password with Argon2id
  const passwordHash = await hashPassword(password);
  const userId = crypto.randomUUID();
  const now = Date.now();

  // 8. Atomic database transaction
  await db.transaction(async (tx) => {
    // Re-verify no super_admin exists inside transaction
    const lockedCheck = await tx
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.role_id, 'role_super_admin'));

    if (lockedCheck.length > 0) {
      throw new Error('يوجد بالفعل حساب super_admin مسجل.');
    }

    // Insert user
    await tx.insert(adminUsers).values({
      id: userId,
      role_id: 'role_super_admin',
      username: username!.trim(),
      email: normalizedEmail,
      password_hash: passwordHash,
      full_name: fullName!.trim(),
      is_active: 1,
      failed_login_attempts: 0,
      locked_until: null,
      security_generation: 1,
      login_generation: 1,
      created_at: now,
      updated_at: now,
    });

    // Insert activity log (ABSOLUTELY NO PASSWORD OR HASH STORED)
    await tx.insert(activityLogs).values({
      id: crypto.randomUUID(),
      user_id: userId,
      action: 'CREATE',
      entity_type: 'USER',
      entity_id: userId,
      old_values: null,
      new_values: {
        username: username!.trim(),
        email: normalizedEmail,
        full_name: fullName!.trim(),
        role_id: 'role_super_admin',
        audit_note: 'Initial super_admin bootstrap created via CLI',
      },
      ip_address: '127.0.0.1',
      user_agent: 'CLI/create-super-admin',
      created_at: now,
    });
  });

  return { success: true, userId };
}

// Direct terminal execution
const isDirectRun =
  process.argv[1] &&
  (process.argv[1].endsWith('create-super-admin.ts') ||
    process.argv[1].endsWith('create-super-admin.js'));

if (isDirectRun) {
  if (!process.stdin.isTTY) {
    console.error('\n✗ [ALOR SPA] خطأ أمني: إنشاء حساب المدير العام عبر سطر الأوامر يتطلب طرفية تفاعلية حقيقية (Interactive TTY). يُحظر تمرير البيانات عبر Pipes أو Stdin غير التفاعلي.');
    process.exit(1);
  }

  console.log('\n===============================================================');
  console.log(' ALOR SPA — Secure Bootstrap for Initial Super Administrator');
  console.log('===============================================================\n');

  createSuperAdmin()
    .then((result) => {
      if (result.success) {
        console.log('\n✓ [ALOR SPA] تم إنشاء حساب المدير العام (super_admin) بنجاح.');
        console.log(`  User ID: ${result.userId}`);
        process.exit(0);
      } else {
        console.error(`\n✗ [ALOR SPA] خطأ: ${result.error}`);
        process.exit(1);
      }
    })
    .catch((err) => {
      console.error('\n✗ [ALOR SPA] خطأ غير متوقع:', err.message);
      process.exit(1);
    });
}
