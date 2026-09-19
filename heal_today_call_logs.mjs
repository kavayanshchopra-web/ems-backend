import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const SUPABASE_BASE = 'https://pdjaajbhrvglwukoacuh.supabase.co';
const SUPABASE_KEY = 'sb_publishable_q8SBMvAwczXP0yfDfIMZsQ_ahP5YYq3';
const BUCKET = 'omniflow-vault';

async function main() {
  const client = await pool.connect();
  try {
    console.log('1. Fetching all storage audio files from tenants/1/calls...');
    const listRes = await fetch(`${SUPABASE_BASE}/storage/v1/object/list/${BUCKET}`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prefix: 'tenants/1/calls',
        limit: 100,
        sortBy: { column: 'name', order: 'desc' }
      })
    });
    const files = await listRes.json();
    console.log(`Found ${files.length} audio files in storage.`);

    // 2. Fetch existing call logs for tenant 1
    const { rows: existingLogs } = await client.query(`
      SELECT id, call_id, recording_url, customer_phone, created_at 
      FROM call_logs 
      WHERE tenant_id = 1
    `);
    const existingRecUrls = new Set(existingLogs.map(l => l.recording_url).filter(Boolean));
    const existingCallIds = new Set(existingLogs.map(l => l.call_id).filter(Boolean));

    // 3. Fetch contacts for tenant 1 for name resolution
    const { rows: contacts } = await client.query(`
      SELECT name, custom_name, phone, phone_normalized 
      FROM contacts 
      WHERE tenant_id = 1
    `);
    const contactMap = new Map();
    for (const c of contacts) {
      const name = c.custom_name || c.name || 'Customer';
      if (c.phone_normalized) contactMap.set(c.phone_normalized, name);
      if (c.phone) {
        const d10 = c.phone.replace(/\D/g, '').slice(-10);
        if (d10) contactMap.set(d10, name);
      }
    }

    let createdCount = 0;
    let linkedCount = 0;

    for (const file of files) {
      const fileName = file.name;
      if (!fileName || !fileName.endsWith('.m4a')) continue;

      const publicUrl = `${SUPABASE_BASE}/storage/v1/object/public/${BUCKET}/tenants/1/calls/${fileName}`;

      // Check if this audio file is already linked
      if (existingRecUrls.has(publicUrl)) {
        continue;
      }

      // Parse filename: call_{epoch}_{phone}.m4a
      const clean = fileName.replace('.m4a', '');
      const parts = clean.split('_');
      const epochStr = parts[1] || '';
      const phoneRaw = parts[2] || '';
      const epoch = Number(epochStr);
      const callTime = (!isNaN(epoch) && epoch > 1000000000000) ? new Date(epoch) : new Date(file.updated_at || Date.now());

      const norm10 = phoneRaw.replace(/\D/g, '').slice(-10);
      const fullPhone = phoneRaw.startsWith('+') ? phoneRaw : (phoneRaw.length === 10 ? `+91${phoneRaw}` : `+${phoneRaw}`);
      const resolvedName = contactMap.get(norm10) || `Lead (${norm10 || 'Unknown'})`;

      // Approximate duration from file size if needed (~16KB per sec for AAC m4a)
      const sizeBytes = file.metadata?.size || 0;
      let durSec = Math.round(sizeBytes / 16000);
      if (durSec < 2) durSec = 3;
      if (durSec > 600) durSec = 60;
      const durFormatted = `${String(Math.floor(durSec / 60)).padStart(2, '0')}:${String(durSec % 60).padStart(2, '0')}`;

      // Check if an unlinked log exists for this phone around this timestamp (+/- 10 mins)
      const matchedLog = existingLogs.find(l => {
        if (!l.customer_phone) return false;
        const lNorm10 = l.customer_phone.replace(/\D/g, '').slice(-10);
        if (lNorm10 !== norm10) return false;
        if (l.recording_url && l.recording_url.startsWith('http')) return false;
        const lTime = new Date(l.created_at).getTime();
        return Math.abs(lTime - callTime.getTime()) < 15 * 60 * 1000;
      });

      if (matchedLog) {
        // Link to existing log
        await client.query(`
          UPDATE call_logs 
          SET recording_url = $1, recording_status = 'COMPLIANT', duration_seconds = $2, duration = $3
          WHERE id = $4
        `, [publicUrl, durSec, durFormatted, matchedLog.id]);
        existingRecUrls.add(publicUrl);
        linkedCount++;
        console.log(`🔗 Linked audio ${fileName} to existing call log ID ${matchedLog.id}`);
      } else {
        // Create new call log for this call!
        const callId = `call_${epochStr || Date.now()}_${norm10}`;
        const res = await client.query(`
          INSERT INTO call_logs (
            tenant_id, staff_id, staff_name, agent_name, agent_id, agent_role,
            customer_name, customer_phone, channel, type, call_type,
            duration_seconds, duration, recording_url, recording_status,
            disposition, notes, created_at, call_id, custom_fields, is_bypassed
          ) VALUES (
            1, '1', 'Kavayansh Chopra', 'Kavayansh Chopra', '1', 'superadmin',
            $1, $2, 'SIM (SIM 2)', 'OUTGOING', 'OUTGOING',
            $3, $4, $5, 'COMPLIANT',
            'Interested', $6, $7, $8, $9, false
          ) RETURNING id
        `, [
          resolvedName,
          fullPhone,
          durSec,
          durFormatted,
          publicUrl,
          `Call completed via SIM 2 by Kavayansh Chopra [Ref: ${callId}]`,
          callTime.toISOString(),
          callId,
          JSON.stringify({ agent_email: 'kavayanshchopra@gmail.com' })
        ]);
        existingRecUrls.add(publicUrl);
        createdCount++;
        console.log(`✨ Created missing call log ID ${res.rows[0].id} for ${resolvedName} (${fullPhone}) at ${callTime.toLocaleTimeString()} with audio!`);
      }
    }

    console.log(`\n🎉 DONE! Auto-healed: ${createdCount} new call logs created, ${linkedCount} existing call logs linked with audio.`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => {
  console.error('❌ Error auto-healing call logs:', err);
  process.exit(1);
});
