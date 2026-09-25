import pg from 'pg';
import assert from 'assert';

const pool = new pg.Pool({
  connectionString: 'postgresql://postgres:%28Kavay%40113%29@db.pdjaajbhrvglwukoacuh.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function runLiveDualDeviceTest() {
  console.log('🧪 Testing Live DB: "1 Phone + 1 Laptop" Dual-Device Policy & Takeover Engine...\n');

  const client = await pool.connect();
  try {
    const tenantId = 100004;
    const userId = '8'; // ghl000113@gmail.com

    // 1. Phone 1 logs in
    console.log('[Step 1] Phone 1 logs in for ghl000113@gmail.com...');
    const p1 = await client.query(`
      SELECT upsert_device_session($1, $2, $3, $4, $5, $6) as res
    `, [tenantId, userId, 'mobile', 'token_live_phone_1', 'dev_phone_1', 'Samsung Galaxy S23']);
    assert(p1.rows[0].res.success, 'Phone 1 upsert failed');
    console.log('✅ Phone 1 logged in successfully on Live DB.');

    // 2. Check Phone 1 status (Active)
    console.log('[Step 2] Checking Phone 1 status...');
    const chkPhone1 = await client.query(`
      SELECT check_device_session($1, $2, $3, $4) as res
    `, [tenantId, userId, 'mobile', 'token_live_phone_1']);
    assert.strictEqual(chkPhone1.rows[0].res.valid, true);
    assert.strictEqual(chkPhone1.rows[0].res.reason, 'ACTIVE');
    console.log('✅ Phone 1 is verified ACTIVE on Live DB.');

    // 3. Laptop 1 logs in concurrently (Desktop device_type)
    console.log('[Step 3] Laptop 1 logs in concurrently...');
    const l1 = await client.query(`
      SELECT upsert_device_session($1, $2, $3, $4, $5, $6) as res
    `, [tenantId, userId, 'desktop', 'token_live_laptop_1', 'dev_laptop_1', 'MacBook Air']);
    assert(l1.rows[0].res.success);
    console.log('✅ Laptop 1 logged in concurrently.');

    // 4. Phone 2 logs in (Takeover of Mobile slot)
    console.log('[Step 4] Phone 2 logs in with same user credentials...');
    const p2 = await client.query(`
      SELECT upsert_device_session($1, $2, $3, $4, $5, $6) as res
    `, [tenantId, userId, 'mobile', 'token_live_phone_2', 'dev_phone_2', 'iPhone 15']);
    assert(p2.rows[0].res.success);
    console.log('✅ Phone 2 logged in successfully.');

    // 5. Phone 1 checks session -> MUST return TAKEN_OVER!
    console.log('[Step 5] Checking Phone 1 status after Phone 2 takeover...');
    const chkPhone1After = await client.query(`
      SELECT check_device_session($1, $2, $3, $4) as res
    `, [tenantId, userId, 'mobile', 'token_live_phone_1']);
    assert.strictEqual(chkPhone1After.rows[0].res.valid, false);
    assert.strictEqual(chkPhone1After.rows[0].res.reason, 'TAKEN_OVER');
    console.log('✅ [PASS] Phone 1 received TAKEN_OVER on Live DB: Alert popup triggered!');

    // 6. Laptop 1 STILL ACTIVE!
    console.log('[Step 6] Verifying Laptop 1 status: Must REMAIN ACTIVE...');
    const chkLaptop1 = await client.query(`
      SELECT check_device_session($1, $2, $3, $4) as res
    `, [tenantId, userId, 'desktop', 'token_live_laptop_1']);
    assert.strictEqual(chkLaptop1.rows[0].res.valid, true);
    assert.strictEqual(chkLaptop1.rows[0].res.reason, 'ACTIVE');
    console.log('✅ [PASS] Laptop 1 is 100% active and unaffected!');

    // Clean up test rows
    await client.query(`DELETE FROM user_active_device_sessions WHERE tenant_id = $1 AND user_id = $2`, [tenantId, userId]);
    console.log('🧹 Cleaned up test sessions.');

    console.log('\n🎉 ALL LIVE DATABASE DUAL-DEVICE CHECKS PASSED WITH 100% ACCURACY!');
  } finally {
    client.release();
    await pool.end();
  }
}

runLiveDualDeviceTest().catch(console.error);
