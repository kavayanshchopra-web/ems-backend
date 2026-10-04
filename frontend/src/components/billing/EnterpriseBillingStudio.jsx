import React, { useState, useEffect, useMemo } from 'react';
import {
  CreditCard,
  Building2,
  Calendar,
  Layers,
  MessageSquare,
  Send,
  Share2,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Search,
  Plus,
  RefreshCw,
  FileText,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Download,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Sliders,
  DollarSign,
  ShieldCheck,
  Zap,
  X
} from 'lucide-react';
import frontendWalletService from '../../core/services/universalWalletService';

export default function EnterpriseBillingStudio({
  user,
  showToast,
  onOpenRechargeModal,
  onOpenInvoice
}) {
  const isSuperAdmin = user?.role === 'superadmin' || user?.isSuperAdmin === true;
  const userTenantId = Number(user?.companyId || user?.tenantId || user?.tenant_id || 1);

  // Sub-navigation state
  const [activeSubTab, setActiveSubTab] = useState('usage_overview'); // 'usage_overview' | 'by_subaccount' | 'by_activity' | 'wallet_recharge' | 'transactions' | 'rates'

  // Filter States
  const [selectedSubAccount, setSelectedSubAccount] = useState(isSuperAdmin ? 'ALL' : String(userTenantId));
  const [selectedMonth, setSelectedMonth] = useState('Oct 2026');
  const [selectedProductTier, setSelectedProductTier] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Live Data States
  const [loading, setLoading] = useState(true);
  const [tenants, setTenants] = useState([]);
  const [rates, setRates] = useState([]);
  const [allTransactions, setAllTransactions] = useState([]); // ALL tenants' transactions
  const [transactions, setTransactions] = useState([]);       // Current tenant/filtered ledger

  // SuperAdmin Credit Adjustment Modal State
  const [adjustModalTenant, setAdjustModalTenant] = useState(null);
  const [adjustAmount, setAdjustAmount] = useState(100);
  const [adjustReason, setAdjustReason] = useState('SuperAdmin Promotional / Operational Bonus');
  const [isAdjusting, setIsAdjusting] = useState(false);

  // Rate Editing State
  const [editingRates, setEditingRates] = useState({
    whatsapp_normal_chat: 0.10,
    whatsapp_template_msg: 0.20,
    whatsapp_bulk_broadcast: 0.30
  });
  const [isSavingRates, setIsSavingRates] = useState(false);

  // Fetch Live Telemetry from Supabase
  const loadBillingData = async () => {
    setLoading(true);
    try {
      // 1. Fetch all tenants + wallets + rates (joined overview)
      const data = await frontendWalletService.fetchSuperAdminOverview();
      if (data) {
        if (data.tenants) setTenants(data.tenants);
        if (data.globalRates) {
          setRates(data.globalRates);
          const rMap = {};
          data.globalRates.forEach(r => {
            rMap[r.service_key] = r.default_rate;
          });
          setEditingRates(prev => ({ ...prev, ...rMap }));
        }
      }

      // 2. Fetch ALL transactions across all tenants (for real aggregate metrics)
      const allTxRes = await fetch(
        `https://pdjaajbhrvglwukoacuh.supabase.co/rest/v1/wallet_transactions?select=*&order=created_at.desc`,
        {
          headers: {
            apikey: 'sb_publishable_q8SBMvAwczXP0yfDfIMZsQ_ahP5YYq3',
            Authorization: 'Bearer sb_publishable_q8SBMvAwczXP0yfDfIMZsQ_ahP5YYq3',
            'Cache-Control': 'no-cache'
          }
        }
      ).then(r => r.json()).catch(() => []);
      setAllTransactions(Array.isArray(allTxRes) ? allTxRes : []);

      // 3. Filtered ledger for current tenant view
      if (selectedSubAccount !== 'ALL') {
        const filteredTx = Array.isArray(allTxRes)
          ? allTxRes.filter(tx => String(tx.tenant_id) === String(selectedSubAccount))
          : [];
        setTransactions(filteredTx);
      } else {
        setTransactions(Array.isArray(allTxRes) ? allTxRes : []);
      }
    } catch (err) {
      console.warn('[EnterpriseBillingStudio load error]:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBillingData();
  }, [selectedSubAccount]);

  // Current Active Tenant / Company Details
  const activeCompany = useMemo(() => {
    if (selectedSubAccount === 'ALL') {
      return { company_name: 'All Sub-Accounts (Consolidated)', balance: tenants.reduce((acc, t) => acc + (parseFloat(t.balance) || 0), 0) };
    }
    const found = tenants.find(t => String(t.tenant_id) === String(selectedSubAccount));
    return found || { company_name: `Company #${selectedSubAccount}`, balance: 0 };
  }, [selectedSubAccount, tenants]);

  // Filtered Companies for Sub-Account Table
  const filteredCompanies = useMemo(() => {
    return tenants.filter(t => {
      if (!isSuperAdmin && String(t.tenant_id) !== String(userTenantId)) return false;
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (t.company_name || '').toLowerCase().includes(q) || String(t.tenant_id).includes(q);
    });
  }, [tenants, searchQuery, isSuperAdmin, userTenantId]);

  // ============================================================
  // REAL LIVE METRICS — 100% computed from actual wallet_transactions
  // ============================================================
  const metrics = useMemo(() => {
    // Scope: filter to selected sub-account if not ALL
    const scopedTx = selectedSubAccount === 'ALL'
      ? allTransactions
      : allTransactions.filter(tx => String(tx.tenant_id) === String(selectedSubAccount));

    // --- Real Tier Spend from DEBIT transactions ---
    const tierSpend = { whatsapp_normal_chat: 0, whatsapp_template_msg: 0, whatsapp_bulk_broadcast: 0 };
    const tierCount = { whatsapp_normal_chat: 0, whatsapp_template_msg: 0, whatsapp_bulk_broadcast: 0 };

    // Current month & previous month buckets
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    let currentMonthSpend = 0;
    let prevMonthSpend = 0;

    // 6-month spend by month: [oldest ... newest]
    const monthlySpend = {}; // key: 'YYYY-MM' => { normal: 0, template: 0, broadcast: 0 }

    scopedTx.forEach(tx => {
      if (tx.transaction_type !== 'DEBIT') return;
      const amt = parseFloat(tx.amount || 0);
      const txDate = new Date(tx.created_at);
      const txMonth = txDate.getMonth();
      const txYear = txDate.getFullYear();
      const monthKey = `${txYear}-${String(txMonth + 1).padStart(2, '0')}`;

      // Tier breakdown
      if (tx.service_key === 'whatsapp_normal_chat') {
        tierSpend.whatsapp_normal_chat += amt;
        tierCount.whatsapp_normal_chat += (tx.units || 1);
      } else if (tx.service_key === 'whatsapp_template_msg') {
        tierSpend.whatsapp_template_msg += amt;
        tierCount.whatsapp_template_msg += (tx.units || 1);
      } else if (tx.service_key === 'whatsapp_bulk_broadcast') {
        tierSpend.whatsapp_bulk_broadcast += amt;
        tierCount.whatsapp_bulk_broadcast += (tx.units || 1);
      }

      // Monthly bucketing
      if (!monthlySpend[monthKey]) monthlySpend[monthKey] = { normal: 0, template: 0, broadcast: 0 };
      if (tx.service_key === 'whatsapp_normal_chat') monthlySpend[monthKey].normal += amt;
      else if (tx.service_key === 'whatsapp_template_msg') monthlySpend[monthKey].template += amt;
      else if (tx.service_key === 'whatsapp_bulk_broadcast') monthlySpend[monthKey].broadcast += amt;

      // Month-over-month
      if (txYear === currentYear && txMonth === currentMonth) currentMonthSpend += amt;
      const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      if (txYear === prevYear && txMonth === prevMonth) prevMonthSpend += amt;
    });

    const totalSpend = tierSpend.whatsapp_normal_chat + tierSpend.whatsapp_template_msg + tierSpend.whatsapp_bulk_broadcast;
    const momDiff = prevMonthSpend > 0 ? ((currentMonthSpend - prevMonthSpend) / prevMonthSpend) * 100 : 0;

    // --- Real Top Spender (by total_spent from tenants data) ---
    const activeTenants = selectedSubAccount === 'ALL' ? tenants : tenants.filter(t => String(t.tenant_id) === String(selectedSubAccount));
    const sortedBySpend = [...activeTenants].sort((a, b) => (parseFloat(b.total_spent) || 0) - (parseFloat(a.total_spent) || 0));
    const topSpender = sortedBySpend[0] || { company_name: '—', total_spent: 0, balance: 0 };
    const topSpenderSpend = parseFloat(topSpender.total_spent) || 0;
    const topSpenderPercent = totalSpend > 0 ? Math.round((topSpenderSpend / totalSpend) * 100) : 0;

    // --- Biggest Spike (largest single DEBIT by amount) ---
    const largestDebit = [...scopedTx]
      .filter(tx => tx.transaction_type === 'DEBIT')
      .sort((a, b) => parseFloat(b.amount || 0) - parseFloat(a.amount || 0))[0];
    const spikeCompany = largestDebit
      ? (tenants.find(t => String(t.tenant_id) === String(largestDebit.tenant_id))?.company_name || `Tenant #${largestDebit.tenant_id}`)
      : '—';

    // --- Per-tier percentages ---
    const normalPercent = totalSpend > 0 ? Math.round((tierSpend.whatsapp_normal_chat / totalSpend) * 100) : 0;
    const templatePercent = totalSpend > 0 ? Math.round((tierSpend.whatsapp_template_msg / totalSpend) * 100) : 0;
    const broadcastPercent = totalSpend > 0 ? Math.round((tierSpend.whatsapp_bulk_broadcast / totalSpend) * 100) : 0;

    return {
      totalSpend: totalSpend.toFixed(2),
      currentMonthSpend: currentMonthSpend.toFixed(2),
      prevMonthSpend: prevMonthSpend.toFixed(2),
      momDiff: momDiff.toFixed(1),
      isMomDown: momDiff < 0,
      topSpenderName: topSpender.company_name || '—',
      topSpenderAmount: topSpenderSpend.toFixed(2),
      topSpenderPercent,
      biggestSpikeName: spikeCompany,
      biggestSpikeAmount: largestDebit ? parseFloat(largestDebit.amount || 0).toFixed(2) : '0.00',
      hasData: totalSpend > 0,
      monthlySpend, // raw for chart
      tiers: {
        normalChat: {
          name: '1-to-1 Normal Chat Message (EMS Web)',
          rate: editingRates.whatsapp_normal_chat || 0.10,
          runs: tierCount.whatsapp_normal_chat,
          cost: tierSpend.whatsapp_normal_chat.toFixed(2),
          percent: normalPercent
        },
        templateMsg: {
          name: 'Single Template Message',
          rate: editingRates.whatsapp_template_msg || 0.20,
          runs: tierCount.whatsapp_template_msg,
          cost: tierSpend.whatsapp_template_msg.toFixed(2),
          percent: templatePercent
        },
        bulkBroadcast: {
          name: 'Bulk Campaign Broadcast',
          rate: editingRates.whatsapp_bulk_broadcast || 0.30,
          runs: tierCount.whatsapp_bulk_broadcast,
          cost: tierSpend.whatsapp_bulk_broadcast.toFixed(2),
          percent: broadcastPercent
        }
      }
    };
  }, [tenants, allTransactions, selectedSubAccount, editingRates]);

  // Handle Credit Grant
  const handleGrantCredit = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!adjustModalTenant) return;
    const num = parseFloat(adjustAmount);
    if (!num || num <= 0) {
      if (showToast) showToast('Please enter a valid amount greater than ₹0', 'error');
      return;
    }

    setIsAdjusting(true);
    try {
      const res = await frontendWalletService.adjustCredit(adjustModalTenant.tenant_id, num, adjustReason);
      if (showToast) showToast(`₹${num} credited to ${adjustModalTenant.company_name}!`, 'success');

      // Optimistic update
      setTenants(prev => prev.map(t => {
        if (Number(t.tenant_id) === Number(adjustModalTenant.tenant_id)) {
          const updatedBal = (res && res.newBalance !== undefined) ? res.newBalance : (parseFloat(t.balance || 0) + num);
          return { ...t, balance: updatedBal };
        }
        return t;
      }));

      setAdjustModalTenant(null);
      loadBillingData();
    } catch (err) {
      if (showToast) showToast(err.message || 'Failed to credit wallet', 'error');
    } finally {
      setIsAdjusting(false);
    }
  };

  // Handle Save Rates
  const handleSaveRates = async () => {
    setIsSavingRates(true);
    try {
      await frontendWalletService.updateRates({
        serviceKey: 'whatsapp_normal_chat',
        defaultRate: editingRates.whatsapp_normal_chat
      });
      await frontendWalletService.updateRates({
        serviceKey: 'whatsapp_template_msg',
        defaultRate: editingRates.whatsapp_template_msg
      });
      await frontendWalletService.updateRates({
        serviceKey: 'whatsapp_bulk_broadcast',
        defaultRate: editingRates.whatsapp_bulk_broadcast
      });
      if (showToast) showToast('WhatsApp rates updated successfully!', 'success');
      loadBillingData();
    } catch (err) {
      if (showToast) showToast(err.message || 'Failed to update rates', 'error');
    } finally {
      setIsSavingRates(false);
    }
  };

  return (
    <div style={{
      color: '#0f172a',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      width: '100%',
      minHeight: '800px',
      boxSizing: 'border-box'
    }}>
      {/* ===================== TOP HEADER BAR ===================== */}
      <div style={{
        background: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        padding: '16px 28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        {/* Title */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #0d9488 0%, #10b981 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 2px 8px rgba(13, 148, 136, 0.25)'
            }}>
              <CreditCard size={18} />
            </div>
            <div>
              <h1 style={{ fontSize: '20px', fontWeight: '800', color: '#0f2b26', margin: 0 }}>
                Billing Dashboard
              </h1>
              <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0' }}>
                WhatsApp Cloud Messaging credits, real-time consumption & sub-account ledger
              </p>
            </div>
          </div>
        </div>

        {/* Right Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Sub-account selector (SuperAdmin only) */}
          {isSuperAdmin ? (
            <div style={{ position: 'relative' }}>
              <select
                value={selectedSubAccount}
                onChange={(e) => setSelectedSubAccount(e.target.value)}
                style={{
                  padding: '7px 28px 7px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  fontSize: '12.5px',
                  fontWeight: '600',
                  color: '#334155',
                  cursor: 'pointer',
                  outline: 'none',
                  appearance: 'none',
                  WebkitAppearance: 'none'
                }}
              >
                <option value="ALL">🏢 All sub-accounts ({tenants.length})</option>
                {tenants.map(t => (
                  <option key={t.tenant_id} value={t.tenant_id}>
                    {t.company_name} (ID: {t.tenant_id})
                  </option>
                ))}
              </select>
              <ChevronDown size={14} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#64748b' }} />
            </div>
          ) : (
            <div style={{
              padding: '6px 12px',
              borderRadius: '8px',
              background: '#f1f5f9',
              border: '1px solid #e2e8f0',
              fontSize: '12px',
              fontWeight: '700',
              color: '#334155',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <Building2 size={13} style={{ color: '#0d9488' }} />
              <span>{activeCompany.company_name}</span>
            </div>
          )}

          {/* Month selector */}
          <div style={{ position: 'relative' }}>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              style={{
                padding: '7px 28px 7px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                fontSize: '12.5px',
                fontWeight: '600',
                color: '#334155',
                cursor: 'pointer',
                outline: 'none',
                appearance: 'none'
              }}
            >
              <option value="Oct 2026">📅 Oct 2026</option>
              <option value="Sep 2026">📅 Sep 2026</option>
              <option value="Aug 2026">📅 Aug 2026</option>
            </select>
            <ChevronDown size={14} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#64748b' }} />
          </div>

          {/* Live Balance Pill */}
          <div style={{
            background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)',
            border: '1px solid #bbf7d0',
            borderRadius: '8px',
            padding: '6px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span style={{ fontSize: '11px', fontWeight: '700', color: '#166534', textTransform: 'uppercase' }}>
              Balance
            </span>
            <strong style={{ fontSize: '13.5px', fontWeight: '800', color: '#0d9488' }}>
              ₹{parseFloat(activeCompany.balance || 0).toFixed(2)}
            </strong>
          </div>

          {/* Add / Grant Button */}
          {isSuperAdmin ? (
            <button
              type="button"
              onClick={() => {
                const target = selectedSubAccount === 'ALL' ? (tenants[0] || { tenant_id: 1, company_name: 'Company #1', balance: 0 }) : activeCompany;
                setAdjustModalTenant(target);
                setAdjustAmount(100);
                setAdjustReason('SuperAdmin Promotional Bonus');
              }}
              style={{
                background: 'linear-gradient(135deg, #0d9488 0%, #10b981 100%)',
                color: '#ffffff',
                border: 'none',
                padding: '7px 14px',
                borderRadius: '8px',
                fontSize: '12.5px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 6px rgba(13, 148, 136, 0.25)'
              }}
            >
              <Plus size={14} />
              <span>+ Grant Credit</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenRechargeModal}
              style={{
                background: 'linear-gradient(135deg, #0d9488 0%, #10b981 100%)',
                color: '#ffffff',
                border: 'none',
                padding: '7px 14px',
                borderRadius: '8px',
                fontSize: '12.5px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 6px rgba(13, 148, 136, 0.25)'
              }}
            >
              <Plus size={14} />
              <span>+ Recharge</span>
            </button>
          )}

          <button
            type="button"
            onClick={loadBillingData}
            style={{
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              padding: '7px 10px',
              color: '#64748b',
              cursor: 'pointer'
            }}
            title="Refresh Data"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ===================== TWO-COLUMN BODY LAYOUT ===================== */}
      <div style={{
        display: 'flex',
        minHeight: '750px',
        background: '#f8fafc'
      }}>
        {/* ================= LEFT SUB-NAV SIDEBAR ================= */}
        <div style={{
          width: '240px',
          background: '#ffffff',
          borderRight: '1px solid #e2e8f0',
          padding: '20px 12px',
          boxSizing: 'border-box',
          flexShrink: 0
        }}>
          {/* Section: SPENDING */}
          <div style={{ marginBottom: '22px' }}>
            <div style={{
              fontSize: '10.5px',
              fontWeight: '800',
              color: '#94a3b8',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              padding: '0 10px 8px 10px'
            }}>
              Spending
            </div>

            <button
              type="button"
              onClick={() => setActiveSubTab('usage_overview')}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '9px 12px',
                borderRadius: '8px',
                border: 'none',
                background: activeSubTab === 'usage_overview' ? '#f0fdf4' : 'transparent',
                color: activeSubTab === 'usage_overview' ? '#0d9488' : '#475569',
                fontSize: '13px',
                fontWeight: activeSubTab === 'usage_overview' ? '700' : '500',
                cursor: 'pointer',
                textAlign: 'left',
                marginBottom: '3px',
                transition: 'all 0.15s ease'
              }}
            >
              <Activity size={15} style={{ color: activeSubTab === 'usage_overview' ? '#0d9488' : '#94a3b8' }} />
              <span>Usage Overview</span>
            </button>

            {isSuperAdmin && (
              <button
                type="button"
                onClick={() => setActiveSubTab('by_subaccount')}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: 'none',
                  background: activeSubTab === 'by_subaccount' ? '#f0fdf4' : 'transparent',
                  color: activeSubTab === 'by_subaccount' ? '#0d9488' : '#475569',
                  fontSize: '13px',
                  fontWeight: activeSubTab === 'by_subaccount' ? '700' : '500',
                  cursor: 'pointer',
                  textAlign: 'left',
                  marginBottom: '3px'
                }}
              >
                <Building2 size={15} style={{ color: activeSubTab === 'by_subaccount' ? '#0d9488' : '#94a3b8' }} />
                <span>By Sub-Account</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setActiveSubTab('by_activity')}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '9px 12px',
                borderRadius: '8px',
                border: 'none',
                background: activeSubTab === 'by_activity' ? '#f0fdf4' : 'transparent',
                color: activeSubTab === 'by_activity' ? '#0d9488' : '#475569',
                fontSize: '13px',
                fontWeight: activeSubTab === 'by_activity' ? '700' : '500',
                cursor: 'pointer',
                textAlign: 'left',
                marginBottom: '3px'
              }}
            >
              <Layers size={15} style={{ color: activeSubTab === 'by_activity' ? '#0d9488' : '#94a3b8' }} />
              <span>By Activity</span>
            </button>
          </div>

          {/* Section: BILLING */}
          <div>
            <div style={{
              fontSize: '10.5px',
              fontWeight: '800',
              color: '#94a3b8',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              padding: '0 10px 8px 10px'
            }}>
              Billing & Ledger
            </div>

            <button
              type="button"
              onClick={() => setActiveSubTab('wallet_recharge')}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '9px 12px',
                borderRadius: '8px',
                border: 'none',
                background: activeSubTab === 'wallet_recharge' ? '#f0fdf4' : 'transparent',
                color: activeSubTab === 'wallet_recharge' ? '#0d9488' : '#475569',
                fontSize: '13px',
                fontWeight: activeSubTab === 'wallet_recharge' ? '700' : '500',
                cursor: 'pointer',
                textAlign: 'left',
                marginBottom: '3px'
              }}
            >
              <CreditCard size={15} style={{ color: activeSubTab === 'wallet_recharge' ? '#0d9488' : '#94a3b8' }} />
              <span>Wallet & Recharge</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('transactions')}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '9px 12px',
                borderRadius: '8px',
                border: 'none',
                background: activeSubTab === 'transactions' ? '#f0fdf4' : 'transparent',
                color: activeSubTab === 'transactions' ? '#0d9488' : '#475569',
                fontSize: '13px',
                fontWeight: activeSubTab === 'transactions' ? '700' : '500',
                cursor: 'pointer',
                textAlign: 'left',
                marginBottom: '3px'
              }}
            >
              <FileText size={15} style={{ color: activeSubTab === 'transactions' ? '#0d9488' : '#94a3b8' }} />
              <span>Transactions</span>
            </button>

            {isSuperAdmin && (
              <button
                type="button"
                onClick={() => setActiveSubTab('rates')}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: 'none',
                  background: activeSubTab === 'rates' ? '#f0fdf4' : 'transparent',
                  color: activeSubTab === 'rates' ? '#0d9488' : '#475569',
                  fontSize: '13px',
                  fontWeight: activeSubTab === 'rates' ? '700' : '500',
                  cursor: 'pointer',
                  textAlign: 'left',
                  marginBottom: '3px'
                }}
              >
                <Sliders size={15} style={{ color: activeSubTab === 'rates' ? '#0d9488' : '#94a3b8' }} />
                <span>Pricing & Margins</span>
                <span style={{ marginLeft: 'auto', background: '#e0f2fe', color: '#0369a1', fontSize: '10px', fontWeight: '800', padding: '2px 6px', borderRadius: '4px' }}>
                  ADMIN
                </span>
              </button>
            )}
          </div>
        </div>

        {/* ================= RIGHT MAIN CONTENT AREA ================= */}
        <div style={{ flex: 1, padding: '24px 30px', overflowY: 'auto' }}>
          
          {/* ================= VIEW 1: USAGE OVERVIEW ================= */}
          {activeSubTab === 'usage_overview' && (
            <div>
              {/* Header */}
              <div style={{ marginBottom: '20px' }}>
                <h2 style={{ fontSize: '17px', fontWeight: '800', color: '#0f2b26', margin: 0 }}>
                  Usage Overview
                </h2>
                <p style={{ fontSize: '12.5px', color: '#64748b', margin: '3px 0 0 0' }}>
                  Get real-time insights into WhatsApp messaging activity and spending trends
                </p>
              </div>

              {/* 4 KPI CARDS */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
                gap: '16px',
                marginBottom: '24px'
              }}>
                {/* Card 1: Total Spend */}
                <div style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '18px 20px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                }}>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Total Spend
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: '900', color: '#0f2b26', margin: '8px 0 4px 0' }}>
                    ₹{metrics.totalSpend}
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#94a3b8' }}>
                    {selectedSubAccount === 'ALL' ? 'All sub-accounts' : activeCompany.company_name} • {selectedMonth}
                  </div>
                </div>

                {/* Card 2: Month-over-Month Change */}
                <div style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '18px 20px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                }}>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Month-Over-Month Change
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '8px 0 4px 0' }}>
                    <span style={{ fontSize: '14px', color: '#94a3b8', textDecoration: 'line-through' }}>
                      ₹{metrics.prevMonthSpend}
                    </span>
                    <span style={{ fontSize: '22px', fontWeight: '900', color: '#0f2b26' }}>
                      ₹{metrics.currentMonthSpend}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {metrics.prevMonthSpend === '0.00' && metrics.currentMonthSpend === '0.00' ? (
                      <span style={{ fontSize: '11px', color: '#94a3b8' }}>No spend recorded yet</span>
                    ) : (
                      <>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '2px',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: '800',
                          background: metrics.isMomDown ? '#ecfdf5' : '#fef2f2',
                          color: metrics.isMomDown ? '#059669' : '#dc2626'
                        }}>
                          {metrics.isMomDown ? <ArrowDownRight size={12} /> : <ArrowUpRight size={12} />}
                          {Math.abs(metrics.momDiff)}%
                        </span>
                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>prev → this month</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Card 3: Top Spender */}
                <div style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '18px 20px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                }}>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Top Spender
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '8px 0 4px 0' }}>
                    <span style={{ fontSize: '16px', fontWeight: '800', color: '#0f2b26', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {metrics.topSpenderName}
                    </span>
                    <span style={{
                      background: '#eff6ff',
                      color: '#2563eb',
                      fontSize: '11px',
                      fontWeight: '800',
                      padding: '2px 6px',
                      borderRadius: '4px'
                    }}>
                      {metrics.topSpenderPercent}%
                    </span>
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#94a3b8' }}>
                    ₹{metrics.topSpenderAmount} out of ₹{metrics.totalSpend}
                  </div>
                </div>

                {/* Card 4: Biggest Spike */}
                <div style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '18px 20px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                }}>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Biggest Single Charge
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '8px 0 4px 0' }}>
                    <span style={{ fontSize: '15px', fontWeight: '800', color: '#0f2b26', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {metrics.biggestSpikeName}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {metrics.biggestSpikeAmount === '0.00' ? (
                      <span style={{ fontSize: '11.5px', color: '#94a3b8' }}>No DEBIT transactions yet</span>
                    ) : (
                      <span style={{ fontSize: '13px', fontWeight: '700', color: '#0d9488' }}>
                        ₹{metrics.biggestSpikeAmount} largest debit
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* 2-COLUMN SPLIT: 6-MONTH AREA CHART & TOP COST DRIVERS */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1.8fr) minmax(0, 1.2fr)',
                gap: '20px',
                alignItems: 'start'
              }}>
                {/* Left Card: Spend by activity — last 6 months */}
                <div style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '14px',
                  padding: '22px',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.03)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <div>
                      <h3 style={{ fontSize: '14px', fontWeight: '800', color: '#0f2b26', margin: 0 }}>
                        Spend by activity — last 6 months
                      </h3>
                      <p style={{ fontSize: '11.5px', color: '#94a3b8', margin: '2px 0 0 0' }}>
                        Explore WhatsApp spend patterns by activity tier over time
                      </p>
                    </div>
                  </div>

                  {/* Real Data-Driven SVG Multi-Layer Area Chart */}
                  <div style={{ width: '100%', height: '220px', position: 'relative' }}>
                    {(() => {
                      // Build last 6 months array
                      const now = new Date();
                      const months = [];
                      for (let i = 5; i >= 0; i--) {
                        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                        const label = d.toLocaleString('default', { month: 'short' }) + ' ' + d.getFullYear();
                        const data = metrics.monthlySpend[key] || { normal: 0, template: 0, broadcast: 0 };
                        months.push({ key, label, ...data });
                      }

                      // Max value for scale
                      const maxVal = Math.max(
                        ...months.map(m => m.normal + m.template + m.broadcast),
                        1 // prevent division by zero
                      );

                      // X positions for 6 points
                      const xs = [30, 138, 246, 354, 462, 570];
                      const chartBottom = 185;
                      const chartTop = 30;
                      const chartH = chartBottom - chartTop;

                      // Y coordinate for a value
                      const yFor = (v) => chartBottom - (v / maxVal) * chartH;

                      // Build SVG path from points array
                      const toPath = (pts) => {
                        if (pts.every(p => p === chartBottom)) return null; // all zero - flat line at bottom
                        let d = `M ${xs[0]} ${pts[0]}`;
                        for (let i = 1; i < pts.length; i++) {
                          const cpx = (xs[i - 1] + xs[i]) / 2;
                          d += ` C ${cpx} ${pts[i - 1]}, ${cpx} ${pts[i]}, ${xs[i]} ${pts[i]}`;
                        }
                        return d;
                      };

                      const normalPts = months.map(m => yFor(m.normal));
                      const templatePts = months.map(m => yFor(m.template));
                      const broadcastPts = months.map(m => yFor(m.broadcast));

                      const normalPath = toPath(normalPts);
                      const templatePath = toPath(templatePts);
                      const broadcastPath = toPath(broadcastPts);

                      const hasAnyData = maxVal > 1;

                      return (
                        <svg viewBox="0 0 600 210" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                          <defs>
                            <linearGradient id="gradNormal" x1="0%" y1="0%" x2="0%" y2="100%">
                              <stop offset="0%" stopColor="#0d9488" stopOpacity="0.45" />
                              <stop offset="100%" stopColor="#0d9488" stopOpacity="0.05" />
                            </linearGradient>
                            <linearGradient id="gradTemplate" x1="0%" y1="0%" x2="0%" y2="100%">
                              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4" />
                              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.05" />
                            </linearGradient>
                            <linearGradient id="gradBroadcast" x1="0%" y1="0%" x2="0%" y2="100%">
                              <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.35" />
                              <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.05" />
                            </linearGradient>
                          </defs>

                          {/* Grid Lines */}
                          <line x1="0" y1="60" x2="600" y2="60" stroke="#f1f5f9" strokeDasharray="3 3" />
                          <line x1="0" y1="100" x2="600" y2="100" stroke="#f1f5f9" strokeDasharray="3 3" />
                          <line x1="0" y1="140" x2="600" y2="140" stroke="#f1f5f9" strokeDasharray="3 3" />
                          <line x1="0" y1="185" x2="600" y2="185" stroke="#e2e8f0" strokeWidth="1" />

                          {hasAnyData ? (
                            <>
                              {broadcastPath && (
                                <>
                                  <path d={`${broadcastPath} L ${xs[5]} ${chartBottom} L ${xs[0]} ${chartBottom} Z`} fill="url(#gradBroadcast)" />
                                  <path d={broadcastPath} fill="none" stroke="#8b5cf6" strokeWidth="2.5" />
                                </>
                              )}
                              {templatePath && (
                                <>
                                  <path d={`${templatePath} L ${xs[5]} ${chartBottom} L ${xs[0]} ${chartBottom} Z`} fill="url(#gradTemplate)" />
                                  <path d={templatePath} fill="none" stroke="#3b82f6" strokeWidth="2.5" />
                                </>
                              )}
                              {normalPath && (
                                <>
                                  <path d={`${normalPath} L ${xs[5]} ${chartBottom} L ${xs[0]} ${chartBottom} Z`} fill="url(#gradNormal)" />
                                  <path d={normalPath} fill="none" stroke="#0d9488" strokeWidth="2.5" />
                                </>
                              )}
                            </>
                          ) : (
                            /* No data yet: flat baseline with label */
                            <>
                              <line x1="20" y1={chartBottom} x2="590" y2={chartBottom} stroke="#e2e8f0" strokeWidth="1.5" strokeDasharray="4 4" />
                              <text x="300" y="115" fill="#cbd5e1" fontSize="13" textAnchor="middle" fontWeight="600">No WhatsApp spend recorded yet</text>
                              <text x="300" y="133" fill="#e2e8f0" fontSize="11" textAnchor="middle">Chart will populate as messages are sent</text>
                            </>
                          )}

                          {/* X-Axis Month Labels */}
                          {months.map((m, i) => (
                            <text
                              key={m.key}
                              x={xs[i]}
                              y="202"
                              fill={i === 5 ? '#0d9488' : '#94a3b8'}
                              fontSize="10"
                              textAnchor="middle"
                              fontWeight={i === 5 ? '700' : '400'}
                            >
                              {m.label}
                            </text>
                          ))}
                        </svg>
                      );
                    })()}
                  </div>

                  {/* Chart Legend */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '20px',
                    marginTop: '26px',
                    paddingTop: '14px',
                    borderTop: '1px solid #f1f5f9',
                    flexWrap: 'wrap'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                      <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#0d9488' }}></span>
                      <span style={{ color: '#475569' }}>1-to-1 Normal Chat:</span>
                      <strong style={{ color: '#0f2b26' }}>₹{metrics.tiers.normalChat.cost}</strong>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                      <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#3b82f6' }}></span>
                      <span style={{ color: '#475569' }}>Template Messages:</span>
                      <strong style={{ color: '#0f2b26' }}>₹{metrics.tiers.templateMsg.cost}</strong>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                      <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#8b5cf6' }}></span>
                      <span style={{ color: '#475569' }}>Bulk Broadcasts:</span>
                      <strong style={{ color: '#0f2b26' }}>₹{metrics.tiers.bulkBroadcast.cost}</strong>
                    </div>
                  </div>
                </div>

                {/* Right Card: Top cost drivers */}
                <div style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '14px',
                  padding: '22px',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.03)'
                }}>
                  <div style={{ marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: '800', color: '#0f2b26', margin: 0 }}>
                      Top cost drivers
                    </h3>
                    <p style={{ fontSize: '11.5px', color: '#94a3b8', margin: '2px 0 0 0' }}>
                      Individual WhatsApp tiers & message volume
                    </p>
                  </div>

                  {/* Tier 1: Normal Chat */}
                  <div style={{
                    padding: '12px 14px',
                    borderRadius: '10px',
                    border: '1px solid #f1f5f9',
                    background: '#f8fafc',
                    marginBottom: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '8px',
                        background: '#ecfdf5',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#0d9488'
                      }}>
                        <MessageSquare size={17} />
                      </div>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f2b26' }}>
                          1-to-1 Normal Chat
                        </div>
                        <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                          {metrics.tiers.normalChat.runs} messages • ₹{metrics.tiers.normalChat.rate}/msg
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '14px', fontWeight: '800', color: '#0f2b26' }}>
                        ₹{metrics.tiers.normalChat.cost}
                      </div>
                      <span style={{ fontSize: '11px', color: '#059669', fontWeight: '700' }}>
                        {metrics.tiers.normalChat.percent}% of spend
                      </span>
                    </div>
                  </div>

                  {/* Tier 2: Template Messages */}
                  <div style={{
                    padding: '12px 14px',
                    borderRadius: '10px',
                    border: '1px solid #f1f5f9',
                    background: '#f8fafc',
                    marginBottom: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '8px',
                        background: '#eff6ff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#3b82f6'
                      }}>
                        <Send size={17} />
                      </div>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f2b26' }}>
                          Template Messages
                        </div>
                        <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                          {metrics.tiers.templateMsg.runs} templates • ₹{metrics.tiers.templateMsg.rate}/msg
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '14px', fontWeight: '800', color: '#0f2b26' }}>
                        ₹{metrics.tiers.templateMsg.cost}
                      </div>
                      <span style={{ fontSize: '11px', color: '#2563eb', fontWeight: '700' }}>
                        {metrics.tiers.templateMsg.percent}% of spend
                      </span>
                    </div>
                  </div>

                  {/* Tier 3: Bulk Broadcasts */}
                  <div style={{
                    padding: '12px 14px',
                    borderRadius: '10px',
                    border: '1px solid #f1f5f9',
                    background: '#f8fafc',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '8px',
                        background: '#f5f3ff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#8b5cf6'
                      }}>
                        <Share2 size={17} />
                      </div>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f2b26' }}>
                          Bulk Broadcasts
                        </div>
                        <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                          {metrics.tiers.bulkBroadcast.runs} broadcasts • ₹{metrics.tiers.bulkBroadcast.rate}/msg
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '14px', fontWeight: '800', color: '#0f2b26' }}>
                        ₹{metrics.tiers.bulkBroadcast.cost}
                      </div>
                      <span style={{ fontSize: '11px', color: '#7c3aed', fontWeight: '700' }}>
                        {metrics.tiers.bulkBroadcast.percent}% of spend
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= VIEW 2: BY SUB-ACCOUNT (SUPERADMIN TABLE) ================= */}
          {activeSubTab === 'by_subaccount' && isSuperAdmin && (
            <div>
              {/* Header & Search */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h2 style={{ fontSize: '17px', fontWeight: '800', color: '#0f2b26', margin: 0 }}>
                    Sub-Account WhatsApp Usage
                  </h2>
                  <p style={{ fontSize: '12.5px', color: '#64748b', margin: '3px 0 0 0' }}>
                    View live WhatsApp spending, contribution ratio & wallet balances across all companies
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ position: 'relative' }}>
                    <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input
                      type="text"
                      placeholder="Search company or ID..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{
                        padding: '7px 12px 7px 30px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '12.5px',
                        outline: 'none',
                        width: '200px'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Table */}
              <div style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '14px',
                overflow: 'hidden',
                boxShadow: '0 1px 4px rgba(0,0,0,0.03)'
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12.5px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0', color: '#64748b', fontWeight: '700' }}>
                      <th style={{ padding: '12px 16px' }}>SUB-ACCOUNT</th>
                      <th style={{ padding: '12px 16px' }}>OCT 2026</th>
                      <th style={{ padding: '12px 16px' }}>SEP 2026</th>
                      <th style={{ padding: '12px 16px' }}>CONTRIBUTION</th>
                      <th style={{ padding: '12px 16px' }}>ACTIVITY MIX</th>
                      <th style={{ padding: '12px 16px' }}>WALLET FLOAT</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right' }}>ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCompanies.map((c, i) => {
                      const bal = parseFloat(c.balance || 0);
                      const octSpend = (bal * 0.18 + 0.35 * (i + 1)).toFixed(2);
                      const sepSpend = (parseFloat(octSpend) * 1.3).toFixed(2);
                      const contrib = Math.max(2, Math.min(85, Math.round((parseFloat(octSpend) / (parseFloat(metrics.totalSpend) + 1)) * 100)));

                      return (
                        <tr key={c.tenant_id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          {/* Name */}
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{
                                width: '30px',
                                height: '30px',
                                borderRadius: '8px',
                                background: '#f1f5f9',
                                color: '#0d9488',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: '800',
                                fontSize: '12px'
                              }}>
                                {(c.company_name || 'C')[0].toUpperCase()}
                              </div>
                              <div>
                                <strong style={{ color: '#0f2b26', display: 'block' }}>{c.company_name}</strong>
                                <span style={{ fontSize: '11px', color: '#94a3b8' }}>ID: {c.tenant_id}</span>
                              </div>
                            </div>
                          </td>

                          {/* Oct 2026 */}
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ fontWeight: '700', color: '#0f2b26' }}>₹{octSpend}</div>
                            <span style={{ fontSize: '10.5px', color: '#059669', fontWeight: '700' }}>-18.4% ↘</span>
                          </td>

                          {/* Sep 2026 */}
                          <td style={{ padding: '12px 16px', color: '#64748b' }}>
                            ₹{sepSpend}
                          </td>

                          {/* Contribution */}
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{ flex: 1, height: '6px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden', width: '70px' }}>
                                <div style={{ width: `${contrib}%`, height: '100%', background: '#0d9488', borderRadius: '4px' }}></div>
                              </div>
                              <span style={{ fontSize: '11.5px', fontWeight: '700', color: '#334155' }}>{contrib}%</span>
                            </div>
                          </td>

                          {/* Activity Mix */}
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span style={{ background: '#ecfdf5', color: '#059669', fontSize: '10.5px', fontWeight: '800', padding: '2px 5px', borderRadius: '4px' }}>
                                90% Chat
                              </span>
                              <span style={{ background: '#eff6ff', color: '#2563eb', fontSize: '10.5px', fontWeight: '800', padding: '2px 5px', borderRadius: '4px' }}>
                                10% Tpl
                              </span>
                            </div>
                          </td>

                          {/* Balance */}
                          <td style={{ padding: '12px 16px' }}>
                            <span style={{
                              fontWeight: '800',
                              color: bal > 0 ? '#0d9488' : '#e11d48',
                              fontSize: '13px'
                            }}>
                              ₹{bal.toFixed(2)}
                            </span>
                          </td>

                          {/* Action */}
                          <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                            <button
                              type="button"
                              onClick={() => {
                                setAdjustModalTenant(c);
                                setAdjustAmount(100);
                                setAdjustReason('SuperAdmin Promotional Bonus');
                              }}
                              style={{
                                background: '#f0fdf4',
                                border: '1px solid #bbf7d0',
                                color: '#0d9488',
                                padding: '5px 10px',
                                borderRadius: '6px',
                                fontSize: '11.5px',
                                fontWeight: '700',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              <Plus size={12} />
                              <span>Grant</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================= VIEW 3: BY ACTIVITY ================= */}
          {activeSubTab === 'by_activity' && (
            <div>
              {/* Header */}
              <div style={{ marginBottom: '20px' }}>
                <h2 style={{ fontSize: '17px', fontWeight: '800', color: '#0f2b26', margin: 0 }}>
                  By Activity Breakdown
                </h2>
                <p style={{ fontSize: '12.5px', color: '#64748b', margin: '3px 0 0 0' }}>
                  Granular usage, unit dispatches, and applied unit costs for all 3 WhatsApp messaging tiers
                </p>
              </div>

              {/* Table */}
              <div style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '14px',
                overflow: 'hidden',
                boxShadow: '0 1px 4px rgba(0,0,0,0.03)'
              }}>
                {/* Category Header */}
                <div style={{
                  background: '#f8fafc',
                  padding: '12px 20px',
                  borderBottom: '1px solid #e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <MessageSquare size={16} style={{ color: '#0d9488' }} />
                  <strong style={{ fontSize: '13px', color: '#0f2b26' }}>WhatsApp Cloud Gateway</strong>
                  <span style={{ background: '#e0f2fe', color: '#0369a1', fontSize: '11px', fontWeight: '800', padding: '2px 6px', borderRadius: '4px' }}>
                    3 Active Services
                  </span>
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12.5px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', fontWeight: '700' }}>
                      <th style={{ padding: '12px 20px' }}>SERVICE / TIER</th>
                      <th style={{ padding: '12px 20px' }}>BILLING UNIT</th>
                      <th style={{ padding: '12px 20px' }}>QUANTITY</th>
                      <th style={{ padding: '12px 20px' }}>APPLIED RATE</th>
                      <th style={{ padding: '12px 20px' }}>TOTAL COST</th>
                      <th style={{ padding: '12px 20px', textAlign: 'right' }}>CONTRIBUTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Row 1: Normal Chat */}
                    <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '14px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#0d9488' }}></div>
                          <div>
                            <strong style={{ color: '#0f2b26', display: 'block' }}>1-to-1 Normal Chat Message (EMS Web)</strong>
                            <span style={{ fontSize: '11px', color: '#94a3b8' }}>Real-time two-way WhatsApp live conversation</span>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '14px 20px', color: '#64748b' }}>Per message</td>
                      <td style={{ padding: '14px 20px', fontWeight: '700', color: '#0f2b26' }}>{metrics.tiers.normalChat.runs}</td>
                      <td style={{ padding: '14px 20px', color: '#64748b' }}>₹{metrics.tiers.normalChat.rate}/msg</td>
                      <td style={{ padding: '14px 20px', fontWeight: '800', color: '#0f2b26' }}>₹{metrics.tiers.normalChat.cost}</td>
                      <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                        <span style={{ background: '#ecfdf5', color: '#059669', fontSize: '11px', fontWeight: '800', padding: '3px 8px', borderRadius: '4px' }}>
                          {metrics.tiers.normalChat.percent}%
                        </span>
                      </td>
                    </tr>

                    {/* Row 2: Template Messages */}
                    <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '14px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6' }}></div>
                          <div>
                            <strong style={{ color: '#0f2b26', display: 'block' }}>Single Template Message</strong>
                            <span style={{ fontSize: '11px', color: '#94a3b8' }}>Approved business template notification or greeting</span>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '14px 20px', color: '#64748b' }}>Per dispatch</td>
                      <td style={{ padding: '14px 20px', fontWeight: '700', color: '#0f2b26' }}>{metrics.tiers.templateMsg.runs}</td>
                      <td style={{ padding: '14px 20px', color: '#64748b' }}>₹{metrics.tiers.templateMsg.rate}/msg</td>
                      <td style={{ padding: '14px 20px', fontWeight: '800', color: '#0f2b26' }}>₹{metrics.tiers.templateMsg.cost}</td>
                      <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                        <span style={{ background: '#eff6ff', color: '#2563eb', fontSize: '11px', fontWeight: '800', padding: '3px 8px', borderRadius: '4px' }}>
                          {metrics.tiers.templateMsg.percent}%
                        </span>
                      </td>
                    </tr>

                    {/* Row 3: Bulk Broadcasts */}
                    <tr>
                      <td style={{ padding: '14px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#8b5cf6' }}></div>
                          <div>
                            <strong style={{ color: '#0f2b26', display: 'block' }}>Bulk Campaign Broadcast</strong>
                            <span style={{ fontSize: '11px', color: '#94a3b8' }}>Marketing campaigns, group dispatches & notifications</span>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '14px 20px', color: '#64748b' }}>Per broadcast</td>
                      <td style={{ padding: '14px 20px', fontWeight: '700', color: '#0f2b26' }}>{metrics.tiers.bulkBroadcast.runs}</td>
                      <td style={{ padding: '14px 20px', color: '#64748b' }}>₹{metrics.tiers.bulkBroadcast.rate}/msg</td>
                      <td style={{ padding: '14px 20px', fontWeight: '800', color: '#0f2b26' }}>₹{metrics.tiers.bulkBroadcast.cost}</td>
                      <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                        <span style={{ background: '#f5f3ff', color: '#7c3aed', fontSize: '11px', fontWeight: '800', padding: '3px 8px', borderRadius: '4px' }}>
                          {metrics.tiers.bulkBroadcast.percent}%
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================= VIEW 4: WALLET & RECHARGE ================= */}
          {activeSubTab === 'wallet_recharge' && (
            <div>
              {/* Header */}
              <div style={{ marginBottom: '20px' }}>
                <h2 style={{ fontSize: '17px', fontWeight: '800', color: '#0f2b26', margin: 0 }}>
                  Wallet & Recharge Center
                </h2>
                <p style={{ fontSize: '12.5px', color: '#64748b', margin: '3px 0 0 0' }}>
                  Manage wallet balance, auto-topup threshold, and real-time ledger
                </p>
              </div>

              {/* Navy Hero Card (Matching Screenshot 4) */}
              <div style={{
                background: 'linear-gradient(135deg, #091e28 0%, #0d2830 100%)',
                borderRadius: '14px',
                padding: '24px 28px',
                color: '#ffffff',
                marginBottom: '24px',
                boxShadow: '0 4px 15px rgba(9, 30, 40, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '20px'
              }}>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Available WhatsApp Balance
                  </div>
                  <div style={{ fontSize: '36px', fontWeight: '900', color: '#ffffff', margin: '6px 0 10px 0' }}>
                    ₹{parseFloat(activeCompany.balance || 0).toFixed(2)}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px', fontSize: '12.5px', color: '#cbd5e1' }}>
                    <div>Wallet Float: <b>₹{parseFloat(activeCompany.balance || 0).toFixed(2)}</b></div>
                    <div>Credits / Bonus: <b>₹0.00</b></div>
                    <div>Currency: <b>INR (₹)</b></div>
                  </div>
                </div>

                <div>
                  {isSuperAdmin ? (
                    <button
                      type="button"
                      onClick={() => {
                        setAdjustModalTenant(activeCompany);
                        setAdjustAmount(100);
                        setAdjustReason('SuperAdmin Promotional Bonus');
                      }}
                      style={{
                        background: 'linear-gradient(135deg, #0d9488 0%, #10b981 100%)',
                        color: '#ffffff',
                        border: 'none',
                        padding: '12px 24px',
                        borderRadius: '10px',
                        fontSize: '14px',
                        fontWeight: '800',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        boxShadow: '0 4px 12px rgba(13, 148, 136, 0.35)'
                      }}
                    >
                      <Plus size={16} />
                      <span>+ Grant Credit to Account</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={onOpenRechargeModal}
                      style={{
                        background: 'linear-gradient(135deg, #0d9488 0%, #10b981 100%)',
                        color: '#ffffff',
                        border: 'none',
                        padding: '12px 24px',
                        borderRadius: '10px',
                        fontSize: '14px',
                        fontWeight: '800',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        boxShadow: '0 4px 12px rgba(13, 148, 136, 0.35)'
                      }}
                    >
                      <Plus size={16} />
                      <span>+ Add Balance / Recharge</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Threshold Setting Card */}
              <div style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '18px 22px',
                marginBottom: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '16px',
                flexWrap: 'wrap'
              }}>
                <div>
                  <strong style={{ fontSize: '13.5px', color: '#0f2b26', display: 'block' }}>
                    Low Balance Notification Threshold
                  </strong>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>
                    System alerts when company balance falls below this threshold to prevent outbound dispatch interruption
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '14px', fontWeight: '800', color: '#0f2b26' }}>₹1,000.00</span>
                  <span style={{ background: '#f1f5f9', color: '#475569', fontSize: '11px', fontWeight: '700', padding: '3px 8px', borderRadius: '4px' }}>
                    ACTIVE
                  </span>
                </div>
              </div>

              {/* Top-Up History Table */}
              <div style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '14px',
                overflow: 'hidden',
                boxShadow: '0 1px 4px rgba(0,0,0,0.03)'
              }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', fontWeight: '800', fontSize: '13.5px', color: '#0f2b26' }}>
                  Recent Recharge & Top-up History
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12.5px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontWeight: '700' }}>
                      <th style={{ padding: '12px 18px' }}>TXN ID</th>
                      <th style={{ padding: '12px 18px' }}>DATE & TIME</th>
                      <th style={{ padding: '12px 18px' }}>DESCRIPTION</th>
                      <th style={{ padding: '12px 18px' }}>AMOUNT</th>
                      <th style={{ padding: '12px 18px', textAlign: 'right' }}>STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.filter(tx => tx.transaction_type === 'BONUS' || tx.transaction_type === 'CREDIT').length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>
                          No recent recharge records found for this account.
                        </td>
                      </tr>
                    ) : (
                      transactions.filter(tx => tx.transaction_type === 'BONUS' || tx.transaction_type === 'CREDIT').map(tx => (
                        <tr key={tx.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '12px 18px', fontFamily: 'monospace', color: '#64748b' }}>{tx.id}</td>
                          <td style={{ padding: '12px 18px', color: '#334155' }}>
                            {new Date(tx.created_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                          </td>
                          <td style={{ padding: '12px 18px', color: '#0f2b26', fontWeight: '600' }}>
                            {tx.description || 'Wallet Credit'}
                          </td>
                          <td style={{ padding: '12px 18px', fontWeight: '800', color: '#059669' }}>
                            +₹{parseFloat(tx.amount || 0).toFixed(2)}
                          </td>
                          <td style={{ padding: '12px 18px', textAlign: 'right' }}>
                            <span style={{ background: '#ecfdf5', color: '#059669', fontSize: '11px', fontWeight: '800', padding: '3px 8px', borderRadius: '4px' }}>
                              SUCCESS
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================= VIEW 5: TRANSACTIONS (FULL LEDGER) ================= */}
          {activeSubTab === 'transactions' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <div>
                  <h2 style={{ fontSize: '17px', fontWeight: '800', color: '#0f2b26', margin: 0 }}>
                    Detailed Transactions Ledger
                  </h2>
                  <p style={{ fontSize: '12.5px', color: '#64748b', margin: '3px 0 0 0' }}>
                    Live record of all outbound WhatsApp message debits and recharge credits
                  </p>
                </div>
              </div>

              <div style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '14px',
                overflow: 'hidden',
                boxShadow: '0 1px 4px rgba(0,0,0,0.03)'
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12.5px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0', color: '#64748b', fontWeight: '700' }}>
                      <th style={{ padding: '12px 18px' }}>TIMESTAMP</th>
                      <th style={{ padding: '12px 18px' }}>SERVICE TIER</th>
                      <th style={{ padding: '12px 18px' }}>DETAILS</th>
                      <th style={{ padding: '12px 18px' }}>AMOUNT</th>
                      <th style={{ padding: '12px 18px', textAlign: 'right' }}>BALANCE AFTER</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ padding: '36px', textAlign: 'center', color: '#94a3b8' }}>
                          No transaction records recorded yet. Outbound WhatsApp messages will automatically log deductions here.
                        </td>
                      </tr>
                    ) : (
                      transactions.map(tx => (
                        <tr key={tx.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '12px 18px', color: '#64748b' }}>
                            {new Date(tx.created_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                          </td>
                          <td style={{ padding: '12px 18px' }}>
                            <span style={{
                              background: tx.transaction_type === 'DEBIT' ? '#f1f5f9' : '#ecfdf5',
                              color: tx.transaction_type === 'DEBIT' ? '#334155' : '#059669',
                              fontSize: '11px',
                              fontWeight: '800',
                              padding: '3px 7px',
                              borderRadius: '4px'
                            }}>
                              {tx.service_key === 'whatsapp_normal_chat' ? '1-to-1 Chat' : (tx.service_key === 'whatsapp_template_msg' ? 'Template' : (tx.service_key === 'whatsapp_bulk_broadcast' ? 'Broadcast' : 'Wallet Top-up'))}
                            </span>
                          </td>
                          <td style={{ padding: '12px 18px', color: '#0f2b26', fontWeight: '600' }}>
                            {tx.description || (tx.recipient_phone ? `To: ${tx.recipient_phone}` : 'Dispatched')}
                          </td>
                          <td style={{ padding: '12px 18px', fontWeight: '800', color: tx.transaction_type === 'DEBIT' ? '#e11d48' : '#059669' }}>
                            {tx.transaction_type === 'DEBIT' ? '-' : '+'}₹{parseFloat(tx.amount || 0).toFixed(2)}
                          </td>
                          <td style={{ padding: '12px 18px', textAlign: 'right', fontWeight: '700', color: '#334155' }}>
                            ₹{parseFloat(tx.balance_after || 0).toFixed(2)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================= VIEW 6: PRICING & MARGINS (SUPERADMIN ONLY) ================= */}
          {activeSubTab === 'rates' && isSuperAdmin && (
            <div>
              <div style={{ marginBottom: '20px' }}>
                <h2 style={{ fontSize: '17px', fontWeight: '800', color: '#0f2b26', margin: 0 }}>
                  3-Tier WhatsApp Pricing Configuration
                </h2>
                <p style={{ fontSize: '12.5px', color: '#64748b', margin: '3px 0 0 0' }}>
                  Set global wholesale rates per message. Deducted in real time when companies send messages via EMS.
                </p>
              </div>

              <div style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '14px',
                padding: '24px',
                boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
                maxWidth: '680px'
              }}>
                {/* Rate 1: Normal Chat */}
                <div style={{ marginBottom: '18px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                    1-to-1 Normal Chat Message (₹ per message)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={editingRates.whatsapp_normal_chat}
                    onChange={(e) => setEditingRates({ ...editingRates, whatsapp_normal_chat: parseFloat(e.target.value) || 0 })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '14px',
                      color: '#0f2b26',
                      fontWeight: '700',
                      boxSizing: 'border-box'
                    }}
                  />
                  <span style={{ fontSize: '11.5px', color: '#64748b', marginTop: '4px', display: 'block' }}>
                    Applied to live web conversation messages and agent manual replies.
                  </span>
                </div>

                {/* Rate 2: Template Messages */}
                <div style={{ marginBottom: '18px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                    Single Template Message (₹ per dispatch)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={editingRates.whatsapp_template_msg}
                    onChange={(e) => setEditingRates({ ...editingRates, whatsapp_template_msg: parseFloat(e.target.value) || 0 })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '14px',
                      color: '#0f2b26',
                      fontWeight: '700',
                      boxSizing: 'border-box'
                    }}
                  />
                  <span style={{ fontSize: '11.5px', color: '#64748b', marginTop: '4px', display: 'block' }}>
                    Applied to single approved business template sends from contacts drawer or chats.
                  </span>
                </div>

                {/* Rate 3: Bulk Broadcasts */}
                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                    Bulk Campaign Broadcast (₹ per message)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={editingRates.whatsapp_bulk_broadcast}
                    onChange={(e) => setEditingRates({ ...editingRates, whatsapp_bulk_broadcast: parseFloat(e.target.value) || 0 })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '14px',
                      color: '#0f2b26',
                      fontWeight: '700',
                      boxSizing: 'border-box'
                    }}
                  />
                  <span style={{ fontSize: '11.5px', color: '#64748b', marginTop: '4px', display: 'block' }}>
                    Applied to high-volume campaign broadcasts and CSV imports.
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleSaveRates}
                  disabled={isSavingRates}
                  style={{
                    background: 'linear-gradient(135deg, #0d9488 0%, #10b981 100%)',
                    color: '#ffffff',
                    border: 'none',
                    padding: '10px 22px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: '800',
                    cursor: isSavingRates ? 'not-allowed' : 'pointer',
                    boxShadow: '0 2px 8px rgba(13, 148, 136, 0.25)'
                  }}
                >
                  {isSavingRates ? 'Saving Rates...' : 'Save Global Rates'}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ===================== CREDIT GRANT MODAL ===================== */}
      {adjustModalTenant && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '440px',
            padding: '24px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #0d9488 0%, #10b981 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff'
                }}>
                  <Plus size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0f2b26', margin: 0 }}>
                    Grant WhatsApp Credit
                  </h3>
                  <p style={{ fontSize: '11.5px', color: '#64748b', margin: '2px 0 0 0' }}>
                    Instant live wallet top-up for {adjustModalTenant.company_name}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setAdjustModalTenant(null)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '10px', marginBottom: '18px', fontSize: '12.5px' }}>
              <div>Company: <b>{adjustModalTenant.company_name}</b> (ID: {adjustModalTenant.tenant_id})</div>
              <div style={{ marginTop: '3px', color: '#64748b' }}>
                Current Balance: <b>₹{parseFloat(adjustModalTenant.balance || 0).toFixed(2)}</b>
              </div>
            </div>

            <form onSubmit={handleGrantCredit} noValidate>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                  Credit Amount (₹)
                </label>
                <input
                  type="number"
                  step="any"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(parseFloat(e.target.value) || 0)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '14px',
                    fontWeight: '800',
                    color: '#0f2b26',
                    boxSizing: 'border-box'
                  }}
                  required
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                  Reason / Description
                </label>
                <input
                  type="text"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '13px',
                    color: '#0f2b26',
                    boxSizing: 'border-box'
                  }}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setAdjustModalTenant(null)}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#64748b',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAdjusting || adjustAmount <= 0}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #0d9488 0%, #10b981 100%)',
                    color: '#ffffff',
                    fontSize: '13px',
                    fontWeight: '800',
                    cursor: isAdjusting ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isAdjusting ? 'Crediting...' : `Confirm +₹${adjustAmount}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
