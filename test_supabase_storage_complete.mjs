const SUPABASE_BASE = 'https://mucgmzldgvtblmsurtgo.supabase.co';
const SUPABASE_KEY = 'sb_publishable_xRGskG_bEbCJebUMT_XPHA_vjwf1Lr1';

async function testCompleteStoragePipeline() {
  console.log('--- Testing Complete Supabase Storage & media_vault Pipeline ---');

  // 1. Test Dummy Call Audio Upload (.mp3)
  console.log('\n1. Testing Audio (.mp3) Upload...');
  const audioFileName = `call_recording_${Date.now()}.mp3`;
  const audioPath = `tenants/1/calls/${audioFileName}`;
  const dummyAudioData = 'ID3\x03\x00\x00\x00\x00\x00#TSSE\x00\x00\x00\x0e\x00\x00\x03OmniFlow Voice Speech Test Audio';
  const audioBlob = new Blob([dummyAudioData], { type: 'audio/mpeg' });

  const audioRes = await fetch(`${SUPABASE_BASE}/storage/v1/object/omniflow-vault/${audioPath}`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'audio/mpeg',
      'x-upsert': 'true'
    },
    body: audioBlob
  });

  console.log('Audio upload status:', audioRes.status);
  const audioPublicUrl = `${SUPABASE_BASE}/storage/v1/object/public/omniflow-vault/${audioPath}`;
  console.log('Audio Public CDN URL:', audioPublicUrl);

  // 2. Test Dummy PDF Document Upload (.pdf)
  console.log('\n2. Testing PDF Document (.pdf) Upload...');
  const pdfFileName = `invoice_${Date.now()}.pdf`;
  const pdfPath = `tenants/1/invoices/${pdfFileName}`;
  const dummyPdfData = '%PDF-1.4\n%OmniFlow EMS Invoice Sample Document\n%%EOF';
  const pdfBlob = new Blob([dummyPdfData], { type: 'application/pdf' });

  const pdfRes = await fetch(`${SUPABASE_BASE}/storage/v1/object/omniflow-vault/${pdfPath}`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/pdf',
      'x-upsert': 'true'
    },
    body: pdfBlob
  });

  console.log('PDF upload status:', pdfRes.status);
  const pdfPublicUrl = `${SUPABASE_BASE}/storage/v1/object/public/omniflow-vault/${pdfPath}`;
  console.log('PDF Public CDN URL:', pdfPublicUrl);

  // 3. Insert record into media_vault table via PostgREST
  console.log('\n3. Inserting into public.media_vault table via REST API...');
  const mediaRecord = {
    id: `mv_${Date.now()}_test`,
    tenant_id: '1',
    file_name: audioFileName,
    original_file_name: 'test_call.mp3',
    file_url: audioPublicUrl,
    file_size: dummyAudioData.length,
    mime_type: 'audio/mpeg',
    category: 'calls',
    entity_id: 'call_999',
    sub_category: 'telephony',
    compressed: true,
    custom_fields: { duration: 120, agent: 'Sarah' }
  };

  const dbRes = await fetch(`${SUPABASE_BASE}/rest/v1/media_vault`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify(mediaRecord)
  });

  console.log('media_vault insert status:', dbRes.status);
  const insertedData = await dbRes.json();
  console.log('Inserted row:', insertedData);

  // 4. Query media_vault table to verify
  console.log('\n4. Querying media_vault for tenant 1...');
  const queryRes = await fetch(`${SUPABASE_BASE}/rest/v1/media_vault?tenant_id=eq.1&order=created_at.desc&limit=2`, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`
    }
  });
  const rows = await queryRes.json();
  console.log('Query verified rows:', rows);

  if (audioRes.ok && pdfRes.ok && dbRes.ok) {
    console.log('\n🎉 ALL CHECKS PASSED 100%! Supabase Storage + PostgreSQL media_vault is rock solid!');
  }
}

testCompleteStoragePipeline().catch(console.error);
