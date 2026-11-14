import { getDb } from '../src/server/db/index';
import { hashPassword } from '../src/server/auth/password';
import crypto from 'node:crypto';

async function main() {
  const { client } = getDb();
  const res = await client.execute("SELECT COUNT(*) as count FROM admin_users;");
  if (Number(res.rows[0]?.count ?? 0) === 0) {
    const id = crypto.randomUUID();
    const hash = await hashPassword('AlorSpa2026!');
    const now = Date.now();
    await client.execute({
      sql: `INSERT INTO admin_users (
        id, role_id, username, email, password_hash, full_name, is_active,
        failed_login_attempts, locked_until, last_login_at, security_generation, login_generation,
        created_at, updated_at
      ) VALUES (?, 'role_super_admin', 'admin', 'admin@alorspa.com', ?, 'إدارة ALOR SPA', 1, 0, NULL, NULL, 1, 1, ?, ?);`,
      args: [id, hash, now, now],
    });
    console.log('✓ Admin user created successfully: username=admin, password=AlorSpa2026!');
  } else {
    const userRes = await client.execute("SELECT username, email FROM admin_users LIMIT 1;");
    console.log('Admin user exists:', userRes.rows[0]);
  }
}

main().catch(console.error);
