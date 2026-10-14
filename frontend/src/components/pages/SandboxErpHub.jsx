import React, { useState } from 'react';
import {
  ShoppingBag,
  FileText,
  Package,
  TrendingUp,
  Plus,
  Send,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  Zap,
  Sparkles,
  Layers
} from 'lucide-react';

export default function SandboxErpHub({ authUser, companyId, apiBase = '/api' }) {
  const [activeSubTab, setActiveSubTab] = useState('sales');

  const nativeModules = [
    {
      id: 'sales',
      title: 'Sales & Quotations',
      desc: 'Create quotations, convert to confirmed orders, and dispatch instant PDF links to clients via WhatsApp.',
      icon: ShoppingBag,
      color: '#0d9488',
      bg: 'rgba(13, 148, 136, 0.1)',
      count: '18 Active',
      status: 'Ready'
    },
    {
      id: 'invoicing',
      title: 'Invoicing & GST',
      desc: 'Government-compliant GST invoices with automatic CGST, SGST, IGST calculations and instant PDF generation.',
      icon: FileText,
      color: '#10b981',
      bg: 'rgba(16, 185, 129, 0.1)',
      count: 'GST Compliant',
      status: 'Ready'
    },
    {
      id: 'inventory',
      title: 'Inventory & Stock',
      desc: 'Real-time multi-location warehouse stock, automated re-order points, and instant stock deduction upon order confirm.',
      icon: Package,
      color: '#3b82f6',
      bg: 'rgba(59, 130, 246, 0.1)',
      count: '4 Warehouses',
      status: 'Ready'
    }
  ];

  return (
    <div style={{ padding: '24px', background: '#f8fafc', minHeight: 'calc(100vh - 58px)', fontFamily: 'Inter, sans-serif' }}>
      {/* Top Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #0f2b26 0%, #064e43 100%)',
        borderRadius: '16px',
        padding: '24px 28px',
        color: '#ffffff',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 10px 25px -5px rgba(15, 43, 38, 0.25)',
        marginBottom: '24px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{
              background: 'linear-gradient(135deg, #0d9488 0%, #059669 100%)',
              color: '#ffffff',
              fontSize: '11px',
              fontWeight: '800',
              padding: '3px 8px',
              borderRadius: '6px',
              letterSpacing: '0.5px'
            }}>
              EMS NATIVE ENGINE
            </span>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              fontSize: '11px',
              color: '#34d399',
              background: 'rgba(52, 211, 153, 0.15)',
              padding: '2px 8px',
              borderRadius: '12px'
            }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#34d399', display: 'inline-block' }} />
              Supabase Connected
            </span>
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: '800', margin: '0 0 6px 0', letterSpacing: '-0.3px' }}>
            EMS ERP &amp; Operations Hub
          </h1>
          <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8', maxWidth: '600px', lineHeight: '1.5' }}>
            High-performance native Sales, Invoicing &amp; Inventory engine — fully integrated with WhatsApp CRM and tenant database.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
          <button
            onClick={() => setActiveSubTab('sales')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'linear-gradient(135deg, #0d9488 0%, #064e43 100%)',
              color: '#ffffff',
              border: '1px solid rgba(20, 210, 203, 0.4)',
              padding: '10px 16px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(13, 148, 136, 0.25)'
            }}
          >
            <Plus size={16} />
            <span>New Quotation</span>
          </button>
        </div>
      </div>

      {/* Module Overview Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        {nativeModules.map((mod) => {
          const Icon = mod.icon;
          const isSelected = activeSubTab === mod.id;
          return (
            <div
              key={mod.id}
              onClick={() => setActiveSubTab(mod.id)}
              style={{
                background: '#ffffff',
                border: isSelected ? '2px solid #0d9488' : '1px solid #e2e8f0',
                borderRadius: '14px',
                padding: '20px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: isSelected ? '0 8px 20px -4px rgba(13, 148, 136, 0.15)' : '0 2px 8px -2px rgba(0,0,0,0.03)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '10px',
                  background: mod.bg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: mod.color
                }}>
                  <Icon size={22} strokeWidth={2.2} />
                </div>
                <span style={{
                  fontSize: '11px',
                  fontWeight: '700',
                  color: mod.color,
                  background: mod.bg,
                  padding: '3px 8px',
                  borderRadius: '6px'
                }}>
                  {mod.count}
                </span>
              </div>
              <div style={{ fontSize: '15px', fontWeight: '800', color: '#0f2b26', marginBottom: '6px' }}>
                {mod.title}
              </div>
              <p style={{ fontSize: '12px', color: '#64748b', margin: 0, lineHeight: '1.45' }}>
                {mod.desc}
              </p>
            </div>
          );
        })}
      </div>

      {/* Main Workspace Area (Clean Native Template Ready for Data) */}
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        padding: '24px',
        boxShadow: '0 2px 8px -2px rgba(15, 43, 38, 0.05)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', paddingBottom: '14px', borderBottom: '1px solid #f1f5f9' }}>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: '800', color: '#0f2b26', margin: '0 0 4px 0' }}>
              {activeSubTab === 'sales' && 'Sales Quotations & Orders'}
              {activeSubTab === 'invoicing' && 'GST Invoices & Credit Notes'}
              {activeSubTab === 'inventory' && 'Inventory Stock & Warehouses'}
            </h2>
            <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
              {activeSubTab === 'sales' && 'Manage commercial quotations with real-time WhatsApp dispatch'}
              {activeSubTab === 'invoicing' && 'Government tax compliant invoices with instant payment links'}
              {activeSubTab === 'inventory' && 'Stock availability across active warehouse locations'}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              fontSize: '11px',
              fontWeight: '700',
              color: '#0d9488',
              background: '#ecfdf5',
              padding: '4px 10px',
              borderRadius: '6px'
            }}>
              <CheckCircle2 size={13} />
              Native Mode Active
            </span>
          </div>
        </div>

        {/* Clean Ready State */}
        <div style={{
          padding: '40px 20px',
          textAlign: 'center',
          borderRadius: '12px',
          background: '#f8fafc',
          border: '1px dashed #cbd5e1'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'rgba(13, 148, 136, 0.1)',
            color: '#0d9488',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '12px'
          }}>
            <Sparkles size={24} />
          </div>
          <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#0f2b26', margin: '0 0 6px 0' }}>
            {activeSubTab === 'sales' && 'Ready to Setup Native Sales & Quotations'}
            {activeSubTab === 'invoicing' && 'Ready to Setup Native Invoicing & GST'}
            {activeSubTab === 'inventory' && 'Ready to Setup Native Inventory'}
          </h3>
          <p style={{ fontSize: '12px', color: '#64748b', maxWidth: '480px', margin: '0 auto 16px auto', lineHeight: '1.5' }}>
            Iframe completely removed. This workspace is now ready to directly record and manage data in your Supabase database with instant WhatsApp alerts.
          </p>
        </div>
      </div>
    </div>
  );
}
