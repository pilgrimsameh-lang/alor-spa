import { createClient } from '@libsql/client';
import path from 'node:path';

async function main() {
  const dbPath = path.resolve('data/alor_spa.db');
  const client = createClient({ url: `file:${dbPath}` });
  const res = await client.execute('SELECT * FROM admin_users;');
  console.log('admin_users count:', res.rows.length);
  for (const row of res.rows) {
    console.log('User:', row.id, row.username, row.email);
  }
}

main().catch(console.error);
