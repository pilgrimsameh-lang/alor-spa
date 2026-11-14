import { getDb } from '../src/server/db';

async function main() {
  const { client } = getDb('data/alor_spa.db');
  console.log('=== SERVICE CATEGORIES ===');
  const cats = await client.execute('SELECT * FROM service_categories;');
  console.log(cats.rows);

  console.log('\n=== SERVICES ===');
  const srvs = await client.execute('SELECT id, slug, category_id, title_ar, title_en, price_amount_halalas, price_is_confirmed, duration_minutes, featured_image_id, is_published, display_order FROM services;');
  console.log(srvs.rows);

  console.log('\n=== MEDIA FILES ===');
  const media = await client.execute('SELECT id, filename, original_name, public_url, alt_ar, alt_en FROM media_files;');
  console.log(media.rows);

  console.log('\n=== SITE SETTINGS ===');
  const settings = await client.execute('SELECT * FROM site_settings;');
  console.log(settings.rows);
}

main().catch(console.error);
