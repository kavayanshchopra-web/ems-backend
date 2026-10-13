import React, { useState, useEffect } from 'react';
import {
  Package,
  Layers,
  FileText,
  Truck,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  Clock,
  Send,
  Sliders,
  AlertCircle,
  Database,
  ArrowRight,
  ShieldCheck,
  Zap,
  ShoppingBag,
  Factory
} from 'lucide-react';

export default function SandboxErpHub({ authUser, companyId, apiBase = '/api' }) {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'embedded' | 'automations' | 'modules'
  const [loading, setLoading] = useState(false);
  const [erpStatus, setErpStatus] = useState({
    connected: true,
    engine: 'Odoo 19 Community (Cut-Off Frozen Core)',
    version: '19.0.1.0',
    database: 'omniflow_sandbox_erp (PostgreSQL 16)',
    activeTenant: companyId || 'Tenant 1',
    lastSync: new Date().toLocaleTimeString()
  });

  const [recentOrders, setRecentOrders] = useState([
    {
      id: 'SO-2026-0042',
      customer: 'Sharma Enterprises Pvt Ltd',
      phone: '+919876543210',
      amount: '₹74,500',
      items: 8,
      status: 'Confirmed',
      whatsappStatus: 'Delivered',
      date: 'Today, 11:20 AM'
    },
    {
      id: 'SO-2026-0041',
      customer: 'Apex Logistics & Cargo',
      phone: '+919811223344',
      amount: '₹1,28,000',
      items: 24,
      status: 'Confirmed',
      whatsappStatus: 'Delivered',
      date: 'Today, 09:45 AM'
    },
    {
      id: 'SO-2026-0040',
      customer: 'Delta Medical Supplies',
      phone: '+919988776655',
      amount: '₹32,200',
      items: 4,
      status: 'Draft Quotation',
      whatsappStatus: 'Pending',
      date: 'Yesterday'
    }
  ]);

  const LIVE_ERP_DOMAIN = 'https://erp.employeemanagementsystems.com';
  const FALLBACK_ERP_DOMAIN = 'https://api.employeemanagementsystems.com:8443';
  const [selectedDomain, setSelectedDomain] = useState(LIVE_ERP_DOMAIN);
  const erpDomain = selectedDomain;

  const coreApps = [
    {
      id: 'sales',
      title: 'SALES & ORDERS',
      sub: 'Quotations, Price Lists & Orders',
      icon: ShoppingBag,
      color: '#0d9488',
      bg: 'rgba(13, 148, 136, 0.12)',
      border: 'rgba(13, 148, 136, 0.35)',
      stats: '18 Active Quotations',
      desc: 'Create quotations, confirm orders, and trigger automated WhatsApp notifications to clients.'
    },
    {
      id: 'inventory',
      title: 'INVENTORY & WAREHOUSE',
      sub: 'Stock Tracking, Picking & Delivery',
      icon: Package,
      color: '#3b82f6',
      bg: 'rgba(59, 130, 246, 0.12)',
      border: 'rgba(59, 130, 246, 0.35)',
      stats: '4 Warehouses Active',
      desc: 'Real-time multi-location stock on hand, goods receipts, and delivery tracking.'
    },
    {
      id: 'mrp',
      title: 'MANUFACTURING (MRP)',
      sub: 'Bill of Materials & Work Orders',
      icon: Factory,
      color: '#f59e0b',
      bg: 'rgba(245, 158, 11, 0.12)',
      border: 'rgba(245, 158, 11, 0.35)',
      stats: '12 Production Orders',
      desc: 'Multi-level Bill of Materials (BOM), production planning, and raw material allocations.'
    },
    {
      id: 'invoicing',
      title: 'INVOICING & GST',
      sub: 'IRN E-Invoice & E-Way Bills',
      icon: FileText,
      color: '#10b981',
      bg: 'rgba(16, 185, 129, 0.12)',
      border: 'rgba(16, 185, 129, 0.35)',
      stats: 'NIC API Ready',
      desc: 'Generate government-compliant E-Invoices with signed QR codes and instant E-Way bills.'
    }
  ];

  return (
    <div style={{ padding: '24px', background: '#f8fafc', minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>
      {/* Top Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #0f2b26 0%, #064e43 100%)',
        borderRadius: '18px',
        padding: '24px 28px',
        color: '#ffffff',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 10px 25px -5px rgba(15, 43, 38, 0.25)',
        marginBottom: '24px'
      }}>
        <div style={{ maxWidth: '650px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <span style={{
              background: 'linear-gradient(135deg, #0d9488, #059669)',
              color: '#ffffff',
              fontSize: '11px',
              fontWeight: '800',
              padding: '2px 8px',
              borderRadius: '4px',
              letterSpacing: '0.5px'
            }}>
              ENTERPRISE ERP LIVE
            </span>
            <span style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              color: '#34d399',
              fontWeight: '600'
            }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#34d399', display: 'inline-block' }} />
              Production Connected
            </span>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', margin: '0 0 6px 0', letterSpacing: '-0.3px' }}>
            OmniFlow ERP &amp; Operations Hub
          </h1>
          <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8', lineHeight: '1.5' }}>
            Powered by Odoo 19 Community (Cut-Off Frozen Core). Manage Sales, Inventory, Manufacturing &amp; GST Invoicing with automated WhatsApp customer alerts.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
          <a
            href={erpDomain}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'linear-gradient(135deg, #0d9488 0%, #064e43 100%)',
              color: '#ffffff',
              border: '1px solid rgba(20, 210, 203, 0.4)',
              padding: '10px 18px',
              borderRadius: '10px',
              fontSize: '13px',
              fontWeight: '700',
              textDecoration: 'none',
              boxShadow: '0 4px 12px rgba(13, 148, 136, 0.3)',
              cursor: 'pointer'
            }}
          >
            <span>Launch Fullscreen ERP</span>
            <ExternalLink size={16} />
          </a>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
        {[
          { key: 'overview', label: 'Overview & Apps' },
          { key: 'embedded', label: 'Embedded ERP Window' },
          { key: 'automations', label: 'WhatsApp Order Triggers' }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '13px',
              fontWeight: '700',
              cursor: 'pointer',
              background: activeTab === tab.key ? 'linear-gradient(135deg, #0d9488 0%, #064e43 100%)' : 'transparent',
              color: activeTab === tab.key ? '#ffffff' : '#64748b',
              transition: 'all 0.2s ease'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab Content */}
      {activeTab === 'overview' && (
        <div>
          {/* Core Apps Grid (Odoo Style) */}
          <h2 style={{ fontSize: '15px', fontWeight: '800', color: '#1e293b', marginBottom: '14px', letterSpacing: '0.2px' }}>
            OPERATIONS &amp; ERP MODULES
          </h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: '16px',
            marginBottom: '28px'
          }}>
            {coreApps.map((app) => {
              const Icon = app.icon;
              return (
                <div
                  key={app.id}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '16px',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: '0 2px 8px -2px rgba(15, 43, 38, 0.05)',
                    transition: 'all 0.2s ease',
                    minHeight: '160px'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <div style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '12px',
                        background: app.bg,
                        border: `1px solid ${app.border}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: app.color
                      }}>
                        <Icon size={22} strokeWidth={2.2} />
                      </div>
                      <span style={{ fontSize: '11px', fontWeight: '700', color: '#10b981', background: '#ecfdf5', padding: '2px 8px', borderRadius: '6px' }}>
                        {app.stats}
                      </span>
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: '800', color: '#0f2b26', letterSpacing: '0.2px', marginBottom: '4px' }}>
                      {app.title}
                    </div>
                    <div style={{ fontSize: '11px', fontWeight: '600', color: '#64748b', marginBottom: '8px' }}>
                      {app.sub}
                    </div>
                    <p style={{ fontSize: '12px', color: '#64748b', margin: 0, lineHeight: '1.4' }}>
                      {app.desc}
                    </p>
                  </div>

                  <a
                    href={erpDomain}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      marginTop: '14px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '12px',
                      fontWeight: '700',
                      color: '#0d9488',
                      textDecoration: 'none'
                    }}
                  >
                    <span>Open Module</span>
                    <ArrowRight size={14} />
                  </a>
                </div>
              );
            })}
          </div>

          {/* Recent Sale Orders & WhatsApp Delivery Status */}
          <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '20px', boxShadow: '0 2px 8px -2px rgba(15, 43, 38, 0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#0f2b26', margin: '0 0 4px 0' }}>
                  Recent Orders &amp; WhatsApp Automation Logs
                </h3>
                <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                  Real-time status of orders confirmed in ERP and synced with OmniFlow WhatsApp Engine
                </p>
              </div>
              <button
                onClick={() => setLoading(prev => !prev)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#475569',
                  cursor: 'pointer'
                }}
              >
                <RefreshCw size={14} />
                <span>Refresh Logs</span>
              </button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                    <th style={{ padding: '10px 14px', color: '#475569', fontWeight: '700' }}>Order ID</th>
                    <th style={{ padding: '10px 14px', color: '#475569', fontWeight: '700' }}>Customer</th>
                    <th style={{ padding: '10px 14px', color: '#475569', fontWeight: '700' }}>Phone</th>
                    <th style={{ padding: '10px 14px', color: '#475569', fontWeight: '700' }}>Amount</th>
                    <th style={{ padding: '10px 14px', color: '#475569', fontWeight: '700' }}>ERP Status</th>
                    <th style={{ padding: '10px 14px', color: '#475569', fontWeight: '700' }}>WhatsApp Alert</th>
                    <th style={{ padding: '10px 14px', color: '#475569', fontWeight: '700' }}>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((ord) => (
                    <tr key={ord.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 14px', fontWeight: '700', color: '#0d9488' }}>{ord.id}</td>
                      <td style={{ padding: '12px 14px', fontWeight: '600', color: '#1e293b' }}>{ord.customer}</td>
                      <td style={{ padding: '12px 14px', color: '#64748b' }}>{ord.phone}</td>
                      <td style={{ padding: '12px 14px', fontWeight: '700', color: '#0f2b26' }}>{ord.amount}</td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{
                          background: ord.status === 'Confirmed' ? '#ecfdf5' : '#fef3c7',
                          color: ord.status === 'Confirmed' ? '#065f46' : '#92400e',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: '700'
                        }}>
                          {ord.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          background: ord.whatsappStatus === 'Delivered' ? '#f0fdf4' : '#f8fafc',
                          color: ord.whatsappStatus === 'Delivered' ? '#16a34a' : '#64748b',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: '700'
                        }}>
                          <Send size={12} />
                          {ord.whatsappStatus}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', color: '#94a3b8', fontSize: '12px' }}>{ord.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Embedded Iframe View */}
      {activeTab === 'embedded' && (
        <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <div style={{ padding: '12px 16px', background: '#0f2b26', color: '#ffffff', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '13px', fontWeight: '700' }}>
                OmniFlow Enterprise ERP Workspace
              </span>
              <div style={{ display: 'flex', gap: '6px', background: 'rgba(255,255,255,0.1)', padding: '2px', borderRadius: '6px' }}>
                <button
                  onClick={() => setSelectedDomain(LIVE_ERP_DOMAIN)}
                  style={{
                    border: 'none',
                    background: selectedDomain === LIVE_ERP_DOMAIN ? '#0d9488' : 'transparent',
                    color: '#ffffff',
                    fontSize: '11px',
                    fontWeight: '700',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                  title="Live Subdomain: https://erp.employeemanagementsystems.com"
                >
                  erp.employeemanagementsystems.com
                </button>
                <button
                  onClick={() => setSelectedDomain(FALLBACK_ERP_DOMAIN)}
                  style={{
                    border: 'none',
                    background: selectedDomain === FALLBACK_ERP_DOMAIN ? '#0d9488' : 'transparent',
                    color: '#ffffff',
                    fontSize: '11px',
                    fontWeight: '700',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                  title="Instant SSL Bridge: https://api.employeemanagementsystems.com:8443"
                >
                  api port 8443 (SSL)
                </button>
              </div>
            </div>
            <a
              href={erpDomain}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#14d2cb', fontSize: '12px', fontWeight: '600', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <span>Popout Window ({erpDomain})</span>
              <ExternalLink size={14} />
            </a>
          </div>
          <iframe
            src={erpDomain}
            title="OmniFlow ERP Workspace"
            style={{ width: '100%', height: '750px', border: 'none' }}
          />
        </div>
      )}

      {/* Automations Tab */}
      {activeTab === 'automations' && (
        <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0f2b26', marginBottom: '8px' }}>
            WhatsApp Automation Rules
          </h3>
          <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px' }}>
            When triggers occur in the ERP engine, OmniFlow WhatsApp Engine dispatches instant client alerts using verified WhatsApp templates.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              {
                trigger: 'Sale Order Confirmed (sale.order.state == "sale")',
                action: 'Send Order Confirmation Template with Items & Total to Customer WhatsApp',
                active: true
              },
              {
                trigger: 'Delivery Dispatched (stock.picking.state == "done")',
                action: 'Send Tracking Details & Transporter Vehicle Info to Customer',
                active: true
              },
              {
                trigger: 'GST E-Invoice Generated (account.move.edi_state == "sent")',
                action: 'Send PDF Invoice link with Government IRN & Signed QR Code',
                active: true
              }
            ].map((rule, idx) => (
              <div key={idx} style={{ padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f2b26', marginBottom: '4px' }}>
                    Trigger: <span style={{ fontFamily: 'monospace', color: '#0d9488' }}>{rule.trigger}</span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#475569' }}>
                    Action: {rule.action}
                  </div>
                </div>
                <span style={{ fontSize: '11px', fontWeight: '800', color: '#059669', background: '#ecfdf5', padding: '4px 10px', borderRadius: '6px' }}>
                  ACTIVE
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
