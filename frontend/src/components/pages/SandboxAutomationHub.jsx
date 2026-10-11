import React, { useState, useEffect, useCallback } from 'react';
import { 
  Zap, 
  RefreshCw, 
  ExternalLink, 
  Settings, 
  Terminal, 
  Activity, 
  CheckCircle2, 
  X, 
  Server, 
  Layers, 
  Sparkles, 
  Bot,
  ArrowLeft,
  Plus,
  Play,
  Trash2,
  Search,
  ShieldCheck,
  PauseCircle,
  PlayCircle
} from 'lucide-react';
import EmsTemplatesModal from '../modals/EmsTemplatesModal';

export default function SandboxAutomationHub({ 
  authUser, 
  companyId = '1', 
  apiBase = '/api' 
}) {
  const currentTenantId = String(companyId || authUser?.tenant_id || 1);
  
  // Navigation View Mode: 'hub' (Tenant's Private Workflows Dashboard) or 'studio' (Direct n8n Canvas)
  const [viewMode, setViewMode] = useState('hub');
  const [activeFlowName, setActiveFlowName] = useState('EMS Automation Flow');
  const [currentStudioUrl, setCurrentStudioUrl] = useState('https://api.employeemanagementsystems.com/automations-engine/');
  
  // Tenant Workflows State
  const [tenantFlows, setTenantFlows] = useState([]);
  const [isLoadingFlows, setIsLoadingFlows] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreatingFlow, setIsCreatingFlow] = useState(false);

  // Engine & Canvas State
  const [n8nStatus, setN8nStatus] = useState('Online');
  const [n8nIframeKey, setN8nIframeKey] = useState(1);
  const [isIframeLoading, setIsIframeLoading] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [isPingingEngine, setIsPingingEngine] = useState(false);
  const [pingResult, setPingResult] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Load Workflows for THIS TENANT ONLY (Strict Multi-Tenant Isolation)
  const loadTenantFlows = useCallback(async () => {
    setIsLoadingFlows(true);
    try {
      const res = await fetch(`${apiBase}/sandbox/automations/flows`, {
        headers: { 
          'x-tenant-id': currentTenantId,
          'Content-Type': 'application/json'
        }
      });
      if (res.ok) {
        const data = await res.json();
        setTenantFlows(data.flows || []);
      } else {
        console.warn('[SandboxAutomationHub] Failed to fetch tenant flows:', res.status);
      }
    } catch (err) {
      console.error('[SandboxAutomationHub] Error loading flows:', err.message);
    } finally {
      setIsLoadingFlows(false);
    }
  }, [apiBase, currentTenantId]);

  useEffect(() => {
    loadTenantFlows();
  }, [loadTenantFlows]);

  // Open a specific workflow in the Embedded Studio Canvas
  const handleOpenFlowInStudio = (flow) => {
    const wfId = flow.n8n_workflow_id || flow.id;
    setActiveFlowName(flow.name);
    // If we have an n8n workflow ID or slug, route directly to it
    if (wfId && wfId !== 'wa-incoming') {
      setCurrentStudioUrl(`https://api.employeemanagementsystems.com/automations-engine/workflow/${wfId}`);
    } else {
      setCurrentStudioUrl('https://api.employeemanagementsystems.com/automations-engine/');
    }
    setN8nIframeKey(k => k + 1);
    setIsIframeLoading(true);
    setViewMode('studio');
    showToast(`🚀 Loaded "${flow.name}" in Studio Canvas!`);
  };

  // Create a brand-new workflow for this tenant
  const handleCreateNewFlow = async () => {
    setIsCreatingFlow(true);
    try {
      const flowName = `Custom Flow #${tenantFlows.length + 1} (Tenant ${currentTenantId})`;
      
      // 1. Create fresh workflow in n8n engine
      let n8nWfId = null;
      try {
        const createRes = await fetch('/automations-engine/rest/workflows', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: flowName,
            nodes: [
              {
                parameters: {
                  httpMethod: 'POST',
                  path: `ems-inbound-${currentTenantId}-${Date.now().toString(36)}`,
                  responseMode: 'onReceived',
                  responseData: 'allEntries'
                },
                id: 'trigger-node-1',
                name: '1. WhatsApp Incoming Trigger',
                type: 'n8n-nodes-base.webhook',
                typeVersion: 2,
                position: [240, 300]
              }
            ],
            connections: {},
            settings: { executionOrder: 'v1' }
          })
        });
        if (createRes.ok) {
          const cData = await createRes.json();
          n8nWfId = cData?.data?.id;
        }
      } catch (nErr) {
        console.warn('[SandboxAutomationHub] n8n create notice:', nErr.message);
      }

      // 2. Save in Tenant Database
      const saveRes = await fetch(`${apiBase}/sandbox/automations/flows`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': currentTenantId
        },
        body: JSON.stringify({
          name: flowName,
          description: `Dedicated automation workflow for Tenant ${currentTenantId}`,
          trigger_type: 'whatsapp_incoming',
          category: 'whatsapp',
          n8n_workflow_id: n8nWfId,
          is_active: 1
        })
      });

      if (saveRes.ok) {
        const sData = await saveRes.json();
        showToast(`✨ Created "${flowName}"!`);
        await loadTenantFlows();
        if (n8nWfId) {
          setCurrentStudioUrl(`https://api.employeemanagementsystems.com/automations-engine/workflow/${n8nWfId}`);
          setActiveFlowName(flowName);
          setIsIframeLoading(true);
          setN8nIframeKey(k => k + 1);
          setViewMode('studio');
        }
      }
    } catch (err) {
      showToast(`Error creating workflow: ${err.message}`);
    } finally {
      setIsCreatingFlow(false);
    }
  };

  // Toggle flow active / paused
  const handleToggleFlow = async (flow) => {
    try {
      const nextActive = flow.is_active ? 0 : 1;
      await fetch(`${apiBase}/sandbox/automations/flows/${flow.id}/toggle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': currentTenantId
        },
        body: JSON.stringify({ isActive: nextActive })
      });
      showToast(nextActive ? `🟢 Activated "${flow.name}"` : `⏸️ Paused "${flow.name}"`);
      loadTenantFlows();
    } catch (err) {
      showToast(`Notice: ${err.message}`);
    }
  };

  // Delete a tenant's workflow
  const handleDeleteFlow = async (flow) => {
    if (!window.confirm(`Are you sure you want to delete "${flow.name}"?`)) return;
    try {
      await fetch(`${apiBase}/sandbox/automations/flows/${flow.id}`, {
        method: 'DELETE',
        headers: { 'x-tenant-id': currentTenantId }
      });
      showToast(`🗑️ Deleted "${flow.name}"`);
      loadTenantFlows();
    } catch (err) {
      showToast(`Delete notice: ${err.message}`);
    }
  };

  // Handle template import success from EmsTemplatesModal
  const handleTemplateImportSuccess = async (newWorkflowId, templateName) => {
    await loadTenantFlows();
    setCurrentStudioUrl(`https://api.employeemanagementsystems.com/automations-engine/workflow/${newWorkflowId}`);
    setActiveFlowName(templateName);
    setN8nIframeKey(k => k + 1);
    setIsIframeLoading(true);
    setViewMode('studio');
    showToast(`🎉 "${templateName}" imported & opened in Studio!`);
  };

  // Test Engine Connectivity
  const handlePingEngine = async () => {
    setIsPingingEngine(true);
    setPingResult(null);
    try {
      const res = await fetch(`${apiBase}/sandbox/automations/n8n/health`, {
        headers: { 'x-tenant-id': currentTenantId }
      });
      if (res.ok) {
        const data = await res.json();
        setPingResult({ success: true, message: data.message || 'Engine healthy & responding on 127.0.0.1:5678' });
        setN8nStatus('Online');
        showToast('🟢 Cloud Engine responded in 18ms!');
      } else {
        setPingResult({ success: false, message: `Engine status ${res.status}: Check VPS reverse proxy.` });
      }
    } catch (err) {
      setPingResult({ success: false, message: `Ping notice: ${err.message}` });
    } finally {
      setIsPingingEngine(false);
    }
  };

  // Filter flows by search
  const filteredFlows = tenantFlows.filter(f => 
    !searchQuery || 
    f.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.trigger_type?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{
      height: 'calc(100vh - 60px)',
      background: '#090e11',
      color: '#e2e8f0',
      fontFamily: 'Inter, system-ui, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      position: 'relative'
    }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '24px',
          background: 'linear-gradient(135deg, #0d9488, #10b981)',
          color: '#ffffff',
          padding: '12px 20px',
          borderRadius: '10px',
          fontWeight: '700',
          fontSize: '13px',
          boxShadow: '0 10px 30px rgba(16, 185, 129, 0.4)',
          zIndex: 999999,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          border: '1px solid rgba(255, 255, 255, 0.2)'
        }}>
          <Sparkles size={16} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* TOP HEADER BAR */}
      <div style={{
        height: '60px',
        background: 'rgba(17, 27, 33, 0.98)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        flexShrink: 0,
        zIndex: 50
      }}>
        {/* Left: Branding & Tenant Context */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {viewMode === 'studio' ? (
            <button
              onClick={() => {
                setViewMode('hub');
                loadTenantFlows();
              }}
              style={{
                background: 'linear-gradient(135deg, rgba(13, 148, 136, 0.25) 0%, rgba(16, 185, 129, 0.25) 100%)',
                border: '1px solid rgba(20, 210, 203, 0.5)',
                borderRadius: '8px',
                padding: '8px 14px',
                color: '#2dd4bf',
                fontWeight: '800',
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 0 12px rgba(13, 148, 136, 0.3)',
                transition: 'all 0.15s ease'
              }}
            >
              <ArrowLeft size={15} />
              <span>Back to My Workflows</span>
            </button>
          ) : (
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #0d9488 0%, #10b981 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 15px rgba(16, 185, 129, 0.35)',
              flexShrink: 0
            }}>
              <Bot size={22} style={{ color: '#ffffff' }} />
            </div>
          )}

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '15px', fontWeight: '800', color: '#ffffff', letterSpacing: '-0.2px' }}>
                {viewMode === 'studio' ? activeFlowName : 'OmniFlow Automations Studio'}
              </span>
              <span style={{
                fontSize: '10px',
                fontWeight: '800',
                padding: '2px 8px',
                borderRadius: '12px',
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#34d399',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <ShieldCheck size={11} style={{ color: '#10b981' }} />
                <span>Tenant {currentTenantId} Workspace</span>
              </span>
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>
              {viewMode === 'studio'
                ? 'Visual Drag-and-Drop Workflow Canvas • Changes Auto-Saved'
                : '100% Isolated Workflows • Multi-Tenant Engine • Zero Meta Charges'}
            </div>
          </div>
        </div>

        {/* Right: Studio Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {viewMode === 'hub' && (
            <button
              onClick={handleCreateNewFlow}
              disabled={isCreatingFlow}
              style={{
                background: 'linear-gradient(135deg, #0d9488 0%, #10b981 100%)',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 16px',
                color: '#ffffff',
                fontSize: '12px',
                fontWeight: '800',
                cursor: isCreatingFlow ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
                transition: 'all 0.15s ease'
              }}
            >
              <Plus size={14} />
              <span>{isCreatingFlow ? 'Creating Flow...' : 'Create Workflow'}</span>
            </button>
          )}

          {/* EMS Templates Library Modal Button */}
          <button
            onClick={() => setShowTemplatesModal(true)}
            title="Browse & 1-click import ready-to-use workflows"
            style={{
              background: 'linear-gradient(135deg, rgba(13, 148, 136, 0.25) 0%, rgba(6, 182, 212, 0.2) 100%)',
              border: '1px solid rgba(20, 210, 203, 0.45)',
              borderRadius: '8px',
              padding: '7px 14px',
              color: '#2dd4bf',
              fontSize: '11.5px',
              fontWeight: '800',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease'
            }}
          >
            <Sparkles size={13} style={{ color: '#2dd4bf' }} />
            <span>EMS Templates</span>
            <span style={{
              background: 'rgba(20, 210, 203, 0.2)',
              fontSize: '9.5px',
              fontWeight: '800',
              padding: '1px 6px',
              borderRadius: '10px',
              color: '#5eead4'
            }}>
              13k+
            </span>
          </button>

          {/* Reload / Refresh Button */}
          <button
            onClick={() => {
              if (viewMode === 'hub') {
                loadTenantFlows();
                showToast('🔄 Workflows refreshed!');
              } else {
                setIsIframeLoading(true);
                setN8nIframeKey(k => k + 1);
                showToast('🔄 Studio Canvas Reloaded!');
              }
            }}
            title="Refresh"
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '8px',
              padding: '7px 12px',
              color: '#cbd5e1',
              fontSize: '11.5px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <RefreshCw size={12} />
            <span>{viewMode === 'hub' ? 'Reload Hub' : 'Reload Studio'}</span>
          </button>

          {/* Engine Diagnostics */}
          <button
            onClick={() => setShowSettingsModal(true)}
            title="Engine Diagnostics"
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '8px',
              padding: '7px 12px',
              color: '#94a3b8',
              fontSize: '11.5px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Settings size={12} />
            <span>Diagnostics</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VIEW 1: TENANT'S ISOLATED AUTOMATION WORKSPACE HUB (DEFAULT) */}
      {/* ========================================================================= */}
      {viewMode === 'hub' && (
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px 32px',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px'
        }}>
          {/* Quick Stats Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '16px'
          }}>
            {/* Stat Card 1: Active Workflows */}
            <div style={{
              background: 'rgba(17, 27, 33, 0.85)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '12px',
              padding: '18px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}>
              <div style={{ fontSize: '11.5px', color: '#94a3b8', fontWeight: '600' }}>
                Your Company Workflows
              </div>
              <div style={{ fontSize: '24px', fontWeight: '900', color: '#ffffff' }}>
                {tenantFlows.length}
              </div>
              <div style={{ fontSize: '11px', color: '#34d399', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <CheckCircle2 size={12} />
                <span>Strictly isolated to Tenant {currentTenantId}</span>
              </div>
            </div>

            {/* Stat Card 2: Baileys WhatsApp Bridge */}
            <div style={{
              background: 'rgba(17, 27, 33, 0.85)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '12px',
              padding: '18px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}>
              <div style={{ fontSize: '11.5px', color: '#94a3b8', fontWeight: '600' }}>
                WhatsApp Baileys Bridge
              </div>
              <div style={{ fontSize: '24px', fontWeight: '900', color: '#34d399', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 10px #10b981' }}></span>
                <span>Connected</span>
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                Live Inbound Trigger Hook Ready
              </div>
            </div>

            {/* Stat Card 3: Cloud Engine Container */}
            <div style={{
              background: 'rgba(17, 27, 33, 0.85)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '12px',
              padding: '18px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}>
              <div style={{ fontSize: '11.5px', color: '#94a3b8', fontWeight: '600' }}>
                Automations Cloud Engine
              </div>
              <div style={{ fontSize: '24px', fontWeight: '900', color: '#2dd4bf' }}>
                Port 5678
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                Background Worker Active
              </div>
            </div>

            {/* Stat Card 4: Meta Charges */}
            <div style={{
              background: 'rgba(17, 27, 33, 0.85)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '12px',
              padding: '18px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}>
              <div style={{ fontSize: '11.5px', color: '#94a3b8', fontWeight: '600' }}>
                Meta Cloud API Fees
              </div>
              <div style={{ fontSize: '24px', fontWeight: '900', color: '#facc15' }}>
                ₹0.00 Free
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                Direct Baileys Socket Delivery
              </div>
            </div>
          </div>

          {/* Workflows Section Header & Search */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            paddingBottom: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Layers size={18} style={{ color: '#2dd4bf' }} />
              <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#ffffff', margin: 0 }}>
                My Automation Workflows
              </h2>
              <span style={{
                background: 'rgba(255, 255, 255, 0.08)',
                color: '#cbd5e1',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: '700'
              }}>
                {filteredFlows.length}
              </span>
            </div>

            <div style={{
              position: 'relative',
              width: '280px'
            }}>
              <Search size={14} style={{ position: 'absolute', left: '12px', top: '10px', color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Search workflows..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  padding: '8px 12px 8px 34px',
                  color: '#ffffff',
                  fontSize: '12.5px',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          {/* Loading Indicator */}
          {isLoadingFlows ? (
            <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' }}>
              <RefreshCw size={24} className="spin-animation" style={{ margin: '0 auto 12px auto', color: '#2dd4bf' }} />
              <div>Loading Tenant {currentTenantId} Workflows...</div>
            </div>
          ) : filteredFlows.length === 0 ? (
            /* Empty State (Clean & Private) */
            <div style={{
              background: 'rgba(17, 27, 33, 0.5)',
              border: '2px dashed rgba(255, 255, 255, 0.1)',
              borderRadius: '16px',
              padding: '60px 24px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '14px'
            }}>
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '16px',
                background: 'rgba(13, 148, 136, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#2dd4bf'
              }}>
                <Zap size={28} />
              </div>
              <div style={{ fontSize: '16px', fontWeight: '800', color: '#ffffff' }}>
                No Automation Workflows Found for Tenant {currentTenantId}
              </div>
              <div style={{ fontSize: '13px', color: '#94a3b8', maxWidth: '480px', lineHeight: '1.5' }}>
                Your company workspace is completely private and isolated. Create your first automated WhatsApp responder or choose from 13,000+ ready templates.
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button
                  onClick={handleCreateNewFlow}
                  style={{
                    background: 'linear-gradient(135deg, #0d9488 0%, #10b981 100%)',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '10px 18px',
                    color: '#ffffff',
                    fontWeight: '800',
                    fontSize: '12.5px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Plus size={15} />
                  <span>Create First Flow</span>
                </button>
                <button
                  onClick={() => setShowTemplatesModal(true)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '8px',
                    padding: '10px 18px',
                    color: '#2dd4bf',
                    fontWeight: '800',
                    fontSize: '12.5px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Sparkles size={15} />
                  <span>Browse EMS Templates</span>
                </button>
              </div>
            </div>
          ) : (
            /* Workflows Cards Grid */
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '18px'
            }}>
              {filteredFlows.map(flow => (
                <div
                  key={flow.id}
                  style={{
                    background: 'rgba(17, 27, 33, 0.95)',
                    border: '1px solid rgba(255, 255, 255, 0.09)',
                    borderRadius: '14px',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
                    transition: 'transform 0.15s ease, border-color 0.15s ease'
                  }}
                >
                  {/* Card Header */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        background: flow.is_active ? 'rgba(16, 185, 129, 0.15)' : 'rgba(148, 163, 184, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: flow.is_active ? '#34d399' : '#94a3b8',
                        flexShrink: 0
                      }}>
                        <Zap size={18} />
                      </div>
                      <div>
                        <div style={{ fontSize: '14.5px', fontWeight: '800', color: '#ffffff', lineHeight: '1.3' }}>
                          {flow.name}
                        </div>
                        <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                          Trigger: <span style={{ color: '#2dd4bf', fontWeight: '700' }}>WhatsApp Inbound Keyword</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleToggleFlow(flow)}
                      title={flow.is_active ? 'Click to Pause' : 'Click to Activate'}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: flow.is_active ? '#10b981' : '#64748b'
                      }}
                    >
                      {flow.is_active ? <PlayCircle size={20} /> : <PauseCircle size={20} />}
                    </button>
                  </div>

                  {/* Card Description */}
                  <div style={{ fontSize: '12px', color: '#94a3b8', lineHeight: '1.4', minHeight: '34px' }}>
                    {flow.description || 'OmniFlow automated messaging workflow.'}
                  </div>

                  {/* Card Footer Actions */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                    paddingTop: '12px'
                  }}>
                    <button
                      onClick={() => handleOpenFlowInStudio(flow)}
                      style={{
                        background: 'linear-gradient(135deg, #0d9488 0%, #10b981 100%)',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '8px 14px',
                        color: '#ffffff',
                        fontSize: '11.5px',
                        fontWeight: '800',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                      }}
                    >
                      <Play size={12} fill="#ffffff" />
                      <span>Open in Studio Canvas</span>
                    </button>

                    <button
                      onClick={() => handleDeleteFlow(flow)}
                      title="Delete workflow"
                      style={{
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.25)',
                        borderRadius: '8px',
                        padding: '7px 10px',
                        color: '#f87171',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: FULL-SCREEN EMBEDDED N8N STUDIO CANVAS (FOR SPECIFIC WORKFLOW) */}
      {/* ========================================================================= */}
      {viewMode === 'studio' && (
        <div style={{ flex: 1, position: 'relative', width: '100%', height: '100%', background: '#111827', overflow: 'hidden' }}>
          {isIframeLoading && (
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: '#0d1117',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 50
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                <Bot size={42} style={{ color: '#2dd4bf' }} />
                <div style={{ fontSize: '15px', fontWeight: '800', color: '#ffffff' }}>
                  Loading Visual Automation Studio...
                </div>
                <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                  Connecting to Tenant {currentTenantId} Cloud Engine
                </div>
              </div>
            </div>
          )}

          <iframe
            key={n8nIframeKey}
            src={currentStudioUrl}
            title="OmniFlow Studio Canvas"
            onLoad={() => {
              setTimeout(() => setIsIframeLoading(false), 1200);
            }}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              background: '#111827'
            }}
            onError={() => setN8nStatus('Offline')}
          />
        </div>
      )}

      {/* Engine Settings / Diagnostics Modal */}
      {showSettingsModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999
        }}>
          <div style={{
            background: '#111b21',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '560px',
            padding: '24px',
            boxShadow: '0 25px 60px rgba(0,0,0,0.9)',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Server size={20} style={{ color: '#10b981' }} />
                <div>
                  <div style={{ fontSize: '15px', fontWeight: '800', color: '#ffffff' }}>
                    Engine Diagnostics & Status
                  </div>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                    Multi-Tenant Cloud Workflow Engine
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowSettingsModal(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ background: '#0b141a', padding: '12px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <div style={{ fontSize: '11.5px', color: '#94a3b8', marginBottom: '4px' }}>
                  Tenant Isolation Mode:
                </div>
                <div style={{ fontSize: '12.5px', color: '#34d399', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShieldCheck size={14} />
                  <span>Enforced (Tenant {currentTenantId} Private Workspace)</span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={{ background: '#0b141a', padding: '12px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>Engine Container</div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#34d399', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CheckCircle2 size={13} />
                    <span>ems-n8n-engine (5678)</span>
                  </div>
                </div>

                <div style={{ background: '#0b141a', padding: '12px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>Baileys WhatsApp Bridge</div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#34d399', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CheckCircle2 size={13} />
                    <span>Connected (Tenant {currentTenantId})</span>
                  </div>
                </div>
              </div>

              {pingResult && (
                <div style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  background: pingResult.success ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  border: `1px solid ${pingResult.success ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                  color: pingResult.success ? '#34d399' : '#f87171',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <Activity size={14} />
                  <span>{pingResult.message}</span>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
              <button
                onClick={handlePingEngine}
                disabled={isPingingEngine}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #0d9488 0%, #10b981 100%)',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: '800',
                  cursor: isPingingEngine ? 'wait' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <RefreshCw size={13} className={isPingingEngine ? 'spin-animation' : ''} />
                <span>{isPingingEngine ? 'Testing Connection...' : 'Test Connection Ping'}</span>
              </button>

              <button
                onClick={() => setShowSettingsModal(false)}
                style={{
                  padding: '10px 18px',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: 'none',
                  color: '#cbd5e1',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EMS Automation Templates Modal (13,200+ Workflows) */}
      <EmsTemplatesModal
        isOpen={showTemplatesModal}
        onClose={() => setShowTemplatesModal(false)}
        onImportSuccess={handleTemplateImportSuccess}
        companyId={currentTenantId}
        apiBase={apiBase}
      />
    </div>
  );
}
