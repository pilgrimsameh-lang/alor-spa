import { getDb } from '../src/server/db';

async function check() {
  const { client } = getDb('data/alor_spa.db');
  const integrity = await client.execute('PRAGMA integrity_check;');
  console.log('Integrity check:', integrity.rows[0]);
  const fk = await client.execute('PRAGMA foreign_key_check;');
  console.log('Foreign key check violations:', fk.rows.length);

  const tables = [
    'admin_roles', 'admin_users', 'admin_sessions', 'service_categories',
    'media_files', 'services', 'offers', 'gallery_items',
    'reviews', 'blog_posts', 'site_settings', 'activity_logs',
    'rate_limit_records', 'rate_limit_reservations',
    'massage_types', 'service_variants', 'packages', 'package_options'
  ];

  for (const t of tables) {
    const res = await client.execute(`SELECT COUNT(*) as count FROM ${t};`);
    console.log(`Table ${t}: ${res.rows[0].count} rows`);
  }
}
check().catch(console.error);
