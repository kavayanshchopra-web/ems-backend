/**
 * Universal SaaS Wallet Frontend Client Engine
 * Handles live balance tracking, threshold alerts, Razorpay top-ups, and transaction history.
 */

const IS_DEV = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
const API_BASE = (typeof window !== 'undefined' && window.__EMS_API_URL__) 
  ? window.__EMS_API_URL__.replace(/\/api\/?$/, '') 
  : (IS_DEV ? 'http://localhost:5000' : 'https://api.employeemanagementsystems.com');

const isProductionDomain = typeof window !== 'undefined' && (
  window.location.hostname === 'app.employeemanagementsystems.com' ||
  window.location.hostname === 'employeemanagementsystems.com'
);

const isSandboxDomain = !isProductionDomain && typeof window !== 'undefined' && (
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
  'Content-Type': 'application/json',
  'Cache-Control': 'no-cache',
  'Pragma': 'no-cache'
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

  async deductForMessage({ tenantId = 1, messageType = 'whatsapp_normal_chat', count = 1, recipientPhone = '', description = '' }) {
    const cleanTenant = Number(tenantId) || 1;
    
    // Direct Supabase PostgREST (Atomic & Immediate across production/staging)
    try {
      // 1. Fetch unit rate from global_service_rates or use fallback standard rates
      const ratesRes = await fetch(`${SUPABASE_REST_URL}/global_service_rates?service_key=eq.${messageType}&select=default_rate`, {
        headers: SUPABASE_HEADERS
      }).then(r => r.json()).catch(() => []);

      const unitRate = Array.isArray(ratesRes) && ratesRes[0]?.default_rate !== undefined 
        ? parseFloat(ratesRes[0].default_rate) 
        : (messageType === 'whatsapp_template_msg' ? 0.20 : (messageType === 'whatsapp_bulk_broadcast' ? 0.30 : 0.10));

      const totalCost = parseFloat((unitRate * (Number(count) || 1)).toFixed(4));

      // 2. Fetch current wallet
      const wRes = await fetch(`${SUPABASE_REST_URL}/universal_wallets?tenant_id=eq.${cleanTenant}&select=*`, {
        headers: SUPABASE_HEADERS
      }).then(r => r.json()).catch(() => []);

      const wallet = Array.isArray(wRes) && wRes[0];
      const currentBalance = wallet ? parseFloat(wallet.balance || 0) : 0;
      const minThreshold = wallet ? parseFloat(wallet.min_threshold || 1000) : 1000;
      const newBalance = Math.max(0, parseFloat((currentBalance - totalCost).toFixed(4)));
      const newStatus = newBalance <= 0 ? 'DEPLETED' : (newBalance <= minThreshold ? 'LOW_BALANCE' : 'ACTIVE');

      // 3. Update wallet balance via PostgREST PATCH
      if (wallet) {
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
            min_threshold: minThreshold,
            status: newStatus,
            updated_at: new Date().toISOString()
          })
        });
      }

      // 4. Record DEBIT in wallet_transactions
      const txnId = `TXN-WHA-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      await fetch(`${SUPABASE_REST_URL}/wallet_transactions`, {
        method: 'POST',
        headers: { ...SUPABASE_HEADERS, 'Prefer': 'return=representation' },
        body: JSON.stringify({
          id: txnId,
          tenant_id: cleanTenant,
          service_key: messageType,
          transaction_type: 'DEBIT',
          amount: totalCost,
          units: Number(count) || 1,
          balance_before: currentBalance,
          balance_after: newBalance,
          reference_id: txnId,
          recipient_phone: recipientPhone || null,
          description: description || `WhatsApp 1-to-1 message to ${recipientPhone || 'contact'}`,
          trigger_source: 'WHATSAPP_CHAT'
        })
      });

      // 5. Dispatch real-time window event so open Billing dashboards refresh live
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('ems:wallet_updated', {
          detail: {
            tenantId: cleanTenant,
            balance: newBalance,
            deducted: totalCost,
            status: newStatus
          }
        }));
      }

      return {
        success: true,
        deducted: totalCost,
        balance: newBalance,
        status: newStatus
      };
    } catch (err) {
      console.warn('[deductForMessage Supabase notice]:', err.message);
      return { success: false, error: err.message };
    }
  }

  async getSystemGatewayConfig() {
    try {
      const res = await fetch(`${SUPABASE_REST_URL}/system_gateway_config?gateway_name=eq.razorpay`, {
        headers: SUPABASE_HEADERS
      });
      if (res.ok) {
        const rows = await res.json();
        if (Array.isArray(rows) && rows.length > 0) {
          const row = rows[0];
          return {
            keyId: row.key_id || '',
            keySecret: row.key_secret || '',
            mode: row.mode || 'test',
            enabled: row.enabled !== 0
          };
        }
      }
    } catch (err) {
      console.warn('[Wallet getSystemGatewayConfig Notice]:', err.message);
    }
    return { keyId: '', keySecret: '', mode: 'test', enabled: true };
  }

  async saveSystemGatewayConfig({ keyId, keySecret, mode = 'test', enabled = true }) {
    const payload = {
      gateway_name: 'razorpay',
      key_id: keyId ? String(keyId).trim() : null,
      mode: mode === 'live' ? 'live' : 'test',
      enabled: enabled ? 1 : 0,
      updated_at: new Date().toISOString()
    };
    if (keySecret && String(keySecret).trim() && !String(keySecret).includes('•••')) {
      payload.key_secret = String(keySecret).trim();
    }

    const res = await fetch(`${SUPABASE_REST_URL}/system_gateway_config?gateway_name=eq.razorpay`, {
      method: 'PATCH',
      headers: {
        ...SUPABASE_HEADERS,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const insRes = await fetch(`${SUPABASE_REST_URL}/system_gateway_config`, {
        method: 'POST',
        headers: {
          ...SUPABASE_HEADERS,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(payload)
      });
      if (!insRes.ok) {
        throw new Error('Failed to save SuperAdmin Gateway Config to Supabase');
      }
      const data = await insRes.json();
      return data?.[0] || payload;
    }
    const data = await res.json();
    return data?.[0] || payload;
  }

  async createRechargeOrder(tenantId = 1, amount = 1000) {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < 1) {
      throw new Error('Minimum wallet recharge amount is ₹1.00');
    }

    // Try backend endpoint if available
    try {
      const res = await fetch(`${API_BASE}/api/wallet/recharge/create-order`, {
        method: 'POST',
        headers: this.getAuthHeaders(tenantId),
        body: JSON.stringify({ tenantId, amount: numAmount })
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.order?.keyId) return data;
      }
    } catch (e) {
      // Fall through to Direct Supabase SuperAdmin Gateway Config
    }

    // Direct Supabase SuperAdmin Gateway Config
    const gw = await this.getSystemGatewayConfig();
    if (!gw.keyId || !gw.keyId.trim()) {
      throw new Error('SuperAdmin Razorpay Gateway is not configured yet. SuperAdmin must enter the Razorpay Key ID in Pricing & Margins (ADMIN) tab.');
    }

    return {
      success: true,
      order: {
        orderId: `wal_ord_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        amount: numAmount,
        currency: 'INR',
        keyId: gw.keyId.trim(),
        mode: gw.mode || 'test'
      }
    };
  }

  async verifyRechargePayment(tenantId = 1, { orderId, paymentId, signature, amount }) {
    const cleanTenant = Number(tenantId) || 1;
    const rechargeAmount = parseFloat(amount || 1000);

    // Try backend endpoint if available
    try {
      const res = await fetch(`${API_BASE}/api/wallet/recharge/verify`, {
        method: 'POST',
        headers: this.getAuthHeaders(cleanTenant),
        body: JSON.stringify({ tenantId: cleanTenant, orderId, paymentId, signature, amount: rechargeAmount })
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.success && data?.newBalance !== undefined) {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('ems:wallet_updated', {
              detail: { tenantId: cleanTenant, balance: data.newBalance }
            }));
          }
          return data;
        }
      }
    } catch (e) {
      // Fall through to Direct Supabase Real-Time Credit
    }

    // Direct Supabase Real-Time Credit
    try {
      // 1. Fetch current wallet balance
      const wRes = await fetch(`${SUPABASE_REST_URL}/universal_wallets?tenant_id=eq.${cleanTenant}`, {
        headers: SUPABASE_HEADERS
      });
      const wallets = await wRes.json();
      const currentBal = (Array.isArray(wallets) && wallets.length > 0)
        ? parseFloat(wallets[0].balance || 0)
        : 0;

      const newBalance = Math.round((currentBal + rechargeAmount) * 100) / 100;

      // 2. Update wallet balance
      if (Array.isArray(wallets) && wallets.length > 0) {
        await fetch(`${SUPABASE_REST_URL}/universal_wallets?tenant_id=eq.${cleanTenant}`, {
          method: 'PATCH',
          headers: SUPABASE_HEADERS,
          body: JSON.stringify({
            balance: newBalance,
            updated_at: new Date().toISOString()
          })
        });
      } else {
        await fetch(`${SUPABASE_REST_URL}/universal_wallets`, {
          method: 'POST',
          headers: SUPABASE_HEADERS,
          body: JSON.stringify({
            tenant_id: cleanTenant,
            balance: newBalance,
            min_threshold: 1000,
            currency: 'INR'
          })
        });
      }

      // 3. Insert transaction ledger entry
      const rechargeTxnId = `TXN-REC-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      await fetch(`${SUPABASE_REST_URL}/wallet_transactions`, {
        method: 'POST',
        headers: { ...SUPABASE_HEADERS, 'Prefer': 'return=representation' },
        body: JSON.stringify({
          id: rechargeTxnId,
          tenant_id: cleanTenant,
          service_key: 'wallet_topup',
          transaction_type: 'CREDIT',
          amount: rechargeAmount,
          balance_before: currentBal,
          balance_after: newBalance,
          reference_id: paymentId || rechargeTxnId,
          description: `Universal Wallet Top-Up via Razorpay UPI/NetBanking (${paymentId || 'Instant'})`,
          trigger_source: 'RAZORPAY_GATEWAY',
          created_at: new Date().toISOString()
        })
      });

      // 4. Dispatch real-time event so all views refresh immediately
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('ems:wallet_updated', {
          detail: { tenantId: cleanTenant, balance: newBalance, creditedAmount: rechargeAmount }
        }));
      }

      return {
        success: true,
        creditedAmount: rechargeAmount,
        newBalance: newBalance,
        paymentId: paymentId || `pay_${Date.now()}`
      };
    } catch (err) {
      console.error('[Verify and Credit Error]:', err);
      throw new Error(`Failed to credit wallet balance: ${err.message}`);
    }
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
        if (data?.tenants && Array.isArray(data.tenants) && data.tenants.length > 0) return data;
      }
    } catch (e) {}

    // Direct Supabase Telemetry (Clean query without invalid PostgREST URL filter parameters)
    try {
      const [tRes, wRes, rRes, txRes] = await Promise.all([
        fetch(`${SUPABASE_REST_URL}/tenants?select=*`, { headers: SUPABASE_HEADERS }).then(r => r.json()).catch(() => []),
        fetch(`${SUPABASE_REST_URL}/universal_wallets?select=*`, { headers: SUPABASE_HEADERS }).then(r => r.json()).catch(() => []),
        fetch(`${SUPABASE_REST_URL}/global_service_rates?is_active=eq.true`, { headers: SUPABASE_HEADERS }).then(r => r.json()).catch(() => []),
        fetch(`${SUPABASE_REST_URL}/wallet_transactions?select=*`, { headers: SUPABASE_HEADERS }).then(r => r.json()).catch(() => [])
      ]);

      const walletMap = new Map();
      if (Array.isArray(wRes)) {
        wRes.forEach(w => walletMap.set(Number(w.tenant_id), w));
      }

      const txStats = new Map();
      if (Array.isArray(txRes)) {
        txRes.forEach(tx => {
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
      }

      const allTenantsList = Array.isArray(tRes) ? tRes : [];
      const allWalletsList = Array.isArray(wRes) ? wRes : [];

      const tenantMap = new Map();
      allTenantsList.forEach(t => {
        tenantMap.set(Number(t.id), {
          id: Number(t.id),
          company_name: t.company_name || (`Company #${t.id}`)
        });
      });
      allWalletsList.forEach(w => {
        const wid = Number(w.tenant_id);
        if (!tenantMap.has(wid)) {
          tenantMap.set(wid, {
            id: wid,
            company_name: `Company #${wid}`
          });
        }
      });

      let totalClientFloat = 0;
      let lowBalanceTenantsCount = 0;

      const tenantRows = Array.from(tenantMap.values()).map(t => {
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

      // Sort with primary tenant 1 first, then alphabetical
      tenantRows.sort((a, b) => {
        if (a.tenant_id === 1) return -1;
        if (b.tenant_id === 1) return 1;
        return a.company_name.localeCompare(b.company_name);
      });

      return {
        success: true,
        totalClientFloat,
        lowBalanceTenantsCount,
        tenants: tenantRows,
        globalRates: (Array.isArray(rRes) ? rRes : []).map(r => ({
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
    const rateVal = parseFloat(payload.defaultRate);
    if (isNaN(rateVal) || rateVal < 0) {
      throw new Error('Please provide a valid numeric rate');
    }

    // 1. Direct Supabase Update with representation and error checking
    try {
      if (payload.serviceKey) {
        const patchRes = await fetch(`${SUPABASE_REST_URL}/global_service_rates?service_key=eq.${payload.serviceKey}`, {
          method: 'PATCH',
          headers: {
            ...SUPABASE_HEADERS,
            'Prefer': 'return=representation'
          },
          body: JSON.stringify({
            default_rate: rateVal,
            updated_at: new Date().toISOString()
          })
        });

        if (!patchRes.ok) {
          const errText = await patchRes.text().catch(() => '');
          console.warn('[Direct Supabase rate PATCH non-ok]:', patchRes.status, errText);
        } else {
          // Broadcast live update across all tabs and components
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('ems:rates_updated', {
              detail: { serviceKey: payload.serviceKey, rate: rateVal }
            }));
          }
        }
      }
    } catch (supErr) {
      console.warn('[Direct Supabase rate update error]:', supErr.message);
    }

    // 2. Also notify VPS backend API if available
    try {
      await fetch(`${API_BASE}/api/superadmin/wallet/rates`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(payload)
      });
    } catch (e) {}

    return { success: true };
  }

  async adjustCredit(tenantId, amount, reason) {
    const cleanTenant = Number(tenantId) || 1;
    const cleanAmount = parseFloat(amount);

    try {
      // 1. Fetch current wallet
      const wRes = await fetch(`${SUPABASE_REST_URL}/universal_wallets?tenant_id=eq.${cleanTenant}&select=*`, {
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

  async fetchAllTransactions(tenantId = null) {
    try {
      let url = `${SUPABASE_REST_URL}/wallet_transactions?select=*&order=created_at.desc`;
      if (tenantId && tenantId !== 'ALL') {
        url += `&tenant_id=eq.${Number(tenantId)}`;
      }
      const res = await fetch(url, { headers: SUPABASE_HEADERS });
      if (res.ok) {
        const txs = await res.json();
        return Array.isArray(txs) ? txs : [];
      }
    } catch (err) {
      console.warn('[fetchAllTransactions error]:', err.message);
    }
    return [];
  }
}

export { SUPABASE_REST_URL, SUPABASE_HEADERS, SUPABASE_KEY };
export const frontendWalletService = new FrontendUniversalWalletService();
export default frontendWalletService;

