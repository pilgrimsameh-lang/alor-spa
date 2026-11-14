import { createClient } from '@libsql/client';

async function check() {
  const c = createClient({ url: 'file:data/alor_spa.db' });
  const res = await c.execute('SELECT * FROM __drizzle_migrations;');
  console.log('Applied migrations:', res.rows);
}

check().catch(console.error);
