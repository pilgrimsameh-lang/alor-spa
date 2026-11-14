import { getDb } from '../src/server/db/index';
import { hashPassword } from '../src/server/auth/password';
import crypto from 'node:crypto';

async function testAdminFlow() {
  console.log('=== Starting ALOR SPA Admin E2E Verification ===\n');

  // 1. Ensure a Super Admin exists in the database
  const { client } = getDb();
  const runTimestamp = Date.now();
  const testUsername = `e2e_superadmin_${runTimestamp}`;
  const testEmail = `e2e_${runTimestamp}@test.local`;
  const testPassword = 'AuditSecurePassword2026!';
  const now = Date.now();

  const adminId = crypto.randomUUID();
  const passwordHash = await hashPassword(testPassword);
  await client.execute({
    sql: `INSERT INTO admin_users (id, role_id, username, email, password_hash, full_name, is_active, created_at, updated_at)
          VALUES (?, 'role_super_admin', ?, ?, ?, 'مدقق النظام', 1, ?, ?);`,
    args: [adminId, testUsername, testEmail, passwordHash, now, now],
  });
  console.log(`✓ Created isolated test admin user: ${testUsername}`);

  // 2. Perform Login via API
  console.log('\n--- 1. Testing Login API ---');
  const loginRes = await fetch('http://localhost:4321/api/admin/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Origin': 'http://localhost:4321',
      'Host': 'localhost:4321',
    },
    body: JSON.stringify({
      username: testUsername,
      password: testPassword,
    }),
  });

  const loginJson = await loginRes.json();
  console.log(`Login response status: ${loginRes.status}`, loginJson);

  if (!loginJson.success) {
    throw new Error(`Login failed: ${loginJson.error}`);
  }

  // Extract session cookie from Set-Cookie header
  const rawSetCookie = loginRes.headers.get('set-cookie');
  if (!rawSetCookie) {
    throw new Error('No Set-Cookie header returned on successful login!');
  }

  const sessionCookieMatch = rawSetCookie.match(/alor_admin_session=([^;]+)/);
  if (!sessionCookieMatch) {
    throw new Error(`Session cookie not found in Set-Cookie: ${rawSetCookie}`);
  }

  const sessionToken = sessionCookieMatch[1];
  const cookieHeader = `alor_admin_session=${sessionToken}`;
  console.log(`✓ Successfully extracted session cookie`);

  // 3. Test Accessing Every Admin Page
  console.log('\n--- 2. Testing Authenticated Access to All 12 Admin Pages ---');
  const adminPages = [
    '/admin',
    '/admin/services',
    '/admin/categories',
    '/admin/offers',
    '/admin/gallery',
    '/admin/reviews',
    '/admin/blog',
    '/admin/media',
    '/admin/settings',
    '/admin/users',
    '/admin/roles',
    '/admin/activity-logs',
  ];

  for (const page of adminPages) {
    const res = await fetch(`http://localhost:4321${page}`, {
      headers: {
        'Cookie': cookieHeader,
        'Host': 'localhost:4321',
      },
    });

    const text = await res.text();
    if (res.status !== 200) {
      console.error(`✗ Page ${page} returned status ${res.status}`);
      throw new Error(`Page ${page} failed with status ${res.status}`);
    }

    if (text.includes('غير مصرح') || text.includes('Access Denied')) {
      console.error(`✗ Page ${page} denied access to Super Admin!`);
      throw new Error(`Page ${page} denied access`);
    }

    // Verify key elements exist
    if (!text.includes('admin-sidebar') && !text.includes('AdminSidebar')) {
      console.warn(`! Page ${page} might be missing sidebar`);
    }

    console.log(`✓ ${page} loaded successfully (HTTP 200, length: ${text.length})`);
  }

  // 4. Test English version of Admin Dashboard
  console.log('\n--- 3. Testing English Admin Dashboard ---');
  const enAdminRes = await fetch('http://localhost:4321/admin?lang=en', {
    headers: {
      'Cookie': `${cookieHeader}; alor_admin_lang=en`,
      'Host': 'localhost:4321',
    },
  });
  const enText = await enAdminRes.text();
  if (enAdminRes.status !== 200) {
    throw new Error(`English Admin failed with status ${enAdminRes.status}`);
  }
  if (!enText.includes('dir="ltr"') || !enText.includes('lang="en"')) {
    console.error(`✗ English Admin missing dir="ltr" or lang="en"`);
  } else {
    console.log('✓ English Admin successfully loaded with dir="ltr" and lang="en"');
  }

  // 5. Test CRUD API: Categories
  console.log('\n--- 4. Testing CRUD API Operations ---');
  const testCatSlug = `test-cat-${Date.now()}`;
  const createCatRes = await fetch('http://localhost:4321/api/admin/categories', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookieHeader,
      'Origin': 'http://localhost:4321',
      'Host': 'localhost:4321',
      'X-Alor-Admin-Action': '1',
    },
    body: JSON.stringify({
      slug: testCatSlug,
      title_ar: 'تصنيف اختباري',
      title_en: 'Test Category',
      display_order: 99,
      is_active: 1,
    }),
  });
  const createCatJson = await createCatRes.json();
  console.log('Create Category result:', createCatJson);
  if (!createCatJson.success) {
    throw new Error(`Category creation failed: ${createCatJson.error}`);
  }

  const catId = createCatJson.data?.id || createCatJson.id || testCatSlug;

  // Delete Category
  const delCatRes = await fetch(`http://localhost:4321/api/admin/categories/${catId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookieHeader,
      'Origin': 'http://localhost:4321',
      'Host': 'localhost:4321',
      'X-Alor-Admin-Action': '1',
    },
  });
  const delCatJson = await delCatRes.json();
  console.log('Delete Category result:', delCatJson);
  if (!delCatJson.success) {
    throw new Error(`Category deletion failed: ${delCatJson.error}`);
  }

  // 6. Test Logout API
  console.log('\n--- 5. Testing Logout API ---');
  const logoutRes = await fetch('http://localhost:4321/api/admin/auth/logout', {
    method: 'POST',
    headers: {
      'Cookie': cookieHeader,
      'Origin': 'http://localhost:4321',
      'Host': 'localhost:4321',
    },
  });
  const logoutJson = await logoutRes.json();
  console.log('Logout result:', logoutJson);
  if (!logoutJson.success) {
    throw new Error(`Logout failed: ${logoutJson.error}`);
  }

  // Verify session cookie is no longer valid
  const postLogoutRes = await fetch('http://localhost:4321/admin', {
    headers: {
      'Cookie': cookieHeader,
      'Host': 'localhost:4321',
    },
    redirect: 'manual',
  });
  console.log(`Post-logout access status: ${postLogoutRes.status} (expected 302 redirect)`);
  if (postLogoutRes.status !== 302 && postLogoutRes.status !== 401) {
    throw new Error(`Post-logout access was not redirected! Got status ${postLogoutRes.status}`);
  }
  console.log('✓ Session revoked successfully after logout');

  // 6. Cleanup test admin user from database
  await client.execute({
    sql: 'DELETE FROM admin_users WHERE id = ?;',
    args: [adminId],
  });
  console.log(`✓ Cleaned up test admin user: ${testUsername}`);

  console.log('\n=== All Admin E2E Tests Passed Successfully! ===\n');
}

testAdminFlow().catch((err) => {
  console.error('\n✗ Test failed with error:', err);
  process.exit(1);
});
