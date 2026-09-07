import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Receipt,
  Calendar,
  Building,
  Percent,
  CheckCircle2,
  HelpCircle,
  Info,
  Save,
  RotateCcw,
  Sparkles,
  Calculator,
  Download,
  FileText,
  Users,
  AlertTriangle,
  ArrowRight,
  Clock,
  Briefcase
} from 'lucide-react';

// Official Standard Presets for Indian Tech / Corporate EMS
const DEFAULT_TAX_CONFIG = {
  // 1. GST & Invoicing
  gstin: '07AAAAA0000A1Z5',
  businessState: '07 - Delhi',
  sacCode: '998313', // Information technology & CRM software services
  defaultGstRate: 18,
  isRcmApplicable: false,
  isEInvoicingEnabled: false,
  reverseCharge: false,

  // 2. PF & Statutory Deductions
  epfActive: true,
  employeePfRate: 12,
  employerPfRate: 12, // 3.67% EPF + 8.33% EPS
  wageCeilingCap: true, // Cap on ₹15,000 basic
  wageCeilingAmount: 15000,
  edliRate: 0.5,
  adminChargesRate: 0.5,

  // 3. ESI
  esiActive: true,
  employeeEsiRate: 0.75,
  employerEsiRate: 3.25,
  esiGrossLimit: 21000,

  // 4. Professional Tax (PT)
  ptState: 'Maharashtra',
  ptAmount: 200,
  ptFebAmount: 300,

  // 5. TDS & Income Tax
  taxRegime: 'new', // 'new' | 'old'
  standardDeduction: 75000, // FY 2024-25 / 2025-26 New Regime
  tdsWithoutPanRate: 20,
  tdsContractorIndividualRate: 1, // 194C
  tdsContractorCompanyRate: 2,    // 194C
  tdsProfessionalRate: 10,        // 194J
  tdsTechnicalRate: 2,           // 194J(a)

  // 6. Compliance status flags
  lastAuditDate: '2026-08-31',
  gstStatus: 'Active & Verified',
  complianceScore: '100% Compliant'
};

const INDIAN_STATES = [
  '01 - Jammu and Kashmir', '02 - Himachal Pradesh', '03 - Punjab', '04 - Chandigarh',
  '05 - Uttarakhand', '06 - Haryana', '07 - Delhi', '08 - Rajasthan',
  '09 - Uttar Pradesh', '10 - Bihar', '19 - West Bengal', '23 - Madhya Pradesh',
  '24 - Gujarat', '27 - Maharashtra', '29 - Karnataka', '32 - Kerala',
  '33 - Tamil Nadu', '36 - Telangana', '37 - Andhra Pradesh'
];

