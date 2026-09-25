import pg from 'pg';

const LIVE_DB_URL = 'postgresql://postgres:%28Kavay%40113%29@db.pdjaajbhrvglwukoacuh.supabase.co:5432/postgres';

const pool = new pg.Pool({
  connectionString: LIVE_DB_URL,
  ssl: { rejectUnauthorized: false }
});

async function runLiveMigration() {
  console.log('========================================================');
  console.log('🚀 MIGRATING PILLAR 2 DUAL-DEVICE SESSIONS TO LIVE DATABASE');
  console.log('Target: db.pdjaajbhrvglwukoacuh.supabase.co (Live Production)');
  console.log('========================================================\n');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log('[1/3] Creating user_active_device_sessions table on Live DB...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_active_device_sessions (
        id SERIAL PRIMARY KEY,
        tenant_id INTEGER NOT NULL,
        user_id VARCHAR(100) NOT NULL,
        device_type VARCHAR(20) NOT NULL, -- 'mobile' or 'desktop'
        session_token VARCHAR(255) NOT NULL,
        device_id VARCHAR(255) NOT NULL,
        device_name VARCHAR(255),
        user_agent TEXT,
        ip_address VARCHAR(100),
        last_heartbeat TIMESTAMPTZ DEFAULT NOW(),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        CONSTRAINT uq_live_tenant_user_device UNIQUE (tenant_id, user_id, device_type)
      );
    `);
    console.log('✅ Table user_active_device_sessions created successfully on Live DB.');

    console.log('[2/3] Creating lookup index...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_live_active_sessions_lookup 
      ON user_active_device_sessions (tenant_id, user_id, device_type);
    `);

    console.log('[3/3] Creating upsert_device_session & check_device_session RPC functions...');
    await client.query(`
      CREATE OR REPLACE FUNCTION upsert_device_session(
        p_tenant_id INTEGER,
        p_user_id VARCHAR,
        p_device_type VARCHAR,
        p_session_token VARCHAR,
        p_device_id VARCHAR,
        p_device_name VARCHAR DEFAULT 'Unknown Device'
      ) RETURNS jsonb AS $$
      DECLARE
        v_res RECORD;
      BEGIN
        INSERT INTO user_active_device_sessions (
          tenant_id, user_id, device_type, session_token, device_id, device_name, last_heartbeat, created_at
        ) VALUES (
          p_tenant_id, p_user_id, p_device_type, p_session_token, p_device_id, p_device_name, NOW(), NOW()
        )
        ON CONFLICT (tenant_id, user_id, device_type)
        DO UPDATE SET
          session_token = EXCLUDED.session_token,
          device_id = EXCLUDED.device_id,
          device_name = EXCLUDED.device_name,
          last_heartbeat = NOW(),
          created_at = NOW()
        RETURNING * INTO v_res;

        RETURN jsonb_build_object(
          'success', true,
          'session_token', v_res.session_token,
          'device_type', v_res.device_type,
          'device_id', v_res.device_id
        );
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;

      CREATE OR REPLACE FUNCTION check_device_session(
        p_tenant_id INTEGER,
        p_user_id VARCHAR,
        p_device_type VARCHAR,
        p_session_token VARCHAR
      ) RETURNS jsonb AS $$
      DECLARE
        v_current RECORD;
      BEGIN
        SELECT * INTO v_current 
        FROM user_active_device_sessions 
        WHERE tenant_id = p_tenant_id 
          AND user_id = p_user_id 
          AND device_type = p_device_type
        LIMIT 1;

        IF NOT FOUND THEN
          -- First time / no recorded session -> valid
          RETURN jsonb_build_object('valid', true, 'reason', 'NEW_SESSION');
        END IF;

        IF v_current.session_token = p_session_token THEN
          -- Heartbeat match
          UPDATE user_active_device_sessions 
          SET last_heartbeat = NOW() 
          WHERE id = v_current.id;

          RETURN jsonb_build_object('valid', true, 'reason', 'ACTIVE');
        ELSE
          -- Disconnected / Superseded by another device of same type!
          RETURN jsonb_build_object(
            'valid', false,
            'reason', 'TAKEN_OVER',
            'device_type', v_current.device_type,
            'device_name', v_current.device_name,
            'new_device_at', v_current.created_at
          );
        END IF;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;

      -- Grant permissions so REST API can execute RPCs
      GRANT ALL ON TABLE user_active_device_sessions TO anon, authenticated, service_role;
      GRANT USAGE, SELECT ON SEQUENCE user_active_device_sessions_id_seq TO anon, authenticated, service_role;
      GRANT EXECUTE ON FUNCTION upsert_device_session TO anon, authenticated, service_role;
      GRANT EXECUTE ON FUNCTION check_device_session TO anon, authenticated, service_role;
    `);

    await client.query('COMMIT');
    console.log('\n🎉 SUCCESS: Live Database Schema & RPC Functions Deployed Successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Live migration failed:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

runLiveMigration().catch(console.error);
