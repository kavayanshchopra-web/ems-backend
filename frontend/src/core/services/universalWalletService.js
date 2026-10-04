/**
 * Universal SaaS Wallet Frontend Client Engine
 * Handles live balance tracking, threshold alerts, Razorpay top-ups, and transaction history.
 */

const IS_DEV = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
const API_BASE = (typeof window !== 'undefined' && window.__EMS_API_URL__) 
  ? window.__EMS_API_URL__.replace(/\/api\/?$/, '') 
  : (IS_DEV ? 'http://localhost:5000' : 'https://api.employeemanagementsystems.com');

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
    try {
      const res = await fetch(`${API_BASE}/api/wallet/status?tenantId=${tenantId}`, {
        headers: this.getAuthHeaders(tenantId)
      });
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      return data;
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
    try {
      const res = await fetch(`${API_BASE}/api/wallet/ledger?tenantId=${tenantId}&limit=${limit}&offset=${offset}`, {
        headers: this.getAuthHeaders(tenantId)
      });
      if (!res.ok) throw new Error('Failed to load wallet ledger');
      return await res.json();
    } catch (err) {
      console.warn('[Wallet Ledger Notice]:', err.message);
      return { transactions: [], totalCount: 0 };
    }
  }

  async fetchSuperAdminOverview() {
    const res = await fetch(`${API_BASE}/api/superadmin/wallet/overview`, {
      headers: this.getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to load SuperAdmin wallet overview');
    return await res.json();
  }

  async updateRates(payload) {
    const res = await fetch(`${API_BASE}/api/superadmin/wallet/rates`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to update rates');
    return await res.json();
  }

  async adjustCredit(tenantId, amount, reason) {
    const res = await fetch(`${API_BASE}/api/superadmin/wallet/adjust-credit`, {
      method: 'POST',
      headers: this.getAuthHeaders(tenantId),
      body: JSON.stringify({ tenantId, amount, reason })
    });
    if (!res.ok) throw new Error('Failed to adjust credit');
    return await res.json();
  }
}

export const frontendWalletService = new FrontendUniversalWalletService();
export default frontendWalletService;
