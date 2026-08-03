/**
 * UNIVERSAL SAVED VIEWS & PRESETS ENGINE
 * Supports Personal (Private) vs Shared (Global Team Meeting) Presets Scope
 * 100% Metadata-Driven for all EMS Modules
 */

import React, { useState, useEffect } from 'react';
import { Bookmark, Star, Plus, Trash2, Check, X, Tag, Globe, Lock } from 'lucide-react';
import { LabelEngine } from '../LabelEngine';

export default function SavedViewsEngine({
  moduleConfig = {},
  filterValues = {},
  searchQuery = '',
  sortKey = 'createdAt',
  sortDir = 'desc',
  viewMode = 'list',
  onApplyPreset = () => {},
  showToast = () => {},
  externalShowSaveModal = false,
  onCloseExternalSaveModal = () => {}
}) {
  const moduleId = moduleConfig.moduleId || 'employees';
  const personalStorageKey = `ems_saved_views_personal_${moduleId}`;
  const sharedStorageKey = `ems_saved_views_shared_${moduleId}`;
  const entityNamePlural = LabelEngine.getEntityNamePlural(moduleConfig);

  const [savedViews, setSavedViews] = useState([]);
  const [activePresetId, setActivePresetId] = useState('all');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [presetScope, setPresetScope] = useState('personal'); // 'personal' | 'shared'
  const [isDefault, setIsDefault] = useState(false);

  useEffect(() => {
    if (externalShowSaveModal) {
      setShowSaveModal(true);
    }
  }, [externalShowSaveModal]);

  // Load Personal & Shared Presets on mount
  useEffect(() => {
    try {
      const personalStored = localStorage.getItem(personalStorageKey);
      const sharedStored = localStorage.getItem(sharedStorageKey);

      let personalList = [];
      let sharedList = [];

      if (personalStored) {
        const parsed = JSON.parse(personalStored);
        if (Array.isArray(parsed)) personalList = parsed.map(v => ({ ...v, scope: 'personal' }));
      }
      if (sharedStored) {
        const parsed = JSON.parse(sharedStored);
        if (Array.isArray(parsed)) sharedList = parsed.map(v => ({ ...v, scope: 'shared' }));
      }

      const combined = [...sharedList, ...personalList];
      setSavedViews(combined);

      const defaultPreset = combined.find(p => p.isDefault);
      if (defaultPreset) {
        handleSelectPreset(defaultPreset);
      }
    } catch (e) {
      console.error('Failed to load saved views', e);
    }
  }, [moduleId]);

  // Persist Views into respective personal/shared storage
  const saveViewsToStorage = (updatedCombinedViews) => {
    setSavedViews(updatedCombinedViews);
    try {
      const personalOnly = updatedCombinedViews.filter(v => v.scope === 'personal');
      const sharedOnly = updatedCombinedViews.filter(v => v.scope === 'shared');

      localStorage.setItem(personalStorageKey, JSON.stringify(personalOnly));
      localStorage.setItem(sharedStorageKey, JSON.stringify(sharedOnly));
    } catch (e) {
      console.error('Failed to persist saved views', e);
    }
  };

  const handleSelectPreset = (preset) => {
    if (preset.id === 'all') {
      setActivePresetId('all');
      onApplyPreset({
        filterValues: {},
        searchQuery: '',
        sortKey: moduleConfig.defaultSort?.key || 'createdAt',
        sortDir: moduleConfig.defaultSort?.dir || 'desc'
      });
      showToast(`Showing All ${entityNamePlural}`, 'info');
      return;
    }

    setActivePresetId(preset.id);
    onApplyPreset({
      filterValues: preset.filterValues || {},
      searchQuery: preset.searchQuery || '',
      sortKey: preset.sortKey || 'createdAt',
      sortDir: preset.sortDir || 'desc'
    });
    showToast(`Loaded ${preset.scope === 'shared' ? 'Shared Team View' : 'Personal View'} "${preset.name}"`, 'success');
  };

  const handleCreateNewPreset = () => {
    if (!newPresetName.trim()) {
      showToast('Please enter a name for the view preset', 'warning');
      return;
    }

    const newPreset = {
      id: `view_${Date.now()}`,
      name: newPresetName.trim(),
      scope: presetScope, // 'personal' | 'shared'
      filterValues: { ...filterValues },
      searchQuery,
      sortKey,
      sortDir,
      viewMode,
      isDefault,
      createdAt: new Date().toISOString()
    };

    let updated = [...savedViews];
    if (isDefault) {
      updated = updated.map(v => ({ ...v, isDefault: false }));
    }
    updated.push(newPreset);

    saveViewsToStorage(updated);
    setActivePresetId(newPreset.id);
    setNewPresetName('');
    setPresetScope('personal');
    setIsDefault(false);
    setShowSaveModal(false);
    onCloseExternalSaveModal();
    showToast(
      newPreset.scope === 'shared'
        ? `🌐 Saved Shared Team View "${newPreset.name}" for entire team!`
        : `🔒 Saved Personal View "${newPreset.name}" for yourself`,
      'success'
    );
  };

  const handleDeletePreset = (presetId, e) => {
    e.stopPropagation();
    const updated = savedViews.filter(v => v.id !== presetId);
    saveViewsToStorage(updated);
    if (activePresetId === presetId) {
      handleSelectPreset({ id: 'all' });
    }
    showToast('Deleted saved view', 'info');
  };

  const isCurrentFilterDirty = Object.keys(filterValues).length > 0 || Boolean(searchQuery.trim());

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
      {/* QUICK PRESET TABS STRIP */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflowX: 'auto', flex: 1 }}>
        <button
          type="button"
          onClick={() => handleSelectPreset({ id: 'all' })}
          style={{
            padding: '4px 10px',
            borderRadius: '14px',
            fontSize: '11px',
            fontWeight: activePresetId === 'all' ? '800' : '600',
            border: activePresetId === 'all' ? '1px solid #0d9488' : '1px solid #cbd5e1',
            background: activePresetId === 'all' ? '#0d9488' : '#ffffff',
            color: activePresetId === 'all' ? '#ffffff' : '#475569',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          <span>All {entityNamePlural}</span>
        </button>

        {savedViews.map(preset => {
          const isActive = activePresetId === preset.id;
          const isShared = preset.scope === 'shared';
          return (
            <div
              key={preset.id}
              onClick={() => handleSelectPreset(preset)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 10px',
                borderRadius: '16px',
                fontSize: '11.5px',
                fontWeight: isActive ? '800' : '600',
                border: isActive ? '1px solid #0d9488' : (isShared ? '1px solid #93c5fd' : '1px solid #cbd5e1'),
                background: isActive
                  ? 'rgba(13, 148, 136, 0.12)'
                  : (isShared ? '#eff6ff' : '#ffffff'),
                color: isActive ? '#0d9488' : (isShared ? '#1d4ed8' : '#334155'),
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              {isShared ? (
                <Globe size={13} color={isActive ? '#0d9488' : '#2563eb'} />
              ) : (
                <Lock size={12} color={isActive ? '#0d9488' : '#64748b'} />
              )}
              <span>{preset.name}</span>
              {isShared && (
                <span style={{ fontSize: '9.5px', fontWeight: '800', background: '#dbeafe', color: '#1e40af', padding: '1px 5px', borderRadius: '8px' }}>
                  TEAM
                </span>
              )}
              <button
                type="button"
                onClick={(e) => handleDeletePreset(preset.id, e)}
                style={{ border: 'none', background: 'transparent', color: '#94a3b8', cursor: 'pointer', padding: '1px', display: 'flex' }}
                title="Delete preset"
              >
                <X size={12} />
              </button>
            </div>
          );
        })}
      </div>

      {/* SAVE PRESET MODAL */}
      {showSaveModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
          onClick={() => { setShowSaveModal(false); onCloseExternalSaveModal(); }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '14px',
              width: '100%',
              maxWidth: '440px',
              boxShadow: '0 20px 40px -15px rgba(0,0,0,0.3)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* MODAL HEADER */}
            <div style={{ padding: '16px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Bookmark size={16} color="#0d9488" /> Save View Preset
              </h3>
              <button type="button" onClick={() => { setShowSaveModal(false); onCloseExternalSaveModal(); }} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b' }}>
                <X size={16} />
              </button>
            </div>

            {/* MODAL BODY */}
            <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#0f172a', display: 'block', marginBottom: '6px' }}>
                  Preset View Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Monday Team Review, Sales Active Staff..."
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', fontSize: '12.5px', borderRadius: '7px', border: '1px solid #cbd5e1', outline: 'none', boxSizing: 'border-box' }}
                  autoFocus
                />
              </div>

              {/* SCOPE SELECTION (PERSONAL VS SHARED TEAM) */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#0f172a', display: 'block', marginBottom: '8px' }}>
                  Visibility & Sharing Scope
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setPresetScope('personal')}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: presetScope === 'personal' ? '2px solid #0d9488' : '1px solid #cbd5e1',
                      background: presetScope === 'personal' ? 'rgba(13, 148, 136, 0.08)' : '#ffffff',
                      color: presetScope === 'personal' ? '#0d9488' : '#334155',
                      fontWeight: '700',
                      fontSize: '12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <Lock size={14} /> 🔒 Personal (Only Me)
                  </button>

                  <button
                    type="button"
                    onClick={() => setPresetScope('shared')}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: presetScope === 'shared' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                      background: presetScope === 'shared' ? '#eff6ff' : '#ffffff',
                      color: presetScope === 'shared' ? '#1d4ed8' : '#334155',
                      fontWeight: '700',
                      fontSize: '12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <Globe size={14} /> 🌐 Shared (Entire Team)
                  </button>
                </div>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#334155', fontWeight: '600', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  style={{ accentColor: '#0d9488', cursor: 'pointer' }}
                />
                <span>Set as Default Initial View for {entityNamePlural}</span>
              </label>
            </div>

            {/* MODAL FOOTER */}
            <div style={{ padding: '14px 20px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setShowSaveModal(false)}
                style={{ padding: '7px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#475569', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateNewPreset}
                style={{ padding: '7px 16px', borderRadius: '6px', border: 'none', background: 'linear-gradient(135deg, #064e43 0%, #0d9488 100%)', color: '#ffffff', fontWeight: '800', fontSize: '12px', cursor: 'pointer' }}
              >
                Save Preset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
