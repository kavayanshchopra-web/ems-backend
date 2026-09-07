import React, { useState, useMemo } from 'react';
import { Sliders, CheckCircle, Search, Layers, Database, Shield, Zap, Sparkles, ArrowLeft } from 'lucide-react';
import ModuleConfigEditor from '../config/ModuleConfigEditor';
import { moduleConfigService } from '../../services/moduleConfigService';
import { SUPER_ADMIN_INTERNAL_MODELS } from '../../core/registry/manifests/superAdmin.manifest';
import SearchInput from '../ui/SearchInput';

/**
 * Super Admin Master Model Configuration Studio
 * Visual, isolated, capability-driven model configuration hub.
 * Auto-discovers Super Admin internal models and all platform EMS modules.
 */
export default function SuperAdminModelStudio({
  showToast = () => {},
  authUser = null
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedModuleId, setSelectedModuleId] = useState(null);
  const [refreshTick, setRefreshTick] = useState(0);

  // Dynamic modules aggregation: Super Admin internal schemas + Global platform modules
  const allAvailableModels = useMemo(() => {
    const registered = moduleConfigService.getRegisteredModules() || [];
    
    // Normalize Super Admin internal models
    const internalNormalized = (SUPER_ADMIN_INTERNAL_MODELS || []).map(m => ({
      ...m,
      isInternalSuperAdmin: true,
      category: 'SUPER ADMIN INTERNAL'
    }));

    // Combine both: Internal models first, then platform modules
    const combined = [...internalNormalized, ...registered];

    // Ensure uniqueness by ID
    const seen = new Set();
    return combined.filter(item => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  }, [refreshTick]);

  // Dynamic categories
  const categories = useMemo(() => {
    const cats = new Set(allAvailableModels.map(m => (m.category || 'General').toUpperCase()));
    return ['ALL', ...Array.from(cats)];
  }, [allAvailableModels]);

  // Filtered modules
  const filteredModels = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return allAvailableModels.filter(m => {
      const matchCat = selectedCategory === 'ALL' || (m.category || '').toUpperCase() === selectedCategory;
      const matchQuery = !q ||
        (m.label || '').toLowerCase().includes(q) ||
        (m.description || '').toLowerCase().includes(q) ||
        (m.category || '').toLowerCase().includes(q) ||
        (m.id || '').toLowerCase().includes(q);
      return matchCat && matchQuery;
    });
  }, [allAvailableModels, selectedCategory, searchQuery]);

  const handleOpenConfig = (modId) => {
    setSelectedModuleId(modId);
  };

  const handleCloseEditor = () => {
    setSelectedModuleId(null);
    setRefreshTick(t => t + 1);
  };

  // Render Module Config Editor if a model is selected
  if (selectedModuleId) {
    const targetModel = allAvailableModels.find(m => m.id === selectedModuleId);
    const tenantKey = targetModel?.isInternalSuperAdmin ? 'superadmin_master' : 'default_tenant';
    
    // Retrieve existing config or build default payload
    let currentConfig = moduleConfigService.getModuleConfig(tenantKey, selectedModuleId);
    
    // Fallback to internal model defaults if not yet persisted in localStorage/Firestore
    if (!currentConfig || (!currentConfig.fields?.length && targetModel?.defaultFields)) {
      currentConfig = {
        moduleId: targetModel.id,
        schemaVersion: '1.1',
        fields: targetModel.defaultFields || [],
        summaryWidgets: targetModel.defaultSummaryWidgets || [],
        columns: targetModel.defaultColumns || [],
        views: { availableViews: ['list'], defaultView: 'list' }
      };
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Breadcrumb banner */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          background: '#f8fafc',
          padding: '12px 18px',
          borderRadius: '10px',
          border: '1px solid #e2e8f0'
        }}>
          <button
            onClick={handleCloseEditor}
            style={{
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              padding: '6px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              fontWeight: '700',
              color: '#0f172a',
              cursor: 'pointer'
            }}
          >
            <ArrowLeft size={14} />
            Back to Model Studio
          </button>
          <span style={{ fontSize: '13px', color: '#64748b' }}>/</span>
          <span style={{ fontSize: '13px', fontWeight: '800', color: '#0d9488' }}>
            {targetModel?.label || selectedModuleId}
          </span>
          {targetModel?.isInternalSuperAdmin && (
            <span style={{
              fontSize: '10px',
              fontWeight: '800',
              padding: '2px 8px',
              borderRadius: '6px',
              background: 'rgba(13, 148, 136, 0.1)',
              color: '#0d9488',
              border: '1px solid rgba(13, 148, 136, 0.2)'
            }}>
              🔒 SUPER ADMIN EXCLUSIVE
            </span>
          )}
        </div>

        <ModuleConfigEditor
          companyId={tenantKey}
          moduleDef={targetModel}
          initialConfig={currentConfig}
          onSaveConfig={(newCfg) => {
            moduleConfigService.saveModuleConfig(tenantKey, selectedModuleId, newCfg);
            showToast(`Saved master model configuration for ${targetModel?.label || selectedModuleId}!`, 'success');
            setRefreshTick(t => t + 1);
          }}
          onClose={handleCloseEditor}
          showToast={showToast}
        />
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '20px',
      padding: '24px',
      background: '#ffffff',
      borderRadius: '14px',
      border: '1px solid #e2e8f0',
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
    }}>
      {/* ── HEADER (Identical layout to Image 1) ── */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
        borderBottom: '1px solid #e2e8f0',
        paddingBottom: '18px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sliders size={22} style={{ color: '#0d9488' }} />
            <h2 style={{ margin: 0, fontSize: '19px', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.01em' }}>
              Master Model Configuration Studio
            </h2>
            <span style={{
              fontSize: '10.5px',
              fontWeight: '800',
              padding: '3px 8px',
              borderRadius: '12px',
              background: '#0d9488',
              color: '#ffffff'
            }}>
              {allAvailableModels.length} Models Registered
            </span>
          </div>
          <p style={{ margin: '3px 0 0 0', fontSize: '12.5px', color: '#64748b' }}>
            Configure forms, fields, summary widgets, list columns, and view settings across Super Admin domains and EMS modules.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <SearchInput
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onClear={() => setSearchQuery('')}
            placeholder="Search models..."
            width="280px"
          />
        </div>
      </div>

      {/* ── QUICK CATEGORY FILTER PILLS ── */}
      <div style={{
        display: 'flex',
        gap: '8px',
        overflowX: 'auto',
        paddingBottom: '4px'
      }} className="no-scrollbar">
        {categories.map(cat => {
          const isSelected = selectedCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                border: isSelected ? '1px solid #0d9488' : '1px solid #e2e8f0',
                background: isSelected ? '#0d9488' : '#f8fafc',
                color: isSelected ? '#ffffff' : '#475569',
                fontSize: '11.5px',
                fontWeight: isSelected ? '800' : '600',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease'
              }}
            >
              {cat === 'SUPER ADMIN INTERNAL' ? '👑 SUPER ADMIN INTERNAL' : cat}
            </button>
          );
        })}
      </div>

      {/* ── CATEGORY GROUPED MODEL CARDS ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
        {categories.filter(c => c !== 'ALL').map(catName => {
          const groupModels = filteredModels.filter(m => (m.category || '').toUpperCase() === catName);
          if (groupModels.length === 0) return null;

          return (
            <div key={catName} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '11px',
                fontWeight: '800',
                color: '#64748b',
                textTransform: 'uppercase',
                letterSpacing: '0.06em'
              }}>
                {catName === 'SUPER ADMIN INTERNAL' && <Shield size={13} style={{ color: '#0d9488' }} />}
                <span>{catName}</span>
                <span style={{
                  fontSize: '10px',
                  fontWeight: '700',
                  padding: '1px 6px',
                  borderRadius: '10px',
                  background: '#f1f5f9',
                  color: '#475569'
                }}>
                  {groupModels.length}
                </span>
              </div>

              {/* Grid of Cards */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: '14px'
              }}>
                {groupModels.map(mod => {
                  const tenantKey = mod.isInternalSuperAdmin ? 'superadmin_master' : 'default_tenant';
                  const savedCfg = moduleConfigService.getModuleConfig(tenantKey, mod.id);
                  
                  // Compute stats
                  const fieldCount = savedCfg?.fields?.length || mod.defaultFields?.length || 0;
                  const summaryCount = savedCfg?.summaryWidgets?.filter(w => w.enabled !== false)?.length ||
                                       mod.defaultSummaryWidgets?.filter(w => w.enabled !== false)?.length || 0;

                  return (
                    <div
                      key={mod.id}
                      style={{
                        background: '#f8fafc',
                        padding: '16px',
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '14px',
                        transition: 'box-shadow 0.2s ease, border-color 0.2s ease'
                      }}
                    >
                      {/* Top details */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '8px',
                              background: '#ffffff',
                              border: '1px solid #e2e8f0',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '18px',
                              flexShrink: 0
                            }}>
                              {mod.icon || '📦'}
                            </div>
                            <div>
                              <div style={{ fontSize: '13.5px', fontWeight: '800', color: '#0f172a' }}>
                                {mod.label}
                              </div>
                              <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '1px', lineHeight: 1.3 }}>
                                {mod.description || 'Dynamic platform module entity'}
                              </div>
                            </div>
                          </div>

                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '3px 8px',
                            borderRadius: '12px',
                            background: 'rgba(13, 148, 136, 0.1)',
                            color: '#0d9488',
                            fontSize: '10.5px',
                            fontWeight: '700',
                            flexShrink: 0
                          }}>
                            <CheckCircle size={11} />
                            <span>Configured</span>
                          </div>
                        </div>
                      </div>

                      {/* Middle stats bar */}
                      <div style={{
                        background: '#ffffff',
                        padding: '7px 12px',
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0',
                        fontSize: '11px',
                        fontWeight: '700',
                        color: '#475569',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}>
                        <span>
                          {fieldCount} Form Fields • {summaryCount} Summary Cards
                        </span>
                        {mod.isInternalSuperAdmin && (
                          <span style={{ fontSize: '10px', color: '#0d9488', fontWeight: '800' }}>
                            Super Admin
                          </span>
                        )}
                      </div>

                      {/* Action button */}
                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => handleOpenConfig(mod.id)}
                          style={{
                            padding: '8px 16px',
                            background: '#0d9488',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '12px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            transition: 'background 0.15s ease'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = '#064e43'}
                          onMouseLeave={(e) => e.currentTarget.style.background = '#0d9488'}
                        >
                          Configure Module
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {filteredModels.length === 0 && (
          <div style={{
            padding: '40px',
            textAlign: 'center',
            color: '#64748b',
            background: '#f8fafc',
            borderRadius: '12px',
            border: '1px dashed #cbd5e1'
          }}>
            <p style={{ margin: 0, fontSize: '14px', fontWeight: '700' }}>No matching models found</p>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px' }}>Try adjusting your search query or category filter.</p>
          </div>
        )}
      </div>
    </div>
  );
}
