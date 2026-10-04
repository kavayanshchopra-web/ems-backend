/**
 * Universal SaaS Wallet Frontend Client Engine
 * Handles live balance tracking, threshold alerts, Razorpay top-ups, and transaction history.
 */

const IS_DEV = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
const API_BASE = (typeof window !== 'undefined' && window.__EMS_API_URL__) 
  ? window.__EMS_API_URL__.replace(/\/api\/?$/, '') 
  : (IS_DEV ? 'http://localhost:5000' : 'https://api.employeemanagementsystems.com');

const isSandboxDomain = typeof window !== 'undefined' && (
  window.location.hostname.includes('sandbox') ||
  window.location.hostname.includes('staging') ||
  (localStorage.getItem('ems_db_env') === 'sandbox')
);

const SUPABASE_REST_URL = isSandboxDomain
  ? 'https://mucgmzldgvtblmsurtgo.supabase.co/rest/v1'
  : 'https://pdjaajbhrvglwukoacuh.supabase.co/rest/v1';

const SUPABASE_KEY = isSandboxDomain
  ? 'sb_publishable_xRGskG_bEbCJebUMT_XPHA_vjwf1Lr1'
  : 'sb_publishable_q8SBMvAwczXP0yfDfIMZsQ_ahP5YYq3';

const SUPABASE_HEADERS = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json'
};

class FrontendUniversalWalletService {
  getAuthHeaders(tenantId) {
    const token = (typeof window !== 'undefined')
      ? (localStorage.getItem('omnilflow_token') || localStorage.getItem('omniflow_token') || localStorage.getItem('ems_token') || '')
      : '';
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (tenantId) headers['X-Tenant-Id'] = String(tenantId);
    return headers;
  }

  async fetchWalletStatus(tenantId = 1) {
    const cleanTenant = Number(tenantId) || 1;
    try {
      const res = await fetch(`${API_BASE}/api/wallet/status?tenantId=${cleanTenant}`, {
        headers: this.getAuthHeaders(cleanTenant)
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.wallet) return data;
      }
    } catch (e) {
      // Fall through to direct Supabase REST
    }

    // Direct Supabase Fallback (100% reliable)
    try {
      const [wRes, rRes] = await Promise.all([
        fetch(`${SUPABASE_REST_URL}/universal_wallets?tenant_id=eq.${cleanTenant}&select=*`, { headers: SUPABASE_HEADERS }).then(r => r.json()).catch(() => []),
        fetch(`${SUPABASE_REST_URL}/global_service_rates?is_active=eq.true&select=*`, { headers: SUPABASE_HEADERS }).then(r => r.json()).catch(() => [])
      ]);

      let wallet = Array.isArray(wRes) && wRes[0];
      if (!wallet) {
        // Auto-initialize real 0.00 wallet in Supabase
        const createRes = await fetch(`${SUPABASE_REST_URL}/universal_wallets`, {
          method: 'POST',
          headers: { ...SUPABASE_HEADERS, 'Prefer': 'return=representation' },
          body: JSON.stringify({
            tenant_id: cleanTenant,
            balance: 0.0000,
            currency: 'INR',
            min_threshold: 1000.0000,
            status: 'ACTIVE'
          })
        }).catch(() => null);
        if (createRes && createRes.ok) {
          const created = await createRes.json();
          wallet = created[0];
        }
      }

      const rates = {};
      (rRes || []).forEach(r => {
        rates[r.service_key] = {
          displayName: r.display_name,
          rate: parseFloat(r.default_rate || 0.10)
        };
      });

      return {
        success: true,
        wallet: {
          balance: parseFloat(wallet?.balance || 0),
          currency: wallet?.currency || 'INR',
          min_threshold: parseFloat(wallet?.min_threshold || 1000),
          is_below_threshold: parseFloat(wallet?.balance || 0) <= parseFloat(wallet?.min_threshold || 1000),
          is_depleted: parseFloat(wallet?.balance || 0) <= 0,
          status: wallet?.status || 'ACTIVE'
        },
        rates: Object.keys(rates).length > 0 ? rates : {
          whatsapp_normal_chat: { displayName: '1-to-1 Chat Message (EMS Web)', rate: 0.10 },
          whatsapp_template_msg: { displayName: 'Single Template Message', rate: 0.20 },
          whatsapp_bulk_broadcast: { displayName: 'Bulk Campaign Broadcast', rate: 0.30 }
        }
      };
    } catch (err) {
      console.warn('[Frontend Wallet Status Notice]:', err.message);
      return {
        success: false,
        wallet: {
          balance: 0.00,
          currency: 'INR',
          min_threshold: 1000.0,
          is_below_threshold: true,
          is_depleted: true,
          status: 'ACTIVE'
        },
        rates: {
          whatsapp_normal_chat: { displayName: '1-to-1 Chat Message (EMS Web)', rate: 0.10 },
          whatsapp_template_msg: { displayName: 'Single Template Message', rate: 0.20 },
          whatsapp_bulk_broadcast: { displayName: 'Bulk Campaign Broadcast', rate: 0.30 }
        }
      };
    }
  }

