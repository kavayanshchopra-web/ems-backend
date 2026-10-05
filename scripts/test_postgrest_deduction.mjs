const SUPABASE_REST_URL = 'https://pdjaajbhrvglwukoacuh.supabase.co/rest/v1';
const SUPABASE_KEY = 'sb_publishable_q8SBMvAwczXP0yfDfIMZsQ_ahP5YYq3';

const SUPABASE_HEADERS = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
  'Cache-Control': 'no-cache',
  'Pragma': 'no-cache'
};

async function testPostgrestDeduct() {
  console.log('Testing PostgREST fetch with anon key...');
  
  // 1. Fetch current wallet for tenant 1
  const wRes = await fetch(`${SUPABASE_REST_URL}/universal_wallets?tenant_id=eq.1&select=*`, {
    headers: SUPABASE_HEADERS
  });
  const wallets = await wRes.json();
  console.log('Fetch wallet status:', wRes.status, wallets);
  const currentWallet = wallets[0];
  const oldBalance = parseFloat(currentWallet.balance);
  const newBalance = parseFloat((oldBalance - 0.10).toFixed(4));

  // 2. PATCH wallet balance
  const patchRes = await fetch(`${SUPABASE_REST_URL}/universal_wallets?tenant_id=eq.1`, {
    method: 'PATCH',
    headers: { ...SUPABASE_HEADERS, 'Prefer': 'return=representation' },
    body: JSON.stringify({
      balance: newBalance,
      updated_at: new Date().toISOString()
    })
  });
  console.log('PATCH wallet status:', patchRes.status, await patchRes.json());

  // 3. POST transaction
  const txnId = `TXN-WHA-TEST-${Date.now()}`;
  const postTxRes = await fetch(`${SUPABASE_REST_URL}/wallet_transactions`, {
    method: 'POST',
    headers: { ...SUPABASE_HEADERS, 'Prefer': 'return=representation' },
    body: JSON.stringify({
      id: txnId,
      tenant_id: 1,
      service_key: 'whatsapp_normal_chat',
      transaction_type: 'DEBIT',
      amount: 0.1000,
      units: 1,
      balance_before: oldBalance,
      balance_after: newBalance,
      reference_id: txnId,
      recipient_phone: '919646378478',
      description: 'Test WhatsApp PostgREST Live Deduction',
      trigger_source: 'WHATSAPP_CHAT'
    })
  });
  console.log('POST transaction status:', postTxRes.status, await postTxRes.json());
}

testPostgrestDeduct();
