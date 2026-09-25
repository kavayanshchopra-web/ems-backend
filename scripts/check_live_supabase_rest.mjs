const SUPABASE_URL = 'https://pdjaajbhrvglwukoacuh.supabase.co/rest/v1';
const SUPABASE_KEY = 'sb_publishable_q8SBMvAwczXP0yfDfIMZsQ_ahP5YYq3';

async function check() {
  console.log('1. Searching for ghl000113@gmail.com on Live Supabase...');
  const res = await fetch(`${SUPABASE_URL}/users?email=like.*ghl*`, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
  });
  console.log('Live users search HTTP status:', res.status);
  const data = await res.json();
  console.log('Live users found:', data);

  console.log('\n2. Testing check_device_session RPC on Live Supabase...');
  const checkRpc = await fetch(`${SUPABASE_URL}/rpc/check_device_session`, {
    method: 'POST',
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_tenant_id: 1, p_user_id: 'test', p_device_type: 'mobile', p_session_token: '123' })
  });
  console.log('check_device_session RPC status on Live Supabase:', checkRpc.status);
  console.log('Response body:', await checkRpc.text());

  console.log('\n3. Testing upsert_device_session RPC on Live Supabase...');
  const upsertRpc = await fetch(`${SUPABASE_URL}/rpc/upsert_device_session`, {
    method: 'POST',
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_tenant_id: 1, p_user_id: 'test', p_device_type: 'mobile', p_session_token: '123', p_device_id: 'dev_123', p_device_name: 'test' })
  });
  console.log('upsert_device_session RPC status on Live Supabase:', upsertRpc.status);
  console.log('Response body:', await upsertRpc.text());
}

check().catch(console.error);