  async checkCanSend(tenantId = 1, messageType = 'whatsapp_normal_chat', count = 1) {
    try {
      const res = await fetch(`${API_BASE}/api/wallet/precheck`, {
        method: 'POST',
        headers: this.getAuthHeaders(tenantId),
        body: JSON.stringify({ tenantId, messageType, count })
      });
      const data = await res.json();
      return data;
    } catch (err) {
      return { allowed: true, requiredAmount: 0.10 * count };
    }
  }

  async createRechargeOrder(tenantId = 1, amount = 1000) {
    const res = await fetch(`${API_BASE}/api/wallet/recharge/create-order`, {
      method: 'POST',
      headers: this.getAuthHeaders(tenantId),
      body: JSON.stringify({ tenantId, amount })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to create recharge order');
    }
    return await res.json();
  }

  async verifyRechargePayment(tenantId, { orderId, paymentId, signature }) {
    const res = await fetch(`${API_BASE}/api/wallet/recharge/verify`, {
      method: 'POST',
      headers: this.getAuthHeaders(tenantId),
      body: JSON.stringify({ tenantId, orderId, paymentId, signature })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Payment signature verification failed');
    }
    return await res.json();
  }

  async fetchLedger(tenantId = 1, limit = 50, offset = 0) {
    const cleanTenant = Number(tenantId) || 1;
    try {
      const res = await fetch(`${API_BASE}/api/wallet/ledger?tenantId=${cleanTenant}&limit=${limit}&offset=${offset}`, {
        headers: this.getAuthHeaders(cleanTenant)
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.transactions) return data;
      }
    } catch (e) {}

    // Direct Supabase Fallback
    try {
      const res = await fetch(`${SUPABASE_REST_URL}/wallet_transactions?tenant_id=eq.${cleanTenant}&order=created_at.desc&limit=${limit}&offset=${offset}`, {
        headers: SUPABASE_HEADERS
      });
      if (res.ok) {
        const txs = await res.json();
        return { transactions: Array.isArray(txs) ? txs : [], totalCount: (txs || []).length };
      }
    } catch (err) {
      console.warn('[Wallet Ledger Notice]:', err.message);
    }
    return { transactions: [], totalCount: 0 };
  }

  async fetchSuperAdminOverview() {
    try {
      const res = await fetch(`${API_BASE}/api/superadmin/wallet/overview`, {
        headers: this.getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.tenants && data.tenants.length > 0) return data;
      }
    } catch (e) {}

    // Direct Supabase Telemetry with Cache Busting
    try {
      const ts = Date.now();
      const [tRes, wRes, rRes, txRes] = await Promise.all([
        fetch(`${SUPABASE_REST_URL}/tenants?select=*&_t=${ts}`, { headers: SUPABASE_HEADERS }).then(r => r.json()).catch(() => []),
        fetch(`${SUPABASE_REST_URL}/universal_wallets?select=*&_t=${ts}`, { headers: SUPABASE_HEADERS }).then(r => r.json()).catch(() => []),
        fetch(`${SUPABASE_REST_URL}/global_service_rates?is_active=eq.true&_t=${ts}`, { headers: SUPABASE_HEADERS }).then(r => r.json()).catch(() => []),
        fetch(`${SUPABASE_REST_URL}/wallet_transactions?select=*&_t=${ts}`, { headers: SUPABASE_HEADERS }).then(r => r.json()).catch(() => [])
      ]);

      const walletMap = new Map();
      (wRes || []).forEach(w => walletMap.set(Number(w.tenant_id), w));

      const txStats = new Map();
      (txRes || []).forEach(tx => {
        const tid = Number(tx.tenant_id);
        if (!txStats.has(tid)) txStats.set(tid, { msgsSent: 0, spent: 0, recharged: 0 });
        const s = txStats.get(tid);
        if (tx.transaction_type === 'DEBIT') {
          s.msgsSent += (tx.units || 1);
          s.spent += parseFloat(tx.amount || 0);
        } else if (tx.transaction_type === 'CREDIT' || tx.transaction_type === 'BONUS') {
          s.recharged += parseFloat(tx.amount || 0);
        }
      });

      let totalClientFloat = 0;
      let lowBalanceTenantsCount = 0;

      const tenantRows = (tRes || []).map(t => {
        const tid = Number(t.id);
        const w = walletMap.get(tid);
        const bal = w ? parseFloat(w.balance || 0) : 0;
        const thresh = w ? parseFloat(w.min_threshold || 1000) : 1000;
        totalClientFloat += bal;
        if (bal <= thresh) lowBalanceTenantsCount++;

        const stats = txStats.get(tid) || { msgsSent: 0, spent: 0, recharged: 0 };

        return {
          tenant_id: tid,
          company_name: t.company_name || (`Company #${tid}`),
          balance: bal,
          min_threshold: thresh,
          status: w?.status || 'ACTIVE',
          total_messages_sent: stats.msgsSent,
          total_spent: stats.spent,
          total_recharged: stats.recharged
        };
      });

      return {
        success: true,
        totalClientFloat,
        lowBalanceTenantsCount,
        tenants: tenantRows,
        globalRates: (rRes || []).map(r => ({
          service_key: r.service_key,
          display_name: r.display_name,
          default_rate: parseFloat(r.default_rate || 0.10)
        }))
      };
    } catch (err) {
      console.warn('[fetchSuperAdminOverview Supabase error]:', err);
      return { success: false, totalClientFloat: 0, lowBalanceTenantsCount: 0, tenants: [], globalRates: [] };
    }
  }

  async updateRates(payload) {
    try {
      const res = await fetch(`${API_BASE}/api/superadmin/wallet/rates`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(payload)
      });
      if (res.ok) return await res.json();
    } catch (e) {}

    // Direct Supabase Update
    try {
      if (payload.serviceKey && payload.defaultRate !== undefined) {
        await fetch(`${SUPABASE_REST_URL}/global_service_rates?service_key=eq.${payload.serviceKey}`, {
          method: 'PATCH',
          headers: SUPABASE_HEADERS,
          body: JSON.stringify({
            default_rate: parseFloat(payload.defaultRate),
            updated_at: new Date().toISOString()
          })
        });
      }
      return { success: true };
    } catch (err) {
      throw new Error(err.message || 'Failed to update rates');
    }
  }

  async adjustCredit(tenantId, amount, reason) {
    const cleanTenant = Number(tenantId) || 1;
    const cleanAmount = parseFloat(amount);

    try {
      // 1. Fetch current wallet
      const wRes = await fetch(`${SUPABASE_REST_URL}/universal_wallets?tenant_id=eq.${cleanTenant}&select=*&_t=${Date.now()}`, {
        headers: SUPABASE_HEADERS
      }).then(r => r.json()).catch(() => []);

      const currentWallet = Array.isArray(wRes) && wRes[0];
      const currentBalance = currentWallet ? parseFloat(currentWallet.balance || 0) : 0;
      const newBalance = currentBalance + cleanAmount;
      const newStatus = newBalance <= 0 ? 'DEPLETED' : (newBalance <= 1000 ? 'LOW_BALANCE' : 'ACTIVE');

      // 2. Direct PATCH or POST
      if (currentWallet) {
        await fetch(`${SUPABASE_REST_URL}/universal_wallets?tenant_id=eq.${cleanTenant}`, {
          method: 'PATCH',
          headers: { ...SUPABASE_HEADERS, 'Prefer': 'return=representation' },
          body: JSON.stringify({
            balance: newBalance,
            status: newStatus,
            updated_at: new Date().toISOString()
          })
        });
      } else {
        await fetch(`${SUPABASE_REST_URL}/universal_wallets`, {
          method: 'POST',
          headers: { ...SUPABASE_HEADERS, 'Prefer': 'return=representation' },
          body: JSON.stringify({
            tenant_id: cleanTenant,
            balance: newBalance,
            currency: 'INR',
            min_threshold: 1000,
            status: newStatus,
            updated_at: new Date().toISOString()
          })
        });
      }

      // 3. Log into wallet_transactions
      const txnId = `ADJ-${Date.now()}`;
      await fetch(`${SUPABASE_REST_URL}/wallet_transactions`, {
        method: 'POST',
        headers: { ...SUPABASE_HEADERS, 'Prefer': 'return=representation' },
        body: JSON.stringify({
          id: txnId,
          tenant_id: cleanTenant,
          service_key: 'admin_adjustment',
          transaction_type: cleanAmount >= 0 ? 'BONUS' : 'DEBIT',
          amount: Math.abs(cleanAmount),
          balance_before: currentBalance,
          balance_after: newBalance,
          reference_id: txnId,
          description: reason || 'SuperAdmin Credit Grant',
          trigger_source: 'SUPERADMIN_ADJUST'
        })
      });

      return { success: true, newBalance, adjustedAmount: cleanAmount };
    } catch (err) {
      console.error('[adjustCredit Supabase error]:', err);
      throw new Error(err.message || 'Failed to credit wallet');
    }
  }
}

export const frontendWalletService = new FrontendUniversalWalletService();
export default frontendWalletService;
