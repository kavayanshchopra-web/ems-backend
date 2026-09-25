import pg from 'pg';
import assert from 'assert';

const pool = new pg.Pool({
  connectionString: 'postgresql://postgres:%28sandbox%40113%29@db.mucgmzldgvtblmsurtgo.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function runDualDeviceTest() {
  console.log('🧪 Testing Pillar 2: "1 Phone + 1 Laptop" Dual-Device Policy & Takeover Engine...\n');

  const client = await pool.connect();
  try {
    const tenantId = 1;
    const userId = 'test_user_777';

    // Cleanup previous test data
    await client.query(`DELETE FROM user_active_device_sessions WHERE tenant_id = $1 AND user_id = $2`, [tenantId, userId]);

    // 1. Phone 1 logs in
    console.log('[Step 1] Phone 1 logs in...');
    const p1 = await client.query(`
      SELECT upsert_device_session($1, $2, $3, $4, $5, $6) as res
    `, [tenantId, userId, 'mobile', 'token_phone_1', 'dev_id_phone_1', 'Samsung Galaxy S23']);
    assert(p1.rows[0].res.success, 'Phone 1 upsert failed');
    console.log('✅ Phone 1 logged in successfully.');

    // 2. Laptop 1 logs in (Different device_type: 'desktop')
    console.log('\n[Step 2] Laptop 1 logs in concurrently...');
    const l1 = await client.query(`
      SELECT upsert_device_session($1, $2, $3, $4, $5, $6) as res
    `, [tenantId, userId, 'desktop', 'token_laptop_1', 'dev_id_laptop_1', 'MacBook Pro']);
    assert(l1.rows[0].res.success, 'Laptop 1 upsert failed');
    console.log('✅ Laptop 1 logged in successfully.');

    // 3. Verify BOTH Phone 1 and Laptop 1 are ACTIVE simultaneously
    console.log('\n[Step 3] Checking concurrency status: Both Phone 1 and Laptop 1 should be ACTIVE...');
    const chkPhone1 = await client.query(`
      SELECT check_device_session($1, $2, $3, $4) as res
    `, [tenantId, userId, 'mobile', 'token_phone_1']);
    assert.strictEqual(chkPhone1.rows[0].res.valid, true);
    assert.strictEqual(chkPhone1.rows[0].res.reason, 'ACTIVE');

    const chkLaptop1 = await client.query(`
      SELECT check_device_session($1, $2, $3, $4) as res
    `, [tenantId, userId, 'desktop', 'token_laptop_1']);
    assert.strictEqual(chkLaptop1.rows[0].res.valid, true);
    assert.strictEqual(chkLaptop1.rows[0].res.reason, 'ACTIVE');
    console.log('✅ [PASS] 1 Phone + 1 Laptop concurrent coexistence verified 100%!');

    // 4. Phone 2 logs in (Takeover of Mobile slot)
    console.log('\n[Step 4] Phone 2 logs in with same user credentials...');
    const p2 = await client.query(`
      SELECT upsert_device_session($1, $2, $3, $4, $5, $6) as res
    `, [tenantId, userId, 'mobile', 'token_phone_2', 'dev_id_phone_2', 'iPhone 15 Pro']);
    assert(p2.rows[0].res.success);

    // 5. Check Phone 1 (Should be TAKEN_OVER / Invalidated!)
    console.log('\n[Step 5] Checking Phone 1 status after Phone 2 takeover...');
    const chkPhone1After = await client.query(`
      SELECT check_device_session($1, $2, $3, $4) as res
    `, [tenantId, userId, 'mobile', 'token_phone_1']);
    assert.strictEqual(chkPhone1After.rows[0].res.valid, false);
    assert.strictEqual(chkPhone1After.rows[0].res.reason, 'TAKEN_OVER');
    console.log('✅ [PASS] Phone 1 correctly detected TAKEN_OVER by Phone 2!');

    // 6. Check Laptop 1 (Should STILL be ACTIVE!)
    console.log('\n[Step 6] Verifying Laptop 1 status: Must REMAIN ACTIVE even though Phone 1 was kicked...');
    const chkLaptop1After = await client.query(`
      SELECT check_device_session($1, $2, $3, $4) as res
    `, [tenantId, userId, 'desktop', 'token_laptop_1']);
    assert.strictEqual(chkLaptop1After.rows[0].res.valid, true);
    assert.strictEqual(chkLaptop1After.rows[0].res.reason, 'ACTIVE');
    console.log('✅ [PASS] Laptop 1 remained untouched and active!');

    // 7. Laptop 2 logs in (Takeover of Desktop slot)
    console.log('\n[Step 7] Laptop 2 logs in...');
    await client.query(`
      SELECT upsert_device_session($1, $2, $3, $4, $5, $6) as res
    `, [tenantId, userId, 'desktop', 'token_laptop_2', 'dev_id_laptop_2', 'Dell XPS 15']);

    // Laptop 1 kicked out
    const chkLaptop1Final = await client.query(`
      SELECT check_device_session($1, $2, $3, $4) as res
    `, [tenantId, userId, 'desktop', 'token_laptop_1']);
    assert.strictEqual(chkLaptop1Final.rows[0].res.valid, false);
    assert.strictEqual(chkLaptop1Final.rows[0].res.reason, 'TAKEN_OVER');
    console.log('✅ [PASS] Laptop 1 correctly detected TAKEN_OVER by Laptop 2!');

    // Phone 2 STILL active!
    const chkPhone2Final = await client.query(`
      SELECT check_device_session($1, $2, $3, $4) as res
    `, [tenantId, userId, 'mobile', 'token_phone_2']);
    assert.strictEqual(chkPhone2Final.rows[0].res.valid, true);
    assert.strictEqual(chkPhone2Final.rows[0].res.reason, 'ACTIVE');
    console.log('✅ [PASS] Phone 2 remained untouched and active!');

    console.log('\n🎉 ALL DUAL-DEVICE CONCURRENCY & TAKEOVER TESTS PASSED WITH 100% SUCCESS!');
  } finally {
    client.release();
    await pool.end();
  }
}

runDualDeviceTest().catch(console.error);
