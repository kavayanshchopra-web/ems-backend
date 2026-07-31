import React, { useState } from 'react';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import SearchInput from '../ui/SearchInput';
import ModuleConfigEditor from './ModuleConfigEditor';
import { moduleConfigService } from '../../services/moduleConfigService';
import { Sliders, CheckCircle, Clock } from 'lucide-react';

/**
 * Settings ➔ Module Configuration Master Administration Center
 * Lists registered EMS modules and handles preselected module configuration.
 */
export default function ModuleConfigCenter({
  companyId = 'default_tenant',
  preselectedModuleId = null,
  systemDropdowns = {},
  atsCandidates = [],
  activePipelineStages = [],
  showToast = () => {},
  onNavigateBack = null
}) {
  const modules = moduleConfigService.getRegisteredModules();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModuleId, setSelectedModuleId] = useState(preselectedModuleId || null);

  const categories = Array.from(new Set(modules.map(m => m.category)));

  const filteredModules = modules.filter(m => {
    const q = searchQuery.toLowerCase().trim();
    return !q || m.label.toLowerCase().includes(q) || m.category.toLowerCase().includes(q);
  });

  const handleOpenConfig = (modId) => {
    const def = moduleConfigService.getModuleDefinition(modId);
    if (!def || !def.configurable) {
      showToast(`Configuration for "${def?.label || modId}" is coming soon.`, 'info');
      return;
    }
    setSelectedModuleId(modId);
  };

  const handleCloseEditor = () => {
    setSelectedModuleId(null);
    if (onNavigateBack) onNavigateBack();
  };

  // If a module is selected, render the capability-driven Generic Editor
  if (selectedModuleId) {
    const currentConfig = moduleConfigService.getModuleConfig(companyId, selectedModuleId);
    const moduleDef = moduleConfigService.getModuleDefinition(selectedModuleId);

    return (
      <ModuleConfigEditor
        companyId={companyId}
        moduleDef={moduleDef}
        initialConfig={currentConfig}
        onSaveConfig={(newCfg) => {
          moduleConfigService.saveModuleConfig(companyId, selectedModuleId, newCfg);
          showToast(`Saved configuration for ${moduleDef.label}!`, 'success');
        }}
        activePipelineStages={activePipelineStages}
        atsCandidates={atsCandidates}
        systemDropdowns={systemDropdowns}
        onClose={handleCloseEditor}
        showToast={showToast}
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '20px', background: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sliders size={20} style={{ color: '#0d9488' }} />
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>
              Module Configuration
            </h2>
          </div>
          <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>
            Configure forms, fields, summary widgets, list columns, and view settings across EMS modules.
          </p>
        </div>

        <SearchInput
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onClear={() => setSearchQuery('')}
          placeholder="Search modules..."
          width="260px"
        />
      </div>

      {/* Module Categories List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {categories.map(catName => {
          const catModules = filteredModules.filter(m => m.category === catName);
          if (catModules.length === 0) return null;

          return (
            <div key={catName} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {catName}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '14px' }}>
                {catModules.map(mod => {
                  const isConfigurable = mod.configurable;
                  const cfg = isConfigurable ? moduleConfigService.getModuleConfig(companyId, mod.id) : null;
                  const fieldCount = cfg ? (cfg.fields || []).length : 0;
                  const activeWidgets = cfg ? (cfg.summaryWidgets || []).filter(w => w.enabled).length : 0;

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
                        justify: 'space-between',
                        gap: '14px',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(13,148,136,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>
                          {mod.icon}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '800', color: '#0f172a' }}>{mod.label}</h3>
                            <Badge variant={isConfigurable ? 'success' : 'neutral'}>
                              {isConfigurable ? <><CheckCircle size={10} style={{ marginRight: '3px' }} /> Configured</> : <><Clock size={10} style={{ marginRight: '3px' }} /> Coming Soon</>}
                            </Badge>
                          </div>
                          <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                            {mod.description}
                          </p>
                        </div>
                      </div>

                      {isConfigurable && (
                        <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: '#475569', background: '#ffffff', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                          <div><strong>{fieldCount}</strong> Form Fields</div>
                          <div>•</div>
                          <div><strong>{activeWidgets}</strong> Summary Cards</div>
                        </div>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #e2e8f0', paddingTop: '10px' }}>
                        <Button
                          variant={isConfigurable ? 'primary' : 'outline'}
                          size="sm"
                          disabled={!isConfigurable}
                          onClick={() => handleOpenConfig(mod.id)}
                          style={isConfigurable ? { background: 'linear-gradient(135deg, #0d9488 0%, #064e43 100%)', color: 'white', border: 'none' } : {}}
                        >
                          {isConfigurable ? 'Configure Module' : 'Coming Soon'}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