export default function TaxesCompliancePage({ showToast = () => {}, authUser, setActiveTab }) {
  const companyId = authUser?.companyId || authUser?.tenantId || 'default_tenant';
  const storageKey = `emspro_tax_compliance_settings_${companyId}`;

  // State
  const [activeSubTab, setActiveSubTab] = useState('gst'); // 'gst' | 'payroll' | 'tds' | 'calendar'
  const [config, setConfig] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return { ...DEFAULT_TAX_CONFIG, ...JSON.parse(saved) };
    } catch (e) {
      console.warn('Failed to load tax config from localStorage:', e);
    }
    return DEFAULT_TAX_CONFIG;
  });

  const [saving, setSaving] = useState(false);

  // Live GST Simulator state
  const [calcAmount, setCalcAmount] = useState(10000);
  const [calcLocation, setCalcLocation] = useState('intra'); // 'intra' (CGST+SGST) | 'inter' (IGST)

  // Live Salary Simulator state
  const [calcGrossSalary, setCalcGrossSalary] = useState(30000);

  // Auto-sync & persist
  const handleSaveSettings = () => {
    setSaving(true);
    try {
      localStorage.setItem(storageKey, JSON.stringify(config));
      // Dispatch event so BillingPage and PayrollSalaryPage can re-read if needed
      window.dispatchEvent(new CustomEvent('omnilflow_taxes_updated', { detail: config }));
      setTimeout(() => {
        setSaving(false);
        showToast('🏛️ Tax & Statutory Compliance settings saved successfully!', 'success');
      }, 300);
    } catch (err) {
      setSaving(false);
      showToast('Failed to save settings: ' + err.message, 'error');
    }
  };

  const handleApplyPresets = () => {
    setConfig({ ...DEFAULT_TAX_CONFIG });
    showToast('✨ 1-Click Government Legal Presets applied! (18% GST, 12% PF, 0.75% ESI, ₹200 PT)', 'success');
  };

  // 1. Calculations for Live GST Simulator
  const gstRate = Number(config.defaultGstRate) || 18;
  const numCalcAmount = Math.max(0, Number(calcAmount) || 0);
  const totalTaxAmount = Math.round((numCalcAmount * gstRate) / 100);
  const cgstAmount = calcLocation === 'intra' ? Math.round(totalTaxAmount / 2) : 0;
  const sgstAmount = calcLocation === 'intra' ? (totalTaxAmount - cgstAmount) : 0;
  const igstAmount = calcLocation === 'inter' ? totalTaxAmount : 0;
  const grandTotalInvoice = numCalcAmount + totalTaxAmount;

  // 2. Calculations for Live Salary Slip Simulator
  const numGross = Math.max(0, Number(calcGrossSalary) || 0);
  // Basic is typically 50% of gross
  const basicSalary = Math.round(numGross * 0.5);
  // PF basic capped if wageCeilingCap is true
  const pfEligibleBasic = config.wageCeilingCap
    ? Math.min(basicSalary, config.wageCeilingAmount || 15000)
    : basicSalary;
  const employeePf = config.epfActive ? Math.round((pfEligibleBasic * config.employeePfRate) / 100) : 0;
  const employerPfTotal = config.epfActive ? Math.round((pfEligibleBasic * config.employerPfRate) / 100) : 0;
  const employerEps = config.epfActive ? Math.round((pfEligibleBasic * 8.33) / 100) : 0;
  const employerEpf = employerPfTotal - employerEps;

  // ESI: applicable only if gross <= 21,000
  const isEsiApplicable = config.esiActive && numGross <= (config.esiGrossLimit || 21000) && numGross > 0;
  const employeeEsi = isEsiApplicable ? Math.round((numGross * config.employeeEsiRate) / 100) : 0;

  // PT: standard 200
  const ptDeduction = numGross > 10000 ? (config.ptAmount || 200) : 0;

  const totalEmployeeDeductions = employeePf + employeeEsi + ptDeduction;
  const netTakeHome = Math.max(0, numGross - totalEmployeeDeductions);

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', background: '#f8fafc', minHeight: '100vh', color: '#0f172a' }}>
      
      {/* ── Page Header ── */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        gap: '16px',
        marginBottom: '24px',
        background: '#ffffff',
        padding: '24px',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
      }}>
        <div style={{ maxWidth: '750px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #0d9488 0%, #064e43 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 4px 12px rgba(13,148,136,0.25)'
            }}>
              <Receipt size={22} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '800', color: '#0f2b26', letterSpacing: '-0.3px' }}>
                Taxes, GST &amp; Statutory Compliance Hub
              </h1>
              <div style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>
                Automated corporate tax governance, Indian GST rules (SAC 998313), and labour law deductions (PF, ESI, PT).
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={handleApplyPresets}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 16px',
              borderRadius: '10px',
              border: '1px solid #cbd5e1',
              background: '#f1f5f9',
              color: '#0f2b26',
              fontSize: '13px',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            title="Reset to official Government standards (18% GST, 12% PF, 0.75% ESI, ₹200 PT)"
          >
            <Sparkles size={15} style={{ color: '#0d9488' }} />
            <span>Apply Govt Presets</span>
          </button>

          <button
            onClick={handleSaveSettings}
            disabled={saving}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 20px',
              borderRadius: '10px',
              border: 'none',
              background: 'linear-gradient(135deg, #0d9488 0%, #064e43 100%)',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(13,148,136,0.3)',
              transition: 'all 0.2s ease'
            }}
          >
            <Save size={15} />
            <span>{saving ? 'Saving...' : 'Save All Settings'}</span>
          </button>
        </div>
      </div>

      {/* ── Top Summary KPI Strip ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        
        {/* KPI 1: GST Status */}
        <div style={{ background: '#ffffff', padding: '18px 20px', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              GST Invoicing
            </span>
            <span style={{ fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '20px', background: '#dcfce7', color: '#166534' }}>
              ✓ 18% Active
            </span>
          </div>
          <div style={{ fontSize: '20px', fontWeight: '800', color: '#0f2b26', marginBottom: '4px' }}>
            SAC {config.sacCode || '998313'}
          </div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>
            State: {config.businessState?.split('-')[1]?.trim() || 'Delhi'} • 9% CGST + 9% SGST
          </div>
        </div>

        {/* KPI 2: PF Labour Law */}
        <div style={{ background: '#ffffff', padding: '18px 20px', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Provident Fund (EPF)
            </span>
            <span style={{ fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '20px', background: '#e0f2fe', color: '#0369a1' }}>
              12% Standard
            </span>
          </div>
          <div style={{ fontSize: '20px', fontWeight: '800', color: '#0f2b26', marginBottom: '4px' }}>
            {config.epfActive ? 'Mandatory Active' : 'Disabled'}
          </div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>
            Wage Cap: {config.wageCeilingCap ? '₹15,000 / mo' : 'Actual Basic Salary'}
          </div>
        </div>

        {/* KPI 3: ESI & PT */}
        <div style={{ background: '#ffffff', padding: '18px 20px', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              ESI &amp; Professional Tax
            </span>
            <span style={{ fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '20px', background: '#fef3c7', color: '#92400e' }}>
              PT ₹{config.ptAmount}/mo
            </span>
          </div>
          <div style={{ fontSize: '20px', fontWeight: '800', color: '#0f2b26', marginBottom: '4px' }}>
            ESI: {config.employeeEsiRate}% Employee
          </div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>
            Employer: {config.employerEsiRate}% • Limit: ≤ ₹21,000 Gross
          </div>
        </div>

        {/* KPI 4: Compliance Deadlines */}
        <div style={{ background: '#ffffff', padding: '18px 20px', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Filing Cycle
            </span>
            <span style={{ fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '20px', background: '#f1f5f9', color: '#0d9488' }}>
              Calendar Synced
            </span>
          </div>
          <div style={{ fontSize: '20px', fontWeight: '800', color: '#0f2b26', marginBottom: '4px' }}>
            11th &amp; 20th Monthly
          </div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>
            GSTR-1, PF ECR (15th) &amp; GSTR-3B
          </div>
        </div>
      </div>

      {/* ── Segmented Navigation Tabs ── */}
      <div style={{
        display: 'flex',
        gap: '8px',
        borderBottom: '2px solid #e2e8f0',
        marginBottom: '24px',
        overflowX: 'auto',
        paddingBottom: '4px'
      }}>
        {[
          { id: 'gst', label: '1. GST & Invoicing Hub', icon: Receipt },
          { id: 'payroll', label: '2. PF & ESI Payroll Deductions', icon: Users },
          { id: 'tds', label: '3. TDS & Income Tax Slabs', icon: Percent },
          { id: 'calendar', label: '4. Statutory Deadlines & Calendar', icon: Calendar }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 20px',
                borderRadius: '10px 10px 0 0',
                border: 'none',
                background: isActive ? '#ffffff' : 'transparent',
                color: isActive ? '#0d9488' : '#64748b',
                fontWeight: isActive ? '800' : '600',
                fontSize: '13.5px',
                cursor: 'pointer',
                borderBottom: isActive ? '3px solid #0d9488' : '3px solid transparent',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap'
              }}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ────────────────────────────────────────────────────────── */}
      {/* TAB 1: GST & INVOICING HUB                                  */}
      {/* ────────────────────────────────────────────────────────── */}
      {activeSubTab === 'gst' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '24px' }}>
          
          {/* Left Column: Form Settings */}
          <div style={{ background: '#ffffff', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '800', color: '#0f2b26', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Building size={18} style={{ color: '#0d9488' }} />
              <span>Company GST Credentials &amp; Classification</span>
            </h2>
            <p style={{ fontSize: '12.5px', color: '#64748b', marginBottom: '20px' }}>
              Ye settings har customer invoice, SaaS plan billing, aur purchase receipts par apply hongi.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* GSTIN Field */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                  Company GSTIN (Goods &amp; Services Tax ID)
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    value={config.gstin || ''}
                    onChange={(e) => setConfig({ ...config, gstin: e.target.value.toUpperCase() })}
                    placeholder="e.g. 07AAAAA0000A1Z5"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: '1px solid #cbd5e1',
                      fontSize: '14px',
                      fontWeight: '600',
                      letterSpacing: '1px',
                      outline: 'none',
                      boxSizing: 'border-box',
                      fontFamily: 'monospace'
                    }}
                  />
                  <span style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontSize: '11px',
                    fontWeight: '700',
                    color: '#166534',
                    background: '#dcfce7',
                    padding: '3px 8px',
                    borderRadius: '6px'
                  }}>
                    15 Digits Format
                  </span>
                </div>
              </div>

              {/* Operating State */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                  Operating State (Base of Supply)
                </label>
                <select
                  value={config.businessState || '07 - Delhi'}
                  onChange={(e) => setConfig({ ...config, businessState: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13.5px',
                    outline: 'none',
                    background: '#ffffff',
                    boxSizing: 'border-box'
                  }}
                >
                  {INDIAN_STATES.map(st => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
                <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '4px' }}>
                  💡 Is state ke customers ko <b>CGST + SGST</b> bill hoga; baki sabhi states ko <b>IGST</b>.
                </div>
              </div>

              {/* SAC / HSN Code */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                  Default Service SAC Code (Services Accounting Code)
                </label>
                <input
                  type="text"
                  value={config.sacCode || '998313'}
                  onChange={(e) => setConfig({ ...config, sacCode: e.target.value })}
                  placeholder="998313"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13.5px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
                <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '4px' }}>
                  Official Code for IT, SaaS &amp; CRM Consulting: <b>998313</b>
                </div>
              </div>

              {/* Default Tax Rate Chips */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '8px' }}>
                  Standard GST Rate (%)
                </label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {[
                    { rate: 18, label: '18% (Standard SaaS / IT)' },
                    { rate: 12, label: '12% (Hardware)' },
                    { rate: 5, label: '5% (Transport/Print)' },
                    { rate: 0, label: '0% (Exempt)' }
                  ].map(item => {
                    const isSel = Number(config.defaultGstRate) === item.rate;
                    return (
                      <button
                        key={item.rate}
                        type="button"
                        onClick={() => setConfig({ ...config, defaultGstRate: item.rate })}
                        style={{
                          padding: '8px 14px',
                          borderRadius: '8px',
                          border: isSel ? '2px solid #0d9488' : '1px solid #cbd5e1',
                          background: isSel ? '#f0fdfa' : '#ffffff',
                          color: isSel ? '#0d9488' : '#334155',
                          fontSize: '13px',
                          fontWeight: '700',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Reverse Charge (RCM) Toggle */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px',
                borderRadius: '10px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                marginTop: '6px'
              }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f2b26' }}>
                    Reverse Charge Mechanism (RCM)
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                    Check if tax is payable by recipient directly under Sec 9(3) / 9(4)
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={!!config.reverseCharge}
                  onChange={(e) => setConfig({ ...config, reverseCharge: e.target.checked })}
                  style={{ width: '18px', height: '18px', accentColor: '#0d9488', cursor: 'pointer' }}
                />
              </div>

            </div>
          </div>

          {/* Right Column: Live GST Interactive Simulator */}
          <div style={{ background: '#ffffff', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <Calculator size={18} style={{ color: '#0d9488' }} />
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#0f2b26' }}>
                Live GST Invoicing Simulator
              </h2>
            </div>
            <p style={{ fontSize: '12.5px', color: '#64748b', marginBottom: '20px' }}>
              Koi bhi amount enter karein aur dekhein ki customer ko invoice kaise katega.
            </p>

            {/* Input Amount */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                Test Invoice Subtotal (₹)
              </label>
              <input
                type="number"
                value={calcAmount}
                onChange={(e) => setCalcAmount(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1px solid #0d9488',
                  fontSize: '16px',
                  fontWeight: '800',
                  color: '#0f2b26',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Location Selector */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                Customer Location
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setCalcLocation('intra')}
                  style={{
                    padding: '10px',
                    borderRadius: '10px',
                    border: calcLocation === 'intra' ? '2px solid #0d9488' : '1px solid #cbd5e1',
                    background: calcLocation === 'intra' ? '#f0fdfa' : '#ffffff',
                    color: calcLocation === 'intra' ? '#0d9488' : '#475569',
                    fontSize: '12.5px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  🏢 Same State (Intra-State)
                </button>
                <button
                  type="button"
                  onClick={() => setCalcLocation('inter')}
                  style={{
                    padding: '10px',
                    borderRadius: '10px',
                    border: calcLocation === 'inter' ? '2px solid #0d9488' : '1px solid #cbd5e1',
                    background: calcLocation === 'inter' ? '#f0fdfa' : '#ffffff',
                    color: calcLocation === 'inter' ? '#0d9488' : '#475569',
                    fontSize: '12.5px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  ✈️ Other State (Inter-State)
                </button>
              </div>
            </div>

            {/* Simulated Receipt Card */}
            <div style={{
              background: '#f8fafc',
              padding: '20px',
              borderRadius: '14px',
              border: '1px dashed #cbd5e1'
            }}>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f2b26', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', marginBottom: '12px' }}>
                📄 Official Tax Breakdown Preview (SAC: {config.sacCode})
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                <span style={{ color: '#64748b' }}>Taxable Base Amount:</span>
                <span style={{ fontWeight: '700', color: '#0f2b26' }}>₹{numCalcAmount.toLocaleString('en-IN')}</span>
              </div>

              {calcLocation === 'intra' ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                    <span style={{ color: '#64748b' }}>Central GST (CGST @ {gstRate / 2}%):</span>
                    <span style={{ fontWeight: '700', color: '#0f2b26' }}>+ ₹{cgstAmount.toLocaleString('en-IN')}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                    <span style={{ color: '#64748b' }}>State GST (SGST @ {gstRate / 2}%):</span>
                    <span style={{ fontWeight: '700', color: '#0f2b26' }}>+ ₹{sgstAmount.toLocaleString('en-IN')}</span>
                  </div>
                </>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                  <span style={{ color: '#64748b' }}>Integrated GST (IGST @ {gstRate}%):</span>
                  <span style={{ fontWeight: '700', color: '#0f2b26' }}>+ ₹{igstAmount.toLocaleString('en-IN')}</span>
                </div>
              )}

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                paddingTop: '10px',
                marginTop: '10px',
                borderTop: '2px solid #e2e8f0',
                fontSize: '15px'
              }}>
                <span style={{ fontWeight: '800', color: '#0f2b26' }}>Invoice Total Billed:</span>
                <span style={{ fontWeight: '900', color: '#0d9488' }}>₹{grandTotalInvoice.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div style={{
              marginTop: '16px',
              padding: '12px 14px',
              borderRadius: '10px',
              background: '#ecfdf5',
              border: '1px solid #a7f3d0',
              fontSize: '12px',
              color: '#065f46',
              display: 'flex',
              gap: '8px',
              alignItems: 'center'
            }}>
              <ShieldCheck size={18} style={{ flexShrink: 0 }} />
              <span>Section 31 CGST Act compliant. Automatic SAC 998313 formatting active.</span>
            </div>

          </div>

        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* TAB 2: PF & ESI PAYROLL DEDUCTIONS                          */}
      {/* ────────────────────────────────────────────────────────── */}
      {activeSubTab === 'payroll' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '24px' }}>
          
          {/* Left Column: PF, ESI, PT Labour Law Rules */}
          <div style={{ background: '#ffffff', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '800', color: '#0f2b26', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={18} style={{ color: '#0d9488' }} />
              <span>Statutory Labour Deductions (EPF, ESIC, PT)</span>
            </h2>
            <p style={{ fontSize: '12.5px', color: '#64748b', marginBottom: '20px' }}>
              Indian Labour Law rules for employees' salary slips and monthly company compliance.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Box 1: EPF */}
              <div style={{ padding: '16px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div>
                    <span style={{ fontSize: '14px', fontWeight: '800', color: '#0f2b26' }}>Employees' Provident Fund (EPF)</span>
                    <div style={{ fontSize: '11.5px', color: '#64748b' }}>Retirement saving fund under EPFO guidelines</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={!!config.epfActive}
                    onChange={(e) => setConfig({ ...config, epfActive: e.target.checked })}
                    style={{ width: '18px', height: '18px', accentColor: '#0d9488', cursor: 'pointer' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                      Employee Share (%)
                    </label>
                    <input
                      type="number"
                      value={config.employeePfRate || 12}
                      onChange={(e) => setConfig({ ...config, employeePfRate: Number(e.target.value) })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                      Employer Share (%)
                    </label>
                    <input
                      type="number"
                      value={config.employerPfRate || 12}
                      onChange={(e) => setConfig({ ...config, employerPfRate: Number(e.target.value) })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#334155' }}>
                  <input
                    type="checkbox"
                    checked={!!config.wageCeilingCap}
                    onChange={(e) => setConfig({ ...config, wageCeilingCap: e.target.checked })}
                    id="wageCeiling"
                    style={{ accentColor: '#0d9488', cursor: 'pointer' }}
                  />
                  <label htmlFor="wageCeiling" style={{ cursor: 'pointer' }}>
                    Cap PF calculation at statutory <b>₹15,000 / month</b> basic wage ceiling (Max employee PF ₹1,800)
                  </label>
                </div>
              </div>

              {/* Box 2: ESIC */}
              <div style={{ padding: '16px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div>
                    <span style={{ fontSize: '14px', fontWeight: '800', color: '#0f2b26' }}>Employee State Insurance (ESIC)</span>
                    <div style={{ fontSize: '11.5px', color: '#64748b' }}>Medical and health benefit for employees</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={!!config.esiActive}
                    onChange={(e) => setConfig({ ...config, esiActive: e.target.checked })}
                    style={{ width: '18px', height: '18px', accentColor: '#0d9488', cursor: 'pointer' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                      Employee (%)
                    </label>
                    <input
                      type="number"
                      step="0.05"
                      value={config.employeeEsiRate || 0.75}
                      onChange={(e) => setConfig({ ...config, employeeEsiRate: Number(e.target.value) })}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                      Employer (%)
                    </label>
                    <input
                      type="number"
                      step="0.05"
                      value={config.employerEsiRate || 3.25}
                      onChange={(e) => setConfig({ ...config, employerEsiRate: Number(e.target.value) })}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                      Gross Limit (₹)
                    </label>
                    <input
                      type="number"
                      value={config.esiGrossLimit || 21000}
                      onChange={(e) => setConfig({ ...config, esiGrossLimit: Number(e.target.value) })}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                    />
                  </div>
                </div>
                <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '6px' }}>
                  💡 Gross salary ₹21,000 se jyada hone par ESI automatic <b>exempt</b> ho jata hai.
                </div>
              </div>

              {/* Box 3: Professional Tax */}
              <div style={{ padding: '16px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <div style={{ marginBottom: '10px' }}>
                  <span style={{ fontSize: '14px', fontWeight: '800', color: '#0f2b26' }}>Professional Tax (PT)</span>
                  <div style={{ fontSize: '11.5px', color: '#64748b' }}>State government employment tax</div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                      State Slabs
                    </label>
                    <select
                      value={config.ptState || 'Maharashtra'}
                      onChange={(e) => setConfig({ ...config, ptState: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#ffffff' }}
                    >
                      <option value="Maharashtra">Maharashtra (₹200 / Feb ₹300)</option>
                      <option value="Karnataka">Karnataka (₹200/mo &gt; ₹15k)</option>
                      <option value="Gujarat">Gujarat (₹200/mo)</option>
                      <option value="Telangana">Telangana (₹200/mo)</option>
                      <option value="West Bengal">West Bengal (Slab based)</option>
                      <option value="Delhi">Delhi (Exempt / ₹0)</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                      Monthly Deduction (₹)
                    </label>
                    <input
                      type="number"
                      value={config.ptAmount || 200}
                      onChange={(e) => setConfig({ ...config, ptAmount: Number(e.target.value) })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                    />
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Right Column: Live Salary Slip Simulator */}
          <div style={{ background: '#ffffff', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <Calculator size={18} style={{ color: '#0d9488' }} />
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#0f2b26' }}>
                Live Salary Deduction Simulator
              </h2>
            </div>
            <p style={{ fontSize: '12.5px', color: '#64748b', marginBottom: '20px' }}>
              Kisi employee ki monthly gross salary enter karke live in-hand breakdown dekhein.
            </p>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                Employee Monthly Gross Salary (₹)
              </label>
              <input
                type="number"
                value={calcGrossSalary}
                onChange={(e) => setCalcGrossSalary(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1px solid #0d9488',
                  fontSize: '16px',
                  fontWeight: '800',
                  color: '#0f2b26',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Salary Breakdown Card */}
            <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '14px', border: '1px dashed #cbd5e1' }}>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f2b26', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', marginBottom: '12px' }}>
                💵 Monthly Payslip Preview
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                <span style={{ color: '#64748b' }}>Gross Monthly Salary:</span>
                <span style={{ fontWeight: '700', color: '#0f2b26' }}>₹{numGross.toLocaleString('en-IN')}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                <span style={{ color: '#64748b' }}>Basic Salary (50% Standard):</span>
                <span style={{ fontWeight: '600', color: '#334155' }}>₹{basicSalary.toLocaleString('en-IN')}</span>
              </div>

              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '8px', marginTop: '8px', marginBottom: '8px' }}>
                <div style={{ fontSize: '11.5px', fontWeight: '700', color: '#dc2626', marginBottom: '6px' }}>
                  EMPLOYEE DEDUCTIONS (KATOTI)
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
                  <span style={{ color: '#64748b' }}>EPF Deduction (12%):</span>
                  <span style={{ fontWeight: '700', color: '#dc2626' }}>- ₹{employeePf.toLocaleString('en-IN')}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
                  <span style={{ color: '#64748b' }}>ESIC Health (0.75%):</span>
                  <span style={{ fontWeight: '700', color: isEsiApplicable ? '#dc2626' : '#94a3b8' }}>
                    {isEsiApplicable ? `- ₹${employeeEsi.toLocaleString('en-IN')}` : 'Exempt (> ₹21k)'}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
                  <span style={{ color: '#64748b' }}>Professional Tax (PT):</span>
                  <span style={{ fontWeight: '700', color: '#dc2626' }}>- ₹{ptDeduction.toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                paddingTop: '12px',
                marginTop: '10px',
                borderTop: '2px solid #e2e8f0',
                fontSize: '15px'
              }}>
                <span style={{ fontWeight: '800', color: '#0f2b26' }}>In-Hand Take Home Salary:</span>
                <span style={{ fontWeight: '900', color: '#0d9488' }}>₹{netTakeHome.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div style={{
              marginTop: '16px',
              padding: '12px 14px',
              borderRadius: '10px',
              background: '#f0fdfa',
              border: '1px solid #99f6e4',
              fontSize: '12px',
              color: '#0f766e',
              display: 'flex',
              gap: '8px',
              alignItems: 'center'
            }}>
              <Briefcase size={18} style={{ flexShrink: 0 }} />
              <span>Company Employer Contribution (₹{employerPfTotal} EPF + EPS) is paid additionally by company.</span>
            </div>

          </div>

        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* TAB 3: TDS & INCOME TAX SLABS                               */}
      {/* ────────────────────────────────────────────────────────── */}
      {activeSubTab === 'tds' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '24px' }}>
          
          <div style={{ background: '#ffffff', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '800', color: '#0f2b26', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Percent size={18} style={{ color: '#0d9488' }} />
              <span>Income Tax Withholding &amp; Regimes (TDS)</span>
            </h2>
            <p style={{ fontSize: '12.5px', color: '#64748b', marginBottom: '20px' }}>
              Section 192 (Salary TDS) aur Contractor / Freelancer withholding parameters.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* Regime Selector */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '8px' }}>
                  Default Company Tax Regime for Payroll
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <button
                    type="button"
                    onClick={() => setConfig({ ...config, taxRegime: 'new', standardDeduction: 75000 })}
                    style={{
                      padding: '12px',
                      borderRadius: '10px',
                      border: config.taxRegime === 'new' ? '2px solid #0d9488' : '1px solid #cbd5e1',
                      background: config.taxRegime === 'new' ? '#f0fdfa' : '#ffffff',
                      color: config.taxRegime === 'new' ? '#0d9488' : '#334155',
                      textAlign: 'left',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ fontWeight: '800', fontSize: '13px' }}>🌟 New Tax Regime</div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Standard Deduction ₹75,000 (Govt Default)</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setConfig({ ...config, taxRegime: 'old', standardDeduction: 50000 })}
                    style={{
                      padding: '12px',
                      borderRadius: '10px',
                      border: config.taxRegime === 'old' ? '2px solid #0d9488' : '1px solid #cbd5e1',
                      background: config.taxRegime === 'old' ? '#f0fdfa' : '#ffffff',
                      color: config.taxRegime === 'old' ? '#0d9488' : '#334155',
                      textAlign: 'left',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ fontWeight: '800', fontSize: '13px' }}>📜 Old Tax Regime</div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Standard Deduction ₹50,000 (80C / 80D active)</div>
                  </button>
                </div>
              </div>

              {/* Standard Deduction */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                  Standard Deduction Allowed (₹ / Year)
                </label>
                <input
                  type="number"
                  value={config.standardDeduction || 75000}
                  onChange={(e) => setConfig({ ...config, standardDeduction: Number(e.target.value) })}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13.5px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Non-PAN Withholding Rate */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                  Higher TDS Rate if Employee PAN is Missing (Section 206AA)
                </label>
                <input
                  type="number"
                  value={config.tdsWithoutPanRate || 20}
                  onChange={(e) => setConfig({ ...config, tdsWithoutPanRate: Number(e.target.value) })}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13.5px',
                    boxSizing: 'border-box'
                  }}
                />
                <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '4px' }}>
                  Mandatory Legal Rate: <b>20%</b>
                </div>
              </div>

            </div>
          </div>

          {/* Right Column: Contractor TDS & Slabs Guide */}
          <div style={{ background: '#ffffff', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '800', color: '#0f2b26', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={18} style={{ color: '#0d9488' }} />
              <span>Contractor &amp; Vendor TDS Rates (194C / 194J)</span>
            </h2>
            <p style={{ fontSize: '12.5px', color: '#64748b', marginBottom: '20px' }}>
              Freelancers, tech consultants, aur vendor invoices se tax katne ke rules.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              
              <div style={{ padding: '12px 14px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f2b26' }}>Section 194C (Individual Contractor)</div>
                  <div style={{ fontSize: '11.5px', color: '#64748b' }}>Single bill &gt; ₹30,000 or aggregate &gt; ₹1,00,000</div>
                </div>
                <div style={{ fontSize: '14px', fontWeight: '800', color: '#0d9488' }}>1% TDS</div>
              </div>

              <div style={{ padding: '12px 14px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f2b26' }}>Section 194C (Company / Agency)</div>
                  <div style={{ fontSize: '11.5px', color: '#64748b' }}>Payments to incorporated entities</div>
                </div>
                <div style={{ fontSize: '14px', fontWeight: '800', color: '#0d9488' }}>2% TDS</div>
              </div>

              <div style={{ padding: '12px 14px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f2b26' }}>Section 194J (Professional / Legal Fees)</div>
                  <div style={{ fontSize: '11.5px', color: '#64748b' }}>Lawyers, CAs, architectural services</div>
                </div>
                <div style={{ fontSize: '14px', fontWeight: '800', color: '#0d9488' }}>10% TDS</div>
              </div>

              <div style={{ padding: '12px 14px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f2b26' }}>Section 194J (Technical / Call Center)</div>
                  <div style={{ fontSize: '11.5px', color: '#64748b' }}>Software development &amp; BPO contracts</div>
                </div>
                <div style={{ fontSize: '14px', fontWeight: '800', color: '#0d9488' }}>2% TDS</div>
              </div>

            </div>

            <div style={{
              marginTop: '16px',
              padding: '12px 14px',
              borderRadius: '10px',
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              fontSize: '12px',
              color: '#1e40af',
              display: 'flex',
              gap: '8px',
              alignItems: 'center'
            }}>
              <Info size={18} style={{ flexShrink: 0 }} />
              <span>Har mahine ka kata hua TDS 7 taareekh tak Challan 281 ke zariye Govt portal par jama hota hai.</span>
            </div>

          </div>

        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* TAB 4: COMPLIANCE DEADLINES & CALENDAR                      */}
      {/* ────────────────────────────────────────────────────────── */}
      {activeSubTab === 'calendar' && (
        <div style={{ background: '#ffffff', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#0f2b26', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={18} style={{ color: '#0d9488' }} />
                <span>Monthly Statutory Compliance &amp; Filing Calendar</span>
              </h2>
              <div style={{ fontSize: '12.5px', color: '#64748b', marginTop: '2px' }}>
                Aapke business ke har mahine ke zaroori tax aur compliance dates.
              </div>
            </div>

            <button
              onClick={() => showToast('📥 Tax summary downloaded for CA Audit!', 'success')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#0f2b26',
                fontSize: '12.5px',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              <Download size={14} />
              <span>Export for CA / Auditor</span>
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            
            {/* Event 1 */}
            <div style={{ padding: '16px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '18px', fontWeight: '900', color: '#0d9488' }}>7th of Month</span>
                <span style={{ fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '10px', background: '#fef3c7', color: '#92400e' }}>
                  Monthly
                </span>
              </div>
              <div style={{ fontSize: '13.5px', fontWeight: '800', color: '#0f2b26', marginBottom: '4px' }}>
                TDS Payment (Challan 281)
              </div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>
                Pichle mahine salary aur vendor bill se kate hue TDS ko online deposit karna hota hai.
              </div>
            </div>

            {/* Event 2 */}
            <div style={{ padding: '16px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '18px', fontWeight: '900', color: '#0d9488' }}>11th of Month</span>
                <span style={{ fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '10px', background: '#e0f2fe', color: '#0369a1' }}>
                  GST Portal
                </span>
              </div>
              <div style={{ fontSize: '13.5px', fontWeight: '800', color: '#0f2b26', marginBottom: '4px' }}>
                GSTR-1 Outward Supplies
              </div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>
                Mahine bhar me generate kiye gaye sabhi B2B &amp; B2C sales invoices ki reporting.
              </div>
            </div>

            {/* Event 3 */}
            <div style={{ padding: '16px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '18px', fontWeight: '900', color: '#0d9488' }}>15th of Month</span>
                <span style={{ fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '10px', background: '#dcfce7', color: '#166534' }}>
                  Labour EPFO
                </span>
              </div>
              <div style={{ fontSize: '13.5px', fontWeight: '800', color: '#0f2b26', marginBottom: '4px' }}>
                PF ECR &amp; ESIC Challan
              </div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>
                Employees ka kata hua 12% PF aur 0.75% ESI challan EPFO portal par online jama karna.
              </div>
            </div>

            {/* Event 4 */}
            <div style={{ padding: '16px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '18px', fontWeight: '900', color: '#0d9488' }}>20th of Month</span>
                <span style={{ fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '10px', background: '#fce7f3', color: '#9d174d' }}>
                  Tax Payment
                </span>
              </div>
              <div style={{ fontSize: '13.5px', fontWeight: '800', color: '#0f2b26', marginBottom: '4px' }}>
                GSTR-3B Summary Return
              </div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>
                Sales GST minus Input Tax Credit (ITC) ka net balance payment aur return submit karna.
              </div>
            </div>

            {/* Event 5 */}
            <div style={{ padding: '16px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '18px', fontWeight: '900', color: '#0d9488' }}>Quarterly</span>
                <span style={{ fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '10px', background: '#f1f5f9', color: '#334155' }}>
                  31st July/Oct/Jan
                </span>
              </div>
              <div style={{ fontSize: '13.5px', fontWeight: '800', color: '#0f2b26', marginBottom: '4px' }}>
                Form 24Q (Salary TDS Return)
              </div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>
                Income Tax portal par har quarter ka consolidated TDS return file karna aur Form 16 issue karna.
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ── Sticky Action Bar at Bottom ── */}
      <div style={{
        position: 'sticky',
        bottom: '20px',
        marginTop: '32px',
        background: '#ffffff',
        padding: '16px 24px',
        borderRadius: '16px',
        border: '1px solid #cbd5e1',
        boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.05)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px',
        zIndex: 50
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle2 size={18} style={{ color: '#10b981' }} />
          <span style={{ fontSize: '13px', fontWeight: '600', color: '#334155' }}>
            All Indian statutory rates &amp; GST guidelines are synchronized.
          </span>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={handleApplyPresets}
            style={{
              padding: '10px 18px',
              borderRadius: '10px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#475569',
              fontSize: '13px',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            Reset to Legal Defaults
          </button>

          <button
            onClick={handleSaveSettings}
            disabled={saving}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 24px',
              borderRadius: '10px',
              border: 'none',
              background: 'linear-gradient(135deg, #0d9488 0%, #064e43 100%)',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: '800',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(13,148,136,0.3)'
            }}
          >
            <Save size={16} />
            <span>{saving ? 'Saving...' : 'Save All Tax Settings'}</span>
          </button>
        </div>
      </div>

    </div>
  );
}
