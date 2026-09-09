import pg from 'pg';
const { Pool } = pg;

const connectionString = 'postgresql://postgres:%28sandbox%40113%29@db.mucgmzldgvtblmsurtgo.supabase.co:5432/postgres';

async function run() {
  console.log('--- Setting up Supabase Storage Bucket & media_vault table ---');
  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    // 1. Create media_vault index table in public schema
    console.log('1. Creating/Verifying public.media_vault table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.media_vault (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        file_name TEXT NOT NULL,
        original_file_name TEXT,
        file_url TEXT NOT NULL,
        file_size BIGINT DEFAULT 0,
        mime_type TEXT,
        category TEXT DEFAULT 'general',
        entity_id TEXT,
        sub_category TEXT,
        compressed BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        custom_fields JSONB DEFAULT '{}'::jsonb
      );
      CREATE INDEX IF NOT EXISTS idx_media_vault_tenant ON public.media_vault(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_media_vault_category ON public.media_vault(category);
    `);
    console.log('✅ public.media_vault table is ready.');

    // 2. Check storage.buckets
    console.log('2. Inspecting storage.buckets...');
    const bucketsRes = await pool.query(`SELECT id, name, public FROM storage.buckets WHERE id = 'omniflow-vault'`);
    if (bucketsRes.rows.length === 0) {
      console.log('Creating bucket "omniflow-vault" in storage.buckets...');
      await pool.query(`
        INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
        VALUES ('omniflow-vault', 'omniflow-vault', true, 52428800, NULL)
        ON CONFLICT (id) DO UPDATE SET public = true;
      `);
      console.log('✅ Bucket "omniflow-vault" created with public access.');
    } else {
      console.log('✅ Bucket "omniflow-vault" already exists:', bucketsRes.rows[0]);
      await pool.query(`UPDATE storage.buckets SET public = true WHERE id = 'omniflow-vault'`);
    }

    // 3. Ensure storage.objects public read & insert policies
    console.log('3. Setting up storage RLS policies for omniflow-vault...');
    try {
      await pool.query(`
        DO $$
        BEGIN
          -- Public read policy
          IF NOT EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public Access for omniflow-vault'
          ) THEN
            CREATE POLICY "Public Access for omniflow-vault" 
            ON storage.objects FOR SELECT 
            USING (bucket_id = 'omniflow-vault');
          END IF;

          -- Public insert policy
          IF NOT EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public Insert for omniflow-vault'
          ) THEN
            CREATE POLICY "Public Insert for omniflow-vault" 
            ON storage.objects FOR INSERT 
            WITH CHECK (bucket_id = 'omniflow-vault');
          END IF;

          -- Public update policy
          IF NOT EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public Update for omniflow-vault'
          ) THEN
            CREATE POLICY "Public Update for omniflow-vault" 
            ON storage.objects FOR UPDATE 
            USING (bucket_id = 'omniflow-vault');
          END IF;
        END $$;
      `);
      console.log('✅ Storage policies verified for omniflow-vault.');
    } catch (policyErr) {
      console.warn('Policy note (might already exist):', policyErr.message);
    }

    console.log('🎉 Supabase Storage setup completed successfully!');
  } catch (err) {
    console.error('❌ Error setting up Supabase Storage:', err);
  } finally {
    await pool.end();
  }
}

run();
