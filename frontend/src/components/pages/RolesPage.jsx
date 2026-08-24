import React, { useState, useEffect, useRef, useMemo } from 'react';
import { PermissionEngine, STANDARD_ACTIONS, ACCESS_SCOPES, DEFAULT_ROLES } from '../../core/engines/PermissionEngine/permissionEngine';
import StorageUpgradeModal from '../storage/StorageUpgradeModal';

export default function RolesPage({ authUser, showToast, openInputModal, softDeleteRecord }) {
  const tenantId = authUser?.companyId || 'default_tenant';
  const [matrixState, setMatrixState] = useState(() => PermissionEngine.getPermissionMatrix(tenantId));
  const [activeRoleId, setActiveRoleId] = useState('manager');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAuditSuite, setShowAuditSuite] = useState(false);
  const [showStorageModal, setShowStorageModal] = useState(false);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [columnWidths, setColumnWidths] = useState(() => ({
    moduleName: typeof window !== 'undefined' && window.innerWidth <= 768 ? 120 : 200,
    recordScope: typeof window !== 'undefined' && window.innerWidth <= 768 ? 100 : 145,
    actionCol: 72
  }));
  const resizingRef = useRef(null);

  const handleResizeStart = (e, colKey) => {
    e.preventDefault();
    e.stopPropagation();
    resizingRef.current = {
      colKey,
      startX: e.clientX,
      startWidth: columnWidths[colKey] || 72
    };

    const handleMouseMove = (moveEvent) => {
      if (!resizingRef.current) return;
      const { colKey, startX, startWidth } = resizingRef.current;
      const deltaX = moveEvent.clientX - startX;
      const newWidth = Math.max(50, startWidth + deltaX);
      setColumnWidths(prev => ({
        ...prev,
        [colKey]: newWidth
      }));
    };

    const handleMouseUp = () => {
      resizingRef.current = null;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const discoveredModules = PermissionEngine.getDiscoveredModules();
  const tableScrollRef = useRef(null);

  useEffect(() => {
    const container = tableScrollRef.current;
    if (!container) return;

    const theadEl = container.querySelector('thead');
    if (!theadEl) return;

    const handleTheadWheel = (e) => {
      if (e.deltaY !== 0) {
        e.preventDefault();
        e.stopPropagation();
        container.scrollLeft += e.deltaY;
      }
    };

    theadEl.addEventListener('wheel', handleTheadWheel, { passive: false });
    return () => {
      theadEl.removeEventListener('wheel', handleTheadWheel);
    };
  }, [activeRoleId, discoveredModules]);

  const SIDEBAR_CATEGORY_ORDER = [
    'SYSTEM',
    'DASHBOARDS',
    'HR MANAGEMENT',
    'PAYROLL & FINANCE',
    'CRM & SALES',
    'OPERATIONS',
    'MY PORTAL',
    'HELP & SUPPORT',
    'SETTINGS'
  ];

  const SIDEBAR_ITEM_ORDER = [
    'superadmin_plans',
    'super_admin_panel',
    'audit_logs',
    'media_storage',
    'media_vault',
    'admin_dashboard',
    'manager_dashboard',
    'gps_attendance',
    'employees',
    'recruitment_ats',
    'asset_management',
    'assets',
    'verify_documents',
    'offboarding',
    'payroll',
    'taxes_compliance',
    'ff_settlements',
    'advances_loans',
    'expenses',
    'expense_claims',
    'channels',
    'wa_live_web',
    'kanban',
    'crm',
    'crm_deals',
    'telecalling',
    'tasks',
    'tasks_board',
    'office_kiosk',
    'notice_board',
    'holidays',
    'my_attendance',
    'leaves',
    'shifts',
    'app_guide',
    'settings',
    'roles_permissions',
    'recycle_bin',
    'system_dropdowns',
    'module_configuration',
    'module_config',
    'billing'
  ];

  const [sortField, setSortField] = useState(null);
  const [sortOrder, setSortOrder] = useState('asc');

  const handleHeaderSort = (field) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const allRoles = [...DEFAULT_ROLES, ...(matrixState.customRoles || [])];

  const filteredModules = useMemo(() => {
    let result = [...discoveredModules];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(mod =>
        mod.label.toLowerCase().includes(q) ||
        (mod.category && mod.category.toLowerCase().includes(q))
      );
    }
    if (!sortField) {
      return result.sort((a, b) => {
        const idxA = SIDEBAR_ITEM_ORDER.indexOf(a.id);
        const idxB = SIDEBAR_ITEM_ORDER.indexOf(b.id);
        return (idxA !== -1 ? idxA : 999) - (idxB !== -1 ? idxB : 999);
      });
    }
    return result.sort((a, b) => {
      let valA = (a[sortField] || '').toLowerCase();
      let valB = (b[sortField] || '').toLowerCase();
      if (sortField === 'scope') {
        valA = (matrixState.permissions[activeRoleId]?.[a.id]?.scope || 'all').toLowerCase();
        valB = (matrixState.permissions[activeRoleId]?.[b.id]?.scope || 'all').toLowerCase();
      }
      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [discoveredModules, searchQuery, sortField, sortOrder, matrixState, activeRoleId]);

  const groupedModules = useMemo(() => {
    const groups = {};
    filteredModules.forEach(mod => {
      const cat = (mod.category || 'GENERAL').toUpperCase();
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(mod);
    });
    return groups;
  }, [filteredModules]);

  const sortedCategoryKeys = useMemo(() => {
    const keys = Object.keys(groupedModules);
    return keys.sort((a, b) => {
      const idxA = SIDEBAR_CATEGORY_ORDER.indexOf(a);
      const idxB = SIDEBAR_CATEGORY_ORDER.indexOf(b);
      return (idxA !== -1 ? idxA : 999) - (idxB !== -1 ? idxB : 999);
    });
  }, [groupedModules]);

  const handleActionToggle = (modId, actionId) => {
    if (activeRoleId === 'super_admin') return;
    setMatrixState(prev => {
      const currentRoleData = prev.permissions[activeRoleId] || {};
      const currentModData = currentRoleData[modId] || { scope: 'all', actions: {} };
      const updatedActions = {
        ...currentModData.actions,
        [actionId]: !currentModData.actions?.[actionId]
      };
      const updated = {
        ...prev,
        permissions: {
          ...prev.permissions,
          [activeRoleId]: {
            ...currentRoleData,
            [modId]: {
              ...currentModData,
              actions: updatedActions
            }
          }
        }
      };
      PermissionEngine.savePermissionMatrix(tenantId, updated);
      return updated;
    });
  };

  const handleScopeChange = (modId, newScope) => {
    if (activeRoleId === 'super_admin') return;
    setMatrixState(prev => {
      const currentRoleData = prev.permissions[activeRoleId] || {};
      const currentModData = currentRoleData[modId] || { scope: 'all', actions: {} };
      const updated = {
        ...prev,
        permissions: {
          ...prev.permissions,
          [activeRoleId]: {
            ...currentRoleData,
            [modId]: {
              ...currentModData,
              scope: newScope
            }
          }
        }
      };
      PermissionEngine.savePermissionMatrix(tenantId, updated);
      return updated;
    });
  };

  const handleToggleAllRow = (modId) => {
    if (activeRoleId === 'super_admin') return;
    setMatrixState(prev => {
      const currentRoleData = prev.permissions[activeRoleId] || {};
      const currentModData = currentRoleData[modId] || { scope: 'all', actions: {} };
      const allChecked = STANDARD_ACTIONS.every(act => Boolean(currentModData.actions?.[act.id]));
      const targetVal = !allChecked;

      const newActions = {};
      STANDARD_ACTIONS.forEach(act => { newActions[act.id] = targetVal; });

      const updated = {
        ...prev,
        permissions: {
          ...prev.permissions,
          [activeRoleId]: {
            ...currentRoleData,
            [modId]: {
              ...currentModData,
              actions: newActions
            }
          }
        }
      };
      PermissionEngine.savePermissionMatrix(tenantId, updated);
      return updated;
    });
  };

  const handleToggleColumnHeader = (actionId) => {
    if (activeRoleId === 'super_admin') return;
    setMatrixState(prev => {
      const currentRoleData = prev.permissions[activeRoleId] || {};
      const allModsChecked = discoveredModules.every(mod => Boolean(currentRoleData[mod.id]?.actions?.[actionId]));
      const targetVal = !allModsChecked;

      const updatedRoleData = { ...currentRoleData };
      discoveredModules.forEach(mod => {
        const modData = updatedRoleData[mod.id] || { scope: 'all', actions: {} };
        updatedRoleData[mod.id] = {
          ...modData,
          actions: {
            ...modData.actions,
            [actionId]: targetVal
          }
        };
      });

      const updated = {
        ...prev,
        permissions: {
          ...prev.permissions,
          [activeRoleId]: updatedRoleData
        }
      };
      PermissionEngine.savePermissionMatrix(tenantId, updated);
      return updated;
    });
  };

  const handleAddCustomRole = () => {
    openInputModal({
      title: '🛡️ Add Custom Role',
      subtitle: 'Enter new custom role title (e.g. HR Specialist, Finance Auditor)',
      placeholder: 'e.g. Finance Auditor',
      onSave: (roleTitle) => {
        if (!roleTitle || !roleTitle.trim()) return;
        const cleanTitle = roleTitle.trim();
        const newRoleId = 'custom_role_' + Date.now();
        const newRoleObj = { id: newRoleId, label: `🛡️ ${cleanTitle}`, isCustom: true };

        setMatrixState(prev => {
          const updatedCustomRoles = [...(prev.customRoles || []), newRoleObj];
          const updatedPermissions = { ...prev.permissions };
          updatedPermissions[newRoleId] = {};

          discoveredModules.forEach(mod => {
            const defaultActions = {};
            STANDARD_ACTIONS.forEach(act => { defaultActions[act.id] = act.id === 'view'; });
            updatedPermissions[newRoleId][mod.id] = {
              scope: 'team',
              actions: defaultActions
            };
          });

          const updated = {
            ...prev,
            customRoles: updatedCustomRoles,
            permissions: updatedPermissions
          };
          PermissionEngine.savePermissionMatrix(tenantId, updated);
          return updated;
        });
        setActiveRoleId(newRoleId);
        showToast(`Created Custom Role "${cleanTitle}"`, 'success');
      }
    });
  };

  const handleDeleteCustomRole = (roleId, roleName) => {
    if (window.confirm(`Are you sure you want to delete custom role "${roleName}"?`)) {
      const targetRole = (matrixState.customRoles || []).find(r => r.id === roleId);
      if (softDeleteRecord) {
        softDeleteRecord({
          originalId: roleId,
          name: `Custom Role: "${roleName}"`,
          category: 'Custom Role',
          entityData: { role: targetRole, permissions: matrixState.permissions[roleId] },
          links: 'RBAC Permission Matrix'
        });
      }
      setMatrixState(prev => {
        const updatedCustomRoles = (prev.customRoles || []).filter(r => r.id !== roleId);
        const updatedPermissions = { ...prev.permissions };
        delete updatedPermissions[roleId];

        const updated = {
          ...prev,
          customRoles: updatedCustomRoles,
          permissions: updatedPermissions
        };
        PermissionEngine.savePermissionMatrix(tenantId, updated);
        return updated;
      });
      setActiveRoleId('manager');
      showToast(`Deleted Custom Role "${roleName}"`, 'info');
    }
  };

  const currentRoleObj = allRoles.find(r => r.id === activeRoleId);

  return (
    <div
      style={{
        height: isMobile ? 'calc(100vh - 70px)' : 'calc(100vh - 100px)',
        display: 'flex',
        flexDirection: 'column',
        padding: isMobile ? '12px' : '20px 24px',
        boxSizing: 'border-box',
        overflow: 'hidden',
        background: '#f8fafc'
      }}
    >
      {/* Page Header */}
      <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', marginBottom: isMobile ? '10px' : '16px', flexDirection: isMobile ? 'column' : 'row', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: isMobile ? '17px' : '22px', fontWeight: '900', color: '#0f2b26', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            🛡️ Roles &amp; Dynamic Permission Matrix
          </h1>
          {!isMobile && (
            <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0', fontWeight: '500' }}>
              Auto-discovered modules from MasterModuleRegistry with 11 granular action controls and record visibility scopes.
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: '8px', width: isMobile ? '100%' : 'auto' }}>
          <button
            className="btn btn-secondary"
            type="button"
            onClick={handleAddCustomRole}
            style={{ flex: isMobile ? '1' : 'initial', padding: '8px 12px', fontSize: '12px', fontWeight: '800', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', whiteSpace: 'nowrap' }}
          >
            ➕ Add Custom Role
          </button>
          <button
            className="btn btn-primary"
            type="button"
            onClick={() => {
              PermissionEngine.savePermissionMatrix(tenantId, matrixState);
              showToast('Permission matrix saved successfully!', 'success');
            }}
            style={{ flex: isMobile ? '1' : 'initial', padding: '8px 14px', fontSize: '12px', fontWeight: '800', borderRadius: '10px', background: 'linear-gradient(135deg, #0d9488 0%, #059669 100%)', border: 'none', boxShadow: '0 4px 14px rgba(13, 148, 136, 0.35)', color: '#ffffff', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            💾 Save Matrix
          </button>
        </div>
      </div>

      {/* Role Selection Switcher Bar */}
      <div
        style={{
          flexShrink: 0,
          display: 'flex',
          gap: '8px',
          marginBottom: isMobile ? '10px' : '16px',
          padding: '6px',
          borderRadius: '12px',
          background: '#e2e8f0',
          alignItems: 'center',
          overflowX: 'auto',
          flexWrap: 'nowrap',
          WebkitOverflowScrolling: 'touch'
        }}
      >
        {allRoles.map(r => {
          const isActive = activeRoleId === r.id;
          return (
            <div key={r.id} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
              <button
                type="button"
                onClick={() => setActiveRoleId(r.id)}
                style={{
                  padding: isMobile ? '6px 12px' : '8px 16px',
                  borderRadius: '9px',
                  fontSize: isMobile ? '11.5px' : '12.5px',
                  fontWeight: isActive ? '800' : '700',
                  border: 'none',
                  background: isActive ? '#ffffff' : 'transparent',
                  color: isActive ? '#0d9488' : '#475569',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                {r.label}
              </button>
              {r.isCustom && isActive && (
                <button
                  type="button"
                  title="Delete Custom Role"
                  onClick={() => handleDeleteCustomRole(r.id, r.label)}
                  style={{ marginLeft: '4px', padding: '4px 6px', borderRadius: '7px', border: '1px solid #fee2e2', background: '#fef2f2', color: '#ef4444', cursor: 'pointer', fontSize: '11px' }}
                >
                  🗑️
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Main Permissions Card Container */}
      <div
        style={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          background: '#ffffff',
          borderRadius: '14px',
          border: '1px solid #cbd5e1',
          boxShadow: '0 4px 20px -2px rgba(0,0,0,0.05)'
        }}
      >
        {/* Sub Header With Search & Sorting Controls */}
        <div style={{ flexShrink: 0, padding: isMobile ? '8px 12px' : '10px 20px', background: '#ffffff', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', flexDirection: isMobile ? 'column' : 'row', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: isMobile ? '100%' : 'auto' }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: isMobile ? '100%' : 'auto', flexGrow: isMobile ? 1 : 0 }}>
              <span style={{ position: 'absolute', left: '10px', fontSize: '12px', color: '#94a3b8' }}>🔍</span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search modules..."
                style={{
                  padding: '5px 26px 5px 28px',
                  fontSize: '12px',
                  borderRadius: '8px',
                  border: '1.5px solid #cbd5e1',
                  outline: 'none',
                  width: isMobile ? '100%' : '200px',
                  background: '#f8fafc',
                  fontWeight: '600',
                  color: '#1e293b'
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  style={{ position: 'absolute', right: '8px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', color: '#94a3b8' }}
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
            <h3 style={{ fontSize: isMobile ? '12px' : '14px', fontWeight: '900', color: '#0f2b26', margin: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
              Role: <span style={{ color: '#0d9488', textTransform: 'uppercase', background: 'rgba(13, 148, 136, 0.1)', padding: '2px 6px', borderRadius: '6px' }}>{currentRoleObj?.label || activeRoleId}</span>
            </h3>
            {activeRoleId === 'super_admin' ? (
              <span style={{ fontSize: '10.5px', fontWeight: '800', color: '#16a34a', background: 'rgba(22, 163, 74, 0.12)', padding: '3px 8px', borderRadius: '6px', border: '1px solid rgba(22, 163, 74, 0.25)' }}>
                🔒 Super Admin Access
              </span>
            ) : (
              <span style={{ fontSize: '10.5px', color: '#64748b', fontWeight: '600', background: '#f8fafc', padding: '3px 6px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                💡 Click header = Select All
              </span>
            )}
          </div>
        </div>

        {/* Unified Table Scroll Container */}
        <div ref={tableScrollRef} style={{ flexGrow: 1, overflow: 'auto', position: 'relative', WebkitOverflowScrolling: 'touch' }}>
          <table className="std-table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, minWidth: '1150px' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th
                  onClick={() => handleHeaderSort('label')}
                  title="Click to sort by Module Name"
                  style={{
                    position: 'sticky',
                    left: 0,
                    top: 0,
                    zIndex: 35,
                    background: '#f8fafc',
                    textAlign: 'left',
                    padding: '11px 16px',
                    fontSize: '12px',
                    fontWeight: '800',
                    color: '#334155',
                    width: `${columnWidths.moduleName}px`,
                    minWidth: `${columnWidths.moduleName}px`,
                    borderRight: '1px solid #e2e8f0',
                    borderBottom: '2px solid #cbd5e1',
                    boxShadow: '2px 0 5px rgba(0,0,0,0.03)',
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}
                >
                  Module Name {sortField === 'label' ? (sortOrder === 'asc' ? '▲' : '▼') : '⇅'}
                  <div
                    onMouseDown={(e) => handleResizeStart(e, 'moduleName')}
                    title="Drag left/right to resize column"
                    style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '6px', cursor: 'col-resize', zIndex: 40 }}
                  />
                </th>
                <th
                  onClick={() => handleHeaderSort('scope')}
                  title="Click to sort by Record Access Scope"
                  style={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 30,
                    background: '#f8fafc',
                    textAlign: 'left',
                    padding: '11px 10px',
                    fontSize: '12px',
                    fontWeight: '800',
                    color: '#334155',
                    width: `${columnWidths.recordScope}px`,
                    minWidth: `${columnWidths.recordScope}px`,
                    borderRight: '1px solid #e2e8f0',
                    borderBottom: '2px solid #cbd5e1',
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}
                >
                  Record Scope {sortField === 'scope' ? (sortOrder === 'asc' ? '▲' : '▼') : '⇅'}
                  <div
                    onMouseDown={(e) => handleResizeStart(e, 'recordScope')}
                    title="Drag left/right to resize column"
                    style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '6px', cursor: 'col-resize', zIndex: 40 }}
                  />
                </th>
                {STANDARD_ACTIONS.map(act => {
                  const allModsChecked = discoveredModules.every(mod => Boolean(matrixState.permissions[activeRoleId]?.[mod.id]?.actions?.[act.id]));
                  return (
                    <th
                      key={act.id}
                      onClick={() => handleToggleColumnHeader(act.id)}
                      title={`Click to toggle ${act.label} for all modules`}
                      style={{
                        position: 'sticky',
                        top: 0,
                        zIndex: 30,
                        background: '#f8fafc',
                        textAlign: 'center',
                        padding: '10px 4px',
                        fontSize: '11px',
                        fontWeight: '800',
                        color: '#334155',
                        cursor: activeRoleId === 'super_admin' ? 'default' : 'pointer',
                        userSelect: 'none',
                        borderRight: '1px solid #f1f5f9',
                        borderBottom: '2px solid #cbd5e1',
                        minWidth: '70px'
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                        <span>{act.icon} {act.label}</span>
                        {activeRoleId !== 'super_admin' && (
                          <input
                            type="checkbox"
                            checked={allModsChecked}
                            readOnly
                            style={{ width: '12px', height: '12px', cursor: 'pointer', accentColor: '#0d9488' }}
                          />
                        )}
                      </div>
                    </th>
                  );
                })}
                <th
                  style={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 30,
                    background: '#f8fafc',
                    textAlign: 'center',
                    padding: '12px 8px',
                    fontSize: '11px',
                    fontWeight: '800',
                    color: '#334155',
                    borderBottom: '2px solid #cbd5e1',
                    minWidth: '75px'
                  }}
                >
                  Toggle Row
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedCategoryKeys.map(categoryKey => (
                <React.Fragment key={categoryKey}>
                  <tr style={{ background: '#f1f5f9' }}>
                    <td
                      colSpan={STANDARD_ACTIONS.length + 3}
                      style={{
                        padding: '9px 16px',
                        background: 'linear-gradient(90deg, rgba(13, 148, 136, 0.12) 0%, rgba(241, 245, 249, 0.8) 100%)',
                        borderTop: '1px solid #cbd5e1',
                        borderBottom: '1px solid #cbd5e1'
                      }}
                    >
                      <div
                        style={{
                          position: 'sticky',
                          left: '16px',
                          zIndex: 12,
                          display: 'inline-block',
                          fontSize: '11px',
                          fontWeight: '900',
                          color: '#0d9488',
                          letterSpacing: '0.06em',
                          textTransform: 'uppercase'
                        }}
                      >
                        📁 {categoryKey}
                      </div>
                    </td>
                  </tr>

                  {groupedModules[categoryKey].map(mod => {
                    const modPerms = matrixState.permissions[activeRoleId]?.[mod.id] || { scope: 'all', actions: {} };
                    const isSuperAdmin = activeRoleId === 'super_admin';
                    const allChecked = isSuperAdmin || STANDARD_ACTIONS.every(act => Boolean(modPerms.actions?.[act.id]));

                    return (
                      <tr key={mod.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td
                          style={{
                            position: 'sticky',
                            left: 0,
                            zIndex: 15,
                            background: '#ffffff',
                            padding: isMobile ? '8px 8px' : '11px 16px',
                            fontSize: isMobile ? '11px' : '12.5px',
                            fontWeight: '800',
                            color: '#0f172a',
                            width: `${columnWidths.moduleName}px`,
                            maxWidth: `${columnWidths.moduleName}px`,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            borderRight: '1px solid #e2e8f0',
                            boxShadow: '2px 0 5px rgba(0,0,0,0.03)'
                          }}
                        >
                          <span style={{ marginRight: isMobile ? '3px' : '6px' }}>{mod.icon}</span> {mod.label}
                        </td>

                        <td style={{ padding: isMobile ? '4px 4px' : '8px 10px', width: `${columnWidths.recordScope}px`, borderRight: '1px solid #e2e8f0' }}>
                          <select
                            value={modPerms.scope || 'all'}
                            disabled={isSuperAdmin}
                            onChange={(e) => handleScopeChange(mod.id, e.target.value)}
                            style={{
                              padding: isMobile ? '3px 2px' : '5px 8px',
                              borderRadius: '7px',
                              border: '1.5px solid #cbd5e1',
                              fontSize: isMobile ? '10px' : '11px',
                              fontWeight: '700',
                              color: '#334155',
                              background: isSuperAdmin ? '#f1f5f9' : '#f8fafc',
                              cursor: isSuperAdmin ? 'not-allowed' : 'pointer',
                              outline: 'none',
                              width: '100%',
                              textOverflow: 'ellipsis'
                            }}
                          >
                            {ACCESS_SCOPES.map(sc => (
                              <option key={sc.id} value={sc.id}>{sc.label}</option>
                            ))}
                          </select>
                        </td>

                        {STANDARD_ACTIONS.map(act => {
                          const isChecked = isSuperAdmin || Boolean(modPerms.actions?.[act.id]);
                          return (
                            <td key={act.id} style={{ textAlign: 'center', padding: '8px 4px', borderRight: '1px solid #f1f5f9' }}>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                disabled={isSuperAdmin}
                                onChange={() => handleActionToggle(mod.id, act.id)}
                                style={{ width: '16px', height: '16px', cursor: isSuperAdmin ? 'not-allowed' : 'pointer', accentColor: '#0d9488' }}
                              />
                            </td>
                          );
                        })}

                        <td style={{ textAlign: 'center', padding: '8px 6px' }}>
                          <button
                            type="button"
                            disabled={isSuperAdmin}
                            onClick={() => handleToggleAllRow(mod.id)}
                            style={{
                              padding: '4px 10px',
                              borderRadius: '5px',
                              fontSize: '11px',
                              fontWeight: '800',
                              border: '1px solid #cbd5e1',
                              background: '#f8fafc',
                              color: '#475569',
                              cursor: isSuperAdmin ? 'not-allowed' : 'pointer'
                            }}
                          >
                            {allChecked ? 'Uncheck' : 'All'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <StorageUpgradeModal
        isOpen={showStorageModal}
        onClose={() => setShowStorageModal(false)}
        tenantId={authUser?.tenantId || authUser?.companyId || 'acme_corp'}
        showToast={showToast}
      />
    </div>
  );
}
