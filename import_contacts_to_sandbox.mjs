import pg from 'pg';

const sandboxPool = new pg.Pool({
  connectionString: 'postgresql://postgres:%28sandbox%40113%29@db.mucgmzldgvtblmsurtgo.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

const masterPool = new pg.Pool({
  connectionString: 'postgresql://postgres:%28Kavay%40113%29@db.pdjaajbhrvglwukoacuh.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  console.log('🚀 Starting Contacts Import into Sandbox Database (mucgmzldgvtblmsurtgo)...');

  const sClient = await sandboxPool.connect();
  const mClient = await masterPool.connect();

  try {
    // 1. Ensure columns in sandbox
    await sClient.query(`
      ALTER TABLE contacts ADD COLUMN IF NOT EXISTS deal_value TEXT DEFAULT '';
      ALTER TABLE contacts ADD COLUMN IF NOT EXISTS email_normalized TEXT;
      ALTER TABLE tenants ADD COLUMN IF NOT EXISTS tenant_slug TEXT;
    `);

    // Ensure tenant 1 has proper slug
    await sClient.query(`
      UPDATE tenants SET tenant_slug = 'TEN-0001-KAVYANSH-CHOPRA' WHERE id = 1 AND (tenant_slug IS NULL OR tenant_slug = '');
      UPDATE tenants SET tenant_slug = 'TEN-1003-RAHUL' WHERE id = 1003 AND (tenant_slug IS NULL OR tenant_slug = '');
    `);

    // 2. Fetch contacts from master database
    console.log('📦 Fetching contacts from Master Database...');
    const masterContacts = await mClient.query(`
      SELECT id, name, custom_name, phone, phone_normalized, email, notes, 
             pipeline_stage, labels, profile_pic_url, is_archived, custom_fields, deal_value, created_at, updated_at
      FROM contacts
      WHERE is_archived = 0 OR is_archived IS NULL
    `);
    console.log(`Found ${masterContacts.rows.length} active contacts in Master Database.`);

    // 3. Insert into sandbox database in batches of 100
    const BATCH_SIZE = 100;
    let inserted = 0;

    for (let i = 0; i < masterContacts.rows.length; i += BATCH_SIZE) {
      const batch = masterContacts.rows.slice(i, i + BATCH_SIZE);
      const values = [];
      const placeholders = [];
      let pIdx = 1;

      for (const c of batch) {
        placeholders.push(`($${pIdx}, $${pIdx+1}, $${pIdx+2}, $${pIdx+3}, $${pIdx+4}, $${pIdx+5}, $${pIdx+6}, $${pIdx+7}, $${pIdx+8}, $${pIdx+9}::jsonb, $${pIdx+10}, $${pIdx+11}, $${pIdx+12}::jsonb, $${pIdx+13}, $${pIdx+14}, $${pIdx+15})`);
        
        values.push(
          String(c.id).trim(),
          1, // default tenant 1
          c.name || null,
          c.custom_name || null,
          c.phone || null,
          c.phone_normalized || null,
          c.email || null,
          c.notes || null,
          c.pipeline_stage || 'new',
          JSON.stringify(c.labels || []),
          c.profile_pic_url || null,
          Boolean(c.is_archived),
          JSON.stringify(c.custom_fields || {}),
          c.deal_value || '',
          c.created_at || new Date(),
          c.updated_at || new Date()
        );
        pIdx += 16;
      }

      const insertSql = `
        INSERT INTO contacts (
          id, tenant_id, name, custom_name, phone, phone_normalized, email, notes,
          pipeline_stage, labels, profile_pic_url, is_archived, custom_fields, deal_value, created_at, updated_at
        ) VALUES ${placeholders.join(', ')}
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          custom_name = EXCLUDED.custom_name,
          phone = EXCLUDED.phone,
          pipeline_stage = EXCLUDED.pipeline_stage,
          deal_value = EXCLUDED.deal_value,
          updated_at = NOW()
      `;

      await sClient.query(insertSql, values);
      inserted += batch.length;
      process.stdout.write(`\rImported ${inserted} / ${masterContacts.rows.length} contacts...`);
    }

    console.log('\n✅ Contacts import into Sandbox Database (mucgmzldgvtblmsurtgo) completed successfully!');

    // Verify count in sandbox
    const countRes = await sClient.query('SELECT count(*) FROM contacts');
    console.log(`🎉 Total contacts in Sandbox Table Editor: ${countRes.rows[0].count}`);

  } catch (err) {
    console.error('Import error:', err);
  } finally {
    sClient.release();
    mClient.release();
    await sandboxPool.end();
    await masterPool.end();
  }
}

main();
