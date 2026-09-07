import React, { useState, useEffect, useMemo } from 'react';
import { 
  Layers, 
  Plus, 
  Trash2, 
  Save, 
  RotateCcw, 
  Check, 
  ShieldCheck, 
  Sparkles, 
  DollarSign, 
  Settings, 
  Eye, 
  AlertCircle, 
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Info,
  CheckCircle2,
  Lock,
  Tag
} from 'lucide-react';
import onboardingConfigService from '../../core/services/onboardingConfigService';
import { 
  DEFAULT_PLANS, 
  DEFAULT_PRICING_CONFIG, 
  DEFAULT_MODULE_PRICING, 
  formatINR 
} from '../../core/engines/SubscriptionEngine';
import MasterModuleRegistry from '../../core/registry/MasterModuleRegistry';
import FeatureProvisioningEngine from '../../core/engines/FeatureProvisioningEngine';

export default function SuperAdminMasterPlansHub({ showToast }) {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('plans'); // 'plans' | 'matrix' | 'capacity'
  const [selectedPlanId, setSelectedPlanId] = useState('pro');

  // Load config on mount
  useEffect(() => {
    let isMounted = true;
    onboardingConfigService.getOnboardingConfig().then(cfg => {
      if (isMounted && cfg) {
        // Ensure modulePricing exists
        const merged = {
          ...cfg,
          modulePricing: {
            ...DEFAULT_MODULE_PRICING,
            ...(cfg.modulePricing || {})
          }
        };
        setConfig(merged);
        if (merged.plans && merged.plans.length > 0) {
          setSelectedPlanId(merged.plans[0].id);
        }
        setLoading(false);
      }
    });

    const unsub = onboardingConfigService.subscribe(updated => {
      if (isMounted && updated) {
        setConfig(prev => ({
          ...prev,
          ...updated,
          modulePricing: {
            ...DEFAULT_MODULE_PRICING,
            ...(updated.modulePricing || {})
          }
        }));
      }
    });

    return () => {
      isMounted = false;
      unsub();
    };
  }, []);

  // System Modules
  const allModules = useMemo(() => {
    let list = [];
    try {
      if (MasterModuleRegistry && typeof MasterModuleRegistry.getAllSystemManifests === 'function') {
        list = MasterModuleRegistry.getAllSystemManifests();
      }
    } catch (e) {}

    if (!Array.isArray(list) || list.length === 0) {
      list = [
        { id: 'contacts', name: 'Contacts & Leads', category: 'CRM & Sales', icon: '👥', description: 'Complete lead directory & WhatsApp CRM tags' },
        { id: 'conversations', name: 'WhatsApp Conversations', category: 'CRM & Sales', icon: '💬', description: 'Direct customer chats & broadcast messaging' },
        { id: 'wa_live_web', name: 'WhatsApp Web Live Hub', category: 'CRM & Sales', icon: '📱', description: 'Live embedded WhatsApp Web for multiple agents' },
        { id: 'kanban', name: 'CRM Deals Pipeline', category: 'CRM & Sales', icon: '📊', description: 'Visual drag-and-drop lead sales stages' },
        { id: 'employees', name: 'Employee Directory', category: 'HR & Workforce', icon: '👥', description: 'Centralized team roster & employment details' },
        { id: 'recruitment_ats', name: 'Recruitment & ATS', category: 'HR & Workforce', icon: '💼', description: 'Job openings, candidates pipeline & hiring stages' },
        { id: 'asset_management', name: 'Asset Management', category: 'HR & Workforce', icon: '💻', description: 'Company hardware, laptops & equipment allocation' },
        { id: 'verify_documents', name: 'Document Verification', category: 'HR & Workforce', icon: '📄', description: 'Aadhaar, PAN & employee KYC verification' },
        { id: 'offboarding', name: 'Offboarding Exit', category: 'HR & Workforce', icon: '🚪', description: 'Resignations, clearances & exit interviews' },
        { id: 'payroll', name: 'Payroll & Salary Slips', category: 'Finance & Payroll', icon: '💰', description: 'Automated 1-click salary generator & PDF slips' },
        { id: 'taxes_compliance', name: 'Taxes & Compliance', category: 'Finance & Payroll', icon: '⚖️', description: 'PF, ESI, TDS calculations & tax deduction tracking' },
        { id: 'ff_settlements', name: 'F&F Settlements', category: 'Finance & Payroll', icon: '🧾', description: 'Full and final settlements & gratuity' },
        { id: 'advances_loans', name: 'Advances & Loans', category: 'Finance & Payroll', icon: '💳', description: 'Employee salary advance requests & EMIs' },
        { id: 'expenses', name: 'Expense Claims', category: 'Finance & Payroll', icon: '📊', description: 'Travel, fuel & operational expense reimbursements' },
        { id: 'telecalling', name: 'Cloud PBX & SIM Telecalling', category: 'Field & Telephony', icon: '📞', description: 'Cloud telephony, call recordings & audio waveforms' },
        { id: 'gps_attendance', name: 'Live GPS Field Tracking', category: 'Field & Telephony', icon: '📍', description: 'Real-time sales executive GPS route tracking' },
        { id: 'attendance', name: 'Attendance & Kiosk', category: 'Platform Operations', icon: '⏱️', description: 'Punch in/out, selfie check-ins & office kiosk' },
        { id: 'tasks', name: 'Tasks Board', category: 'Platform Operations', icon: '📋', description: 'Team task delegations & project progress' },
        { id: 'notice_board', name: 'Notice Board', category: 'Platform Operations', icon: '📢', description: 'Company-wide bulletin & vital announcements' },
        { id: 'holidays', name: 'Holidays Calendar', category: 'Platform Operations', icon: '📅', description: 'National and organizational annual holidays' },
        { id: 'dashboards', name: 'Analytics & Dashboards', category: 'Platform Operations', icon: '📈', description: 'High-level business & operations metrics' },
        { id: 'feedback', name: 'Feedback & Suggestions', category: 'Platform Operations', icon: '💌', description: 'Employee suggestions & anonymous drop box' }
      ];
    }

    return list.map(m => ({
      ...m,
      id: m.moduleId || m.id,
      name: m.name || m.title || m.moduleId || m.id,
      category: m.category || 'Platform Operations',
      icon: m.icon || '📦',
      isGloballyDisabled: FeatureProvisioningEngine?.isModuleGloballyDisabled ? FeatureProvisioningEngine.isModuleGloballyDisabled(m.moduleId || m.id) : false
    }));
  }, []);

  // Categorized Modules
  const categorizedModules = useMemo(() => {
    const cats = {
      'CRM & Sales Pipeline': [],
      'HR & Workforce Management': [],
      'Finance & Payroll': [],
      'Telephony & Field Operations': [],
      'Platform Operations & Tools': []
    };

    allModules.forEach(m => {
      const catLower = (m.category || '').toLowerCase();
      if (catLower.includes('crm') || catLower.includes('sales') || catLower.includes('whatsapp') || catLower.includes('chat') || catLower.includes('contact') || catLower.includes('conversation')) {
        cats['CRM & Sales Pipeline'].push(m);
      } else if (catLower.includes('hr') || catLower.includes('workforce') || catLower.includes('recruit') || catLower.includes('asset') || catLower.includes('document') || catLower.includes('offboard') || catLower.includes('employee')) {
        cats['HR & Workforce Management'].push(m);
      } else if (catLower.includes('finance') || catLower.includes('payroll') || catLower.includes('tax') || catLower.includes('expense') || catLower.includes('loan') || catLower.includes('settlement')) {
        cats['Finance & Payroll'].push(m);
      } else if (catLower.includes('telephony') || catLower.includes('calling') || catLower.includes('gps') || catLower.includes('field')) {
        cats['Telephony & Field Operations'].push(m);
      } else {
        cats['Platform Operations & Tools'].push(m);
      }
    });

    return cats;
  }, [allModules]);

  const activePlans = useMemo(() => config?.plans || DEFAULT_PLANS, [config]);
  const currentPlan = useMemo(() => {
    return activePlans.find(p => p.id === selectedPlanId) || activePlans[0];
  }, [activePlans, selectedPlanId]);

  // Handle Plan Field Update
  const updateCurrentPlan = (field, value) => {
    if (!config) return;
    const updatedPlans = (config.plans || DEFAULT_PLANS).map(p => {
      if (p.id === selectedPlanId) {
        return { ...p, [field]: value };
      }
      return p;
    });
    setConfig(prev => ({ ...prev, plans: updatedPlans }));
  };

  // Toggle Module in Current Plan
  const toggleModuleInCurrentPlan = (moduleId) => {
    if (!currentPlan) return;
    const currentMods = Array.isArray(currentPlan.includedModules) ? [...currentPlan.includedModules] : [];
    const exists = currentMods.includes(moduleId);
    const updated = exists ? currentMods.filter(id => id !== moduleId) : [...currentMods, moduleId];
    updateCurrentPlan('includedModules', updated);
  };

  const selectAllModulesForCurrentPlan = () => {
    if (!currentPlan) return;
    const activeIds = allModules.filter(m => !m.isGloballyDisabled).map(m => m.id);
    updateCurrentPlan('includedModules', activeIds);
  };

  const clearAllModulesForCurrentPlan = () => {
    if (!currentPlan) return;
    updateCurrentPlan('includedModules', []);
  };

  // Update Individual Module Add-on Price
  const updateModulePrice = (moduleId, price) => {
    const num = Math.max(0, parseInt(price, 10) || 0);
    setConfig(prev => ({
      ...prev,
      modulePricing: {
        ...(prev.modulePricing || DEFAULT_MODULE_PRICING),
        [moduleId]: num
      }
    }));
  };

  // Update Capacity Pricing
  const updatePricingField = (field, value) => {
    const num = Math.max(0, parseInt(value, 10) || 0);
    setConfig(prev => ({
      ...prev,
      pricing: {
        ...(prev.pricing || DEFAULT_PRICING_CONFIG),
        [field]: num
      }
    }));
  };

  // Add New Plan Tier
  const handleAddNewPlan = () => {
    const newId = 'tier_' + Math.random().toString(36).substring(2, 7);
    const newPlan = {
      id: newId,
      name: 'New Custom Tier',
      tagline: 'Customized suite for specialized business operations',
      basePriceMonthly: 3999,
      basePriceYearly: 39990,
      includedSeats: 10,
      includedChannels: 2,
      isTrial: false,
      trialDays: 0,
      isPopular: false,
      badgeColor: '#0ea5e9',
      includedModules: ['dashboards', 'contacts', 'conversations', 'kanban', 'telecalling', 'tasks'],
      features: [
        '10 Included Employee Seats',
        '2 WhatsApp Connected Channels',
        'Full CRM & Deals Kanban',
        'Cloud PBX & SIM Telecalling',
        'Priority Phone & Email Support'
      ]
    };

    setConfig(prev => ({
      ...prev,
      plans: [...(prev.plans || DEFAULT_PLANS), newPlan]
    }));
    setSelectedPlanId(newId);
    if (showToast) showToast('Created new plan tier! Remember to click "Save Master Plans Live".', 'info');
  };

  // Delete Plan Tier
  const handleDeletePlan = (planId) => {
    if (activePlans.length <= 1) {
      if (showToast) showToast('You must keep at least one plan configured.', 'warning');
      return;
    }
    const target = activePlans.find(p => p.id === planId);
    if (!window.confirm(`Are you sure you want to delete the "${target?.name || planId}" plan tier?`)) {
      return;
    }

    const updated = activePlans.filter(p => p.id !== planId);
    setConfig(prev => ({ ...prev, plans: updated }));
    setSelectedPlanId(updated[0]?.id || '');
    if (showToast) showToast(`Plan tier "${target?.name}" removed. Click Save Live to publish.`, 'info');
  };

  // Save All Changes Live
  const handleSaveLive = async () => {
    setSaving(true);
    try {
      const cleanedPlans = (config.plans || DEFAULT_PLANS).map(p => ({
        ...p,
        trialDays: p.isTrial ? (Number(p.trialDays) || 7) : 0,
        includedSeats: Number(p.includedSeats) || 1,
        includedChannels: Number(p.includedChannels) || 1,
        basePriceMonthly: Number(p.basePriceMonthly) || 0,
        basePriceYearly: Number(p.basePriceYearly) || 0,
        features: Array.isArray(p.features) ? p.features.filter(f => f && String(f).trim()) : []
      }));
      const payloadConfig = { ...config, plans: cleanedPlans };
      setConfig(payloadConfig);
      await onboardingConfigService.saveOnboardingConfig(payloadConfig);
      if (showToast) showToast('✅ Master SaaS Plans & Modular Pricing published globally in real-time!', 'success');
    } catch (e) {
      if (showToast) showToast('Failed to save plans: ' + e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Reset to Defaults
  const handleResetDefaults = () => {
    if (!window.confirm('Reset all plans, module pricing, and capacity rules to platform factory defaults?')) {
      return;
    }
    const defaultCfg = onboardingConfigService.getDefaultConfig();
    setConfig({
      ...defaultCfg,
      modulePricing: DEFAULT_MODULE_PRICING
    });
    if (showToast) showToast('Reset to factory defaults. Click "Save Live" to persist.', 'info');
  };

  if (loading || !config) {
    return (
      <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
        <div style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>Loading Master Plans Studio...</div>
        <p style={{ fontSize: '13px' }}>Syncing plan configurations & module registries...</p>
      </div>
    );
  }

  const modulePricing = config.modulePricing || DEFAULT_MODULE_PRICING;
  const pricing = config.pricing || DEFAULT_PRICING_CONFIG;

  return (
    <div style={{ color: '#0f172a', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" }}>
      
      {/* ── TOP HERO & GLOBAL CONTROLS HEADER ── */}
      <div style={{
        background: 'linear-gradient(135deg, #064e43 0%, #002b24 100%)',
        borderRadius: '16px',
        padding: '24px 28px',
        color: '#ffffff',
        marginBottom: '20px',
        boxShadow: '0 8px 30px rgba(6, 78, 67, 0.25)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <span style={{
              background: 'rgba(255,255,255,0.15)',
              padding: '4px 10px',
              borderRadius: '20px',
              fontSize: '11px',
              fontWeight: '800',
              textTransform: 'uppercase',
              letterSpacing: '0.6px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px'
            }}>
              <ShieldCheck size={13} color="#2dd4bf" /> SuperAdmin Master Console
            </span>
            <span style={{ fontSize: '12px', color: '#99f6e4', fontWeight: '600' }}>
              • {activePlans.length} Active Plans • {allModules.length} Platform Modules
            </span>
          </div>

          <h2 style={{ fontSize: '24px', fontWeight: '800', margin: '0 0 6px 0', letterSpacing: '-0.3px', color: '#ffffff' }}>
            SaaS Plans & Modular Pricing Studio
          </h2>
          <p style={{ fontSize: '13.5px', color: '#ccfbf1', margin: 0, maxWidth: '640px', lineHeight: '1.4' }}>
            Fully customize subscription tiers, bundle modules into plans, or sell modules individually as standalone add-ons. Changes sync instantly across the Registration Wizard, Client Billing, and Feature Gatekeeping.
          </p>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleResetDefaults}
            style={{
              padding: '10px 16px',
              borderRadius: '9px',
              border: '1px solid rgba(255,255,255,0.25)',
              background: 'rgba(255,255,255,0.08)',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'background 0.15s'
            }}
            title="Reset plans and module pricing to defaults"
          >
            <RotateCcw size={14} />
            <span>Reset Defaults</span>
          </button>

          <button
            type="button"
            onClick={handleAddNewPlan}
            style={{
              padding: '10px 16px',
              borderRadius: '9px',
              border: 'none',
              background: '#0ea5e9',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 12px rgba(14, 165, 233, 0.35)'
            }}
          >
            <Plus size={15} />
            <span>+ Add Plan Tier</span>
          </button>

          <button
            type="button"
            onClick={handleSaveLive}
            disabled={saving}
            style={{
              padding: '10px 22px',
              borderRadius: '9px',
              border: 'none',
              background: '#10b981',
              color: '#ffffff',
              fontSize: '13.5px',
              fontWeight: '800',
              cursor: saving ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)',
              transition: 'transform 0.15s'
            }}
          >
            <Save size={16} />
            <span>{saving ? 'Publishing Changes...' : '💾 Save Master Plans Live'}</span>
          </button>
        </div>
      </div>

      {/* ── NAVIGATION TABS ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        marginBottom: '20px',
        borderBottom: '2px solid #e2e8f0',
        paddingBottom: '2px'
      }}>
        <button
          type="button"
          onClick={() => setActiveTab('plans')}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'none',
            borderBottom: activeTab === 'plans' ? '3px solid #0d9488' : '3px solid transparent',
            color: activeTab === 'plans' ? '#0d9488' : '#64748b',
            fontSize: '14px',
            fontWeight: activeTab === 'plans' ? '800' : '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '-2px',
            transition: 'all 0.15s'
          }}
        >
          <Layers size={16} />
          <span>SaaS Plan Tiers & Module Bundles ({activePlans.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('matrix')}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'none',
            borderBottom: activeTab === 'matrix' ? '3px solid #0d9488' : '3px solid transparent',
            color: activeTab === 'matrix' ? '#0d9488' : '#64748b',
            fontSize: '14px',
            fontWeight: activeTab === 'matrix' ? '800' : '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '-2px',
            transition: 'all 0.15s'
          }}
        >
          <Tag size={16} />
          <span>Per-Module Add-on Pricing Matrix ({allModules.length} Modules)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('capacity')}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'none',
            borderBottom: activeTab === 'capacity' ? '3px solid #0d9488' : '3px solid transparent',
            color: activeTab === 'capacity' ? '#0d9488' : '#64748b',
            fontSize: '14px',
            fontWeight: activeTab === 'capacity' ? '800' : '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '-2px',
            transition: 'all 0.15s'
          }}
        >
          <Settings size={16} />
          <span>Capacity & Tax Rates (Seats, Channels, GST)</span>
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────────
          TAB 1: SAAS PLAN TIERS & MODULE BUNDLES
         ───────────────────────────────────────────────────────────────── */}
      {activeTab === 'plans' && (
        <div>
          {/* Plan Selector Carousel / Pills */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '12px',
            marginBottom: '20px'
          }}>
            {activePlans.map(plan => {
              const isSelected = plan.id === selectedPlanId;
              const includedCount = (plan.includedModules || []).length;
              return (
                <div
                  key={plan.id}
                  onClick={() => setSelectedPlanId(plan.id)}
                  style={{
                    background: isSelected ? '#f0fdf9' : '#ffffff',
                    border: isSelected ? '2px solid #0d9488' : '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '14px 16px',
                    cursor: 'pointer',
                    boxShadow: isSelected ? '0 4px 12px rgba(13, 148, 136, 0.15)' : '0 1px 3px rgba(0,0,0,0.03)',
                    transition: 'all 0.15s ease',
                    position: 'relative'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontSize: '14px', fontWeight: '800', color: isSelected ? '#0f766e' : '#0f2b26' }}>
                      {plan.name}
                    </span>
                    {plan.isPopular && (
                      <span style={{ fontSize: '9px', fontWeight: '800', background: '#f59e0b', color: '#ffffff', padding: '1px 6px', borderRadius: '4px' }}>
                        POPULAR
                      </span>
                    )}
                    {plan.isTrial && (
                      <span style={{ fontSize: '9px', fontWeight: '800', background: '#64748b', color: '#ffffff', padding: '1px 6px', borderRadius: '4px' }}>
                        TRIAL
                      </span>
                    )}
                  </div>

                  <div style={{ fontSize: '18px', fontWeight: '800', color: '#0f2b26', marginBottom: '4px' }}>
                    {plan.isTrial ? 'Free' : formatINR(plan.basePriceMonthly || 0)}
                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '500' }}> / mo</span>
                  </div>

                  <div style={{ fontSize: '11px', color: '#64748b', display: 'flex', justifyContent: 'space-between' }}>
                    <span>{plan.includedSeats || 5} Seats • {plan.includedChannels || 1} Ch</span>
                    <span style={{ fontWeight: '700', color: '#0d9488' }}>📦 {includedCount} Modules</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Current Selected Plan Full Configuration Card */}
          {currentPlan && (
            <div style={{
              background: '#ffffff',
              borderRadius: '14px',
              border: '1px solid #e2e8f0',
              padding: '24px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
            }}>
              
              {/* Card Header with Delete button */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '14px', borderBottom: '1px solid #f1f5f9' }}>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f2b26', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>✏️ Editing Plan: <strong>{currentPlan.name}</strong></span>
                    <span style={{ fontFamily: 'monospace', fontSize: '12px', background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: '6px' }}>
                      id: {currentPlan.id}
                    </span>
                  </h3>
                  <span style={{ fontSize: '12.5px', color: '#64748b' }}>
                    Configure the plan's commercial rates, team capacities, and check which platform modules are included for free.
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleDeletePlan(currentPlan.id)}
                  style={{
                    background: '#fef2f2',
                    border: '1px solid #fee2e2',
                    color: '#ef4444',
                    padding: '7px 14px',
                    borderRadius: '8px',
                    fontSize: '12.5px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'background 0.15s'
                  }}
                >
                  <Trash2 size={14} />
                  <span>Delete Plan Tier</span>
                </button>
              </div>

              {/* 2-Column Inputs Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                    Display Plan Name
                  </label>
                  <input
                    type="text"
                    value={currentPlan.name || ''}
                    onChange={(e) => updateCurrentPlan('name', e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                    Marketing Tagline
                  </label>
                  <input
                    type="text"
                    value={currentPlan.tagline || ''}
                    onChange={(e) => updateCurrentPlan('tagline', e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                    Base Monthly Price (₹ INR)
                  </label>
                  <input
                    type="number"
                    value={currentPlan.basePriceMonthly || 0}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10) || 0;
                      updateCurrentPlan('basePriceMonthly', val);
                      // Auto-suggest yearly price if yearly not explicitly set differently
                      if (currentPlan.basePriceYearly === currentPlan.basePriceMonthly * 10) {
                        updateCurrentPlan('basePriceYearly', val * 10);
                      }
                    }}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', boxSizing: 'border-box', fontWeight: '700', color: '#0d9488' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                    Base Yearly Price (₹ INR - Typically 10x Monthly)
                  </label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <input
                      type="number"
                      value={currentPlan.basePriceYearly || 0}
                      onChange={(e) => updateCurrentPlan('basePriceYearly', parseInt(e.target.value, 10) || 0)}
                      style={{ flex: 1, padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', boxSizing: 'border-box', fontWeight: '700', color: '#0d9488' }}
                    />
                    <button
                      type="button"
                      onClick={() => updateCurrentPlan('basePriceYearly', (currentPlan.basePriceMonthly || 0) * 10)}
                      style={{ padding: '0 10px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '11px', fontWeight: '700', color: '#334155', cursor: 'pointer', whiteSpace: 'nowrap' }}
                      title="Set yearly to 10 months price (2 months free)"
                    >
                      10x Monthly
                    </button>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                    Included Employee Seats
                  </label>
                  <input
                    type="number"
                    value={currentPlan.includedSeats || 5}
                    onChange={(e) => updateCurrentPlan('includedSeats', parseInt(e.target.value, 10) || 1)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                    Included WhatsApp Channels
                  </label>
                  <input
                    type="number"
                    value={currentPlan.includedChannels || 1}
                    onChange={(e) => updateCurrentPlan('includedChannels', parseInt(e.target.value, 10) || 1)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              {/* Toggles: Popular, Trial */}
              <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', background: '#f8fafc', padding: '14px 18px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '700', color: '#334155' }}>
                  <input
                    type="checkbox"
                    checked={!!currentPlan.isPopular}
                    onChange={(e) => updateCurrentPlan('isPopular', e.target.checked)}
                    style={{ width: '16px', height: '16px', accentColor: '#f59e0b', cursor: 'pointer' }}
                  />
                  <span>Mark as "Most Popular" Recommended Badge</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '700', color: '#334155' }}>
                  <input
                    type="checkbox"
                    checked={!!currentPlan.isTrial}
                    onChange={(e) => updateCurrentPlan('isTrial', e.target.checked)}
                    style={{ width: '16px', height: '16px', accentColor: '#0d9488', cursor: 'pointer' }}
                  />
                  <span>Free Trial Tier (Bypasses upfront payment on signup)</span>
                </label>

                {currentPlan.isTrial && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>Trial Duration:</span>
                    <input
                      type="number"
                      min="1"
                      value={currentPlan.trialDays !== undefined ? currentPlan.trialDays : 7}
                      onChange={(e) => {
                        const val = e.target.value;
                        updateCurrentPlan('trialDays', val === '' ? '' : Math.max(1, parseInt(val, 10) || 1));
                      }}
                      onBlur={() => {
                        if (!currentPlan.trialDays || currentPlan.trialDays < 1) {
                          updateCurrentPlan('trialDays', 1);
                        }
                      }}
                      style={{ width: '60px', padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                    />
                    <span style={{ fontSize: '12px', color: '#64748b' }}>Days</span>
                  </div>
                )}
              </div>

              {/* Marketing Bullet Points */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                  Plan Marketing Highlights (One bullet per line - Displayed on Registration & Checkout)
                </label>
                <textarea
                  rows="3"
                  value={Array.isArray(currentPlan.features) ? currentPlan.features.join('\n') : (currentPlan.features || '')}
                  onChange={(e) => updateCurrentPlan('features', e.target.value.split('\n'))}
                  placeholder="5 Team Employee Seats&#10;1 Active WhatsApp Channel&#10;Cloud PBX Telecalling&#10;Official GST Tax Invoices"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12.5px', fontFamily: 'inherit', boxSizing: 'border-box' }}
                />
              </div>

              {/* ── INTERACTIVE CATEGORIZED MODULE CHECKBOXES ── */}
              <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <h4 style={{ fontSize: '14.5px', fontWeight: '800', color: '#0f2b26', margin: '0 0 2px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Layers size={16} color="#0d9488" />
                      <span>Modules Included In "{currentPlan.name}" For Free</span>
                      <span style={{ background: '#0d9488', color: '#ffffff', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '800' }}>
                        {(currentPlan.includedModules || []).length} / {allModules.length} Bundled
                      </span>
                    </h4>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>
                      Checked modules are bundled out-of-the-box in this plan. Unchecked modules can be sold as individual paid add-ons.
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={selectAllModulesForCurrentPlan}
                      style={{ padding: '6px 12px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '7px', fontSize: '12px', fontWeight: '700', color: '#0d9488', cursor: 'pointer' }}
                    >
                      ✓ Select All Modules
                    </button>
                    <button
                      type="button"
                      onClick={clearAllModulesForCurrentPlan}
                      style={{ padding: '6px 12px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '7px', fontSize: '12px', fontWeight: '700', color: '#64748b', cursor: 'pointer' }}
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                {/* Categorized Modules Grid */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {Object.entries(categorizedModules).map(([category, modules]) => (
                    <div key={category} style={{ background: '#ffffff', borderRadius: '10px', padding: '14px 16px', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '10px' }}>
                        {category} ({modules.filter(m => (currentPlan.includedModules || []).includes(m.id)).length}/{modules.length} Included)
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '8px' }}>
                        {modules.map(mod => {
                          const isIncluded = (currentPlan.includedModules || []).includes(mod.id);
                          const isGloballyOff = mod.isGloballyDisabled;
                          const addonPrice = modulePricing[mod.id] || 299;

                          if (isGloballyOff) {
                            return (
                              <div
                                key={mod.id}
                                title="Disabled globally in Module Provisioning"
                                style={{
                                  padding: '8px 10px',
                                  borderRadius: '8px',
                                  background: '#f1f5f9',
                                  border: '1px dashed #cbd5e1',
                                  color: '#94a3b8',
                                  fontSize: '12px',
                                  fontWeight: '600',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  opacity: 0.6
                                }}
                              >
                                <Lock size={12} />
                                <span>{mod.icon} {mod.name} (Off Globally)</span>
                              </div>
                            );
                          }

                          return (
                            <div
                              key={mod.id}
                              onClick={() => toggleModuleInCurrentPlan(mod.id)}
                              style={{
                                padding: '8px 12px',
                                borderRadius: '8px',
                                border: isIncluded ? '1.5px solid #0d9488' : '1px solid #cbd5e1',
                                background: isIncluded ? '#f0fdf9' : '#ffffff',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                transition: 'all 0.12s ease'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <input
                                  type="checkbox"
                                  checked={isIncluded}
                                  onChange={() => {}}
                                  style={{ accentColor: '#0d9488', cursor: 'pointer' }}
                                />
                                <div>
                                  <div style={{ fontSize: '12.5px', fontWeight: isIncluded ? '700' : '600', color: isIncluded ? '#0f766e' : '#1e293b' }}>
                                    {mod.icon} {mod.name}
                                  </div>
                                </div>
                              </div>

                              <span style={{
                                fontSize: '10.5px',
                                fontWeight: '700',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                background: isIncluded ? '#ccfbf1' : '#f1f5f9',
                                color: isIncluded ? '#0f766e' : '#64748b'
                              }}>
                                {isIncluded ? 'FREE' : `+₹${addonPrice}/mo`}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────
          TAB 2: PER-MODULE ADD-ON PRICING MATRIX
         ───────────────────────────────────────────────────────────────── */}
      {activeTab === 'matrix' && (
        <div style={{ background: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '17px', fontWeight: '800', color: '#0f2b26', margin: '0 0 4px 0' }}>
              Individual Module Add-on Selling Prices (₹ / Month)
            </h3>
            <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
              Set the exact standalone monthly price for each platform module when a company adds it as an add-on or when unbundled from their base plan.
            </p>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569', textAlign: 'left' }}>
                  <th style={{ padding: '12px 14px', fontWeight: '800' }}>Platform Module</th>
                  <th style={{ padding: '12px 14px', fontWeight: '800' }}>Category</th>
                  <th style={{ padding: '12px 14px', fontWeight: '800' }}>Bundled Free In Plans</th>
                  <th style={{ padding: '12px 14px', fontWeight: '800', minWidth: '180px' }}>Add-on Price (₹ / Mo)</th>
                  <th style={{ padding: '12px 14px', fontWeight: '800' }}>Quick Presets</th>
                </tr>
              </thead>
              <tbody>
                {allModules.map((mod, idx) => {
                  const currentPrice = modulePricing[mod.id] !== undefined ? modulePricing[mod.id] : 299;
                  const bundledPlans = activePlans.filter(p => (p.includedModules || []).includes(mod.id));

                  return (
                    <tr key={mod.id} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? '#ffffff' : '#fafafa' }}>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '18px' }}>{mod.icon}</span>
                          <div>
                            <div style={{ fontWeight: '700', color: '#0f172a' }}>{mod.name}</div>
                            <div style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>id: {mod.id}</div>
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: '12px 14px', color: '#64748b', fontWeight: '600', fontSize: '12px' }}>
                        {mod.category}
                      </td>

                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {bundledPlans.length > 0 ? (
                            bundledPlans.map(p => (
                              <span key={p.id} style={{ fontSize: '10.5px', fontWeight: '700', background: '#e0f2fe', color: '#0369a1', padding: '2px 7px', borderRadius: '4px' }}>
                                {p.name}
                              </span>
                            ))
                          ) : (
                            <span style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic' }}>
                              Standalone Only (No bundle)
                            </span>
                          )}
                        </div>
                      </td>

                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontWeight: '700', color: '#0f2b26' }}>₹</span>
                          <input
                            type="number"
                            min="0"
                            step="50"
                            value={currentPrice}
                            onChange={(e) => updateModulePrice(mod.id, e.target.value)}
                            style={{
                              width: '90px',
                              padding: '6px 10px',
                              borderRadius: '6px',
                              border: '1.5px solid #0d9488',
                              fontWeight: '800',
                              fontSize: '13px',
                              color: '#0d9488',
                              outline: 'none',
                              textAlign: 'right'
                            }}
                          />
                          <span style={{ fontSize: '11px', color: '#64748b' }}>/ mo</span>
                        </div>
                      </td>

                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          {[199, 299, 499, 799].map(preset => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => updateModulePrice(mod.id, preset)}
                              style={{
                                padding: '3px 8px',
                                borderRadius: '5px',
                                border: currentPrice === preset ? '1px solid #0d9488' : '1px solid #cbd5e1',
                                background: currentPrice === preset ? '#f0fdf9' : '#ffffff',
                                color: currentPrice === preset ? '#0d9488' : '#475569',
                                fontSize: '11px',
                                fontWeight: '700',
                                cursor: 'pointer'
                              }}
                            >
                              ₹{preset}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────
          TAB 3: CAPACITY & TAX RATES
         ───────────────────────────────────────────────────────────────── */}
      {activeTab === 'capacity' && (
        <div style={{ background: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '17px', fontWeight: '800', color: '#0f2b26', margin: '0 0 4px 0' }}>
              Platform Capacity Limits & GST Tax Parameters
            </h3>
            <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
              Set marginal rates for additional employee seats, WhatsApp channels, fallback module pricing, and invoice GST percentages.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            <div style={{ background: '#f8fafc', padding: '18px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '800', color: '#0f2b26', marginBottom: '4px' }}>
                Extra Employee Seat Rate (₹ / Seat / Month)
              </label>
              <p style={{ fontSize: '11.5px', color: '#64748b', margin: '0 0 10px 0' }}>
                Charged per team member beyond the base seats included in the plan tier.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontWeight: '700' }}>₹</span>
                <input
                  type="number"
                  value={pricing.seatPricePerMonth || 199}
                  onChange={(e) => updatePricingField('seatPricePerMonth', e.target.value)}
                  style={{ width: '120px', padding: '8px 12px', borderRadius: '7px', border: '1px solid #cbd5e1', fontWeight: '800', fontSize: '14px', color: '#0d9488' }}
                />
                <span style={{ fontSize: '12px', color: '#64748b' }}>/ seat / month</span>
              </div>
            </div>

            <div style={{ background: '#f8fafc', padding: '18px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '800', color: '#0f2b26', marginBottom: '4px' }}>
                Extra WhatsApp Channel Rate (₹ / Channel / Month)
              </label>
              <p style={{ fontSize: '11.5px', color: '#64748b', margin: '0 0 10px 0' }}>
                Charged per connected WhatsApp Business API phone number beyond base.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontWeight: '700' }}>₹</span>
                <input
                  type="number"
                  value={pricing.channelPricePerMonth || 499}
                  onChange={(e) => updatePricingField('channelPricePerMonth', e.target.value)}
                  style={{ width: '120px', padding: '8px 12px', borderRadius: '7px', border: '1px solid #cbd5e1', fontWeight: '800', fontSize: '14px', color: '#0d9488' }}
                />
                <span style={{ fontSize: '12px', color: '#64748b' }}>/ channel / month</span>
              </div>
            </div>

            <div style={{ background: '#f8fafc', padding: '18px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '800', color: '#0f2b26', marginBottom: '4px' }}>
                Default Add-on Module Fallback Rate (₹ / Month)
              </label>
              <p style={{ fontSize: '11.5px', color: '#64748b', margin: '0 0 10px 0' }}>
                Used if a module doesn't have an explicit custom price in the matrix.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontWeight: '700' }}>₹</span>
                <input
                  type="number"
                  value={pricing.moduleAddonPriceDefault || 299}
                  onChange={(e) => updatePricingField('moduleAddonPriceDefault', e.target.value)}
                  style={{ width: '120px', padding: '8px 12px', borderRadius: '7px', border: '1px solid #cbd5e1', fontWeight: '800', fontSize: '14px', color: '#0d9488' }}
                />
                <span style={{ fontSize: '12px', color: '#64748b' }}>/ module / month</span>
              </div>
            </div>

            <div style={{ background: '#f8fafc', padding: '18px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '800', color: '#0f2b26', marginBottom: '4px' }}>
                Indian GST Tax Rate (%)
              </label>
              <p style={{ fontSize: '11.5px', color: '#64748b', margin: '0 0 10px 0' }}>
                Standard SAC Code 998313 (Software as a Service Cloud Provisioning).
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <input
                  type="number"
                  value={pricing.taxRatePercent || 18}
                  onChange={(e) => updatePricingField('taxRatePercent', e.target.value)}
                  style={{ width: '80px', padding: '8px 12px', borderRadius: '7px', border: '1px solid #cbd5e1', fontWeight: '800', fontSize: '14px', color: '#0d9488' }}
                />
                <span style={{ fontSize: '13px', fontWeight: '700', color: '#475569' }}>% GST</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Save Bar */}
      <div style={{
        position: 'sticky',
        bottom: '16px',
        marginTop: '20px',
        background: '#0f172a',
        borderRadius: '12px',
        padding: '12px 20px',
        color: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 8px 24px rgba(15, 23, 42, 0.35)',
        zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Sparkles size={16} color="#2dd4bf" />
          <span style={{ fontSize: '13px', fontWeight: '600', color: '#cbd5e1' }}>
            Ready to publish plans & pricing live to the onboarding engine?
          </span>
        </div>

        <button
          type="button"
          onClick={handleSaveLive}
          disabled={saving}
          style={{
            padding: '8px 20px',
            background: '#0d9488',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: '800',
            cursor: saving ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 2px 8px rgba(13, 148, 136, 0.4)'
          }}
        >
          <Save size={15} />
          <span>{saving ? 'Publishing...' : 'Publish Live Now'}</span>
        </button>
      </div>

    </div>
  );
}
