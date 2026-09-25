import pg from 'pg';

const pool = new pg.Pool({
  connectionString: 'postgresql://postgres:%28sandbox%40113%29@db.mucgmzldgvtblmsurtgo.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function seedReportingData() {
  console.log('========================================================');
  console.log('📊 SEEDING REALISTIC CALL DATA FOR DYNAMIC REPORTING ENGINE');
  console.log('Target Database: Sandbox PostgreSQL 17 (mucgmzldgvtblmsurtgo)');
  console.log('========================================================\n');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Remove any previous seed test records to keep tests clean
    await client.query("DELETE FROM call_logs WHERE id LIKE 'rep_seed_%'");

    const now = new Date();
    const todayStr = now.toISOString();

    // 3 days ago (This Week)
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    // 15 days ago (This Month)
    const fifteenDaysAgo = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString();

    const sampleCalls = [
      // TODAY: Rahul Sharma - 85s (2 min = ₹1.50 retail, ₹0.76 wholesale)
      {
        id: 'rep_seed_001',
        tenant_id: 1,
        phone: '919876500001',
        customer_name: 'Vikram Mehta',
        agent_id: 'agent_101',
        agent_name: 'Rahul Sharma (Sales)',
        status: 'COMPLETED',
        call_type: 'OUTGOING',
        type: 'outgoing',
        duration: '1m 25s',
        duration_seconds: 85,
        cost: 0.7600, // 2 mins @ 0.38
        billed_amount: 1.50, // 2 mins @ 0.75
        created_at: todayStr
      },
      // TODAY: Pooja Verma - 140s (3 min = ₹2.25 retail, ₹1.14 wholesale)
      {
        id: 'rep_seed_002',
        tenant_id: 1,
        phone: '919876500002',
        customer_name: 'Ananya Roy',
        agent_id: 'agent_102',
        agent_name: 'Pooja Verma (Support)',
        status: 'COMPLETED',
        call_type: 'OUTGOING',
        type: 'outgoing',
        duration: '2m 20s',
        duration_seconds: 140,
        cost: 1.1400,
        billed_amount: 2.25,
        created_at: todayStr
      },
      // TODAY: Amit Patel - Missed call (0s = ₹0.00)
      {
        id: 'rep_seed_003',
        tenant_id: 1,
        phone: '919876500003',
        customer_name: 'Rajesh Khanna',
        agent_id: 'agent_103',
        agent_name: 'Amit Patel (Retention)',
        status: 'MISSED',
        call_type: 'INBOUND',
        type: 'inbound',
        duration: '0s',
        duration_seconds: 0,
        cost: 0.0000,
        billed_amount: 0.00,
        created_at: todayStr
      },
      // THIS WEEK: Rahul Sharma - 210s (4 min = ₹3.00 retail, ₹1.52 wholesale)
      {
        id: 'rep_seed_004',
        tenant_id: 1,
        phone: '919876500004',
        customer_name: 'Sunil Rao',
        agent_id: 'agent_101',
        agent_name: 'Rahul Sharma (Sales)',
        status: 'COMPLETED',
        call_type: 'OUTGOING',
        type: 'outgoing',
        duration: '3m 30s',
        duration_seconds: 210,
        cost: 1.5200,
        billed_amount: 3.00,
        created_at: threeDaysAgo
      },
      // THIS MONTH: Amit Patel - 310s (6 min = ₹4.50 retail, ₹2.28 wholesale)
      {
        id: 'rep_seed_005',
        tenant_id: 1,
        phone: '919876500005',
        customer_name: 'Deepak Joshi',
        agent_id: 'agent_103',
        agent_name: 'Amit Patel (Retention)',
        status: 'COMPLETED',
        call_type: 'OUTGOING',
        type: 'outgoing',
        duration: '5m 10s',
        duration_seconds: 310,
        cost: 2.2800,
        billed_amount: 4.50,
        created_at: fifteenDaysAgo
      }
    ];

    for (const call of sampleCalls) {
      await client.query(
        `INSERT INTO call_logs 
         (id, tenant_id, phone, customer_phone, customer_name, agent_id, agent_name, status, call_type, type, duration, duration_seconds, cost, billed_amount, created_at)
         VALUES ($1, $2, $3, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
         ON CONFLICT (id) DO UPDATE 
         SET cost = EXCLUDED.cost, billed_amount = EXCLUDED.billed_amount, created_at = EXCLUDED.created_at`,
        [
          call.id,
          call.tenant_id,
          call.phone,
          call.customer_name,
          call.agent_id,
          call.agent_name,
          call.status,
          call.call_type,
          call.type,
          call.duration,
          call.duration_seconds,
          call.cost,
          call.billed_amount,
          call.created_at
        ]
      );
    }

    await client.query('COMMIT');
    console.log(`✅ Seeded ${sampleCalls.length} realistic call records across Today, This Week, and This Month.`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seeding failed:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

seedReportingData();
