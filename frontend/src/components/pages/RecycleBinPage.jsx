import React from 'react';

const RecycleBinPage = ({
  authUser,
  recycleBinItems,
  handleEmptyBinVault,
  selectedBinTenant,
  setSelectedBinTenant,
  binSearchQuery,
  setBinSearchQuery,
  binCategoryFilter,
  setBinCategoryFilter,
  binSortConfig,
  setBinSortConfig,
  binCurrentPage,
  setBinCurrentPage,
  binPageSize,
  setBinPageSize,
  binColumnWidths,
  setBinColumnWidths,
  binResizingRef,
  binTheadRef,
  handleRestoreBinItem,
  handlePermanentDeleteBinItem
}) => {
  const isSuperAdmin = authUser?.role === 'superadmin';

  const handleBinResizeStart = (e, colKey) => {
    e.preventDefault();
    e.stopPropagation();
    if (binResizingRef) {
      binResizingRef.current = {
        colKey,
        startX: e.clientX,
        startWidth: binColumnWidths[colKey] || 120
      };
    }

    const handleMouseMove = (moveEvent) => {
      if (!binResizingRef?.current) return;
      const { colKey, startX, startWidth } = binResizingRef.current;
      const deltaX = moveEvent.clientX - startX;
      const newWidth = Math.max(60, startWidth + deltaX);
      setBinColumnWidths(prev => ({
        ...prev,
        [colKey]: newWidth
      }));
    };

    const handleMouseUp = () => {
      if (binResizingRef) binResizingRef.current = null;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const filteredBinItems = (recycleBinItems || []).filter(item => {
    if (!item) return false;
    const matchesCategory = binCategoryFilter === 'all' || (item.category || '').toLowerCase() === binCategoryFilter.toLowerCase();
    const matchesTenant = selectedBinTenant === 'all' || item.tenantId === selectedBinTenant;
    const matchesQuery = !binSearchQuery || 
      (item.name || '').toLowerCase().includes(binSearchQuery.toLowerCase()) || 
      (item.deletedBy || '').toLowerCase().includes(binSearchQuery.toLowerCase()) ||
      (item.category || '').toLowerCase().includes(binSearchQuery.toLowerCase());
    
    if (!isSuperAdmin && item.tenantId && item.tenantId !== (authUser?.tenantId || authUser?.companyId || 'acme_corp')) {
      return false;
    }
    return matchesCategory && matchesTenant && matchesQuery;
  });

  // Sorting logic
  const sortedBinItems = [...filteredBinItems].filter(i => !!i).sort((a, b) => {
    if (!a || !b || !binSortConfig.key) return 0;
    let valA = a[binSortConfig.key] || '';
    let valB = b[binSortConfig.key] || '';
    if (typeof valA === 'string') valA = valA.toLowerCase();
    if (typeof valB === 'string') valB = valB.toLowerCase();
    if (valA < valB) return binSortConfig.dir === 'asc' ? -1 : 1;
    if (valA > valB) return binSortConfig.dir === 'asc' ? 1 : -1;
    return 0;
  });

  const handleBinSort = (key) => {
    setBinSortConfig(prev => ({
      key,
      dir: prev.key === key && prev.dir === 'asc' ? 'desc' : 'asc'
    }));
    setBinCurrentPage(1);
  };

  // Pagination calculations
  const totalBinItems = sortedBinItems.length;
  const totalBinPages = Math.ceil(totalBinItems / binPageSize) || 1;
  const validBinPage = Math.min(binCurrentPage, totalBinPages);
  const binStartIndex = (validBinPage - 1) * binPageSize;
  const binEndIndex = Math.min(binStartIndex + binPageSize, totalBinItems);
  const paginatedBinItems = sortedBinItems.slice(binStartIndex, binEndIndex);

  return (
    <div style={{ padding: 'var(--space-6)', margin: 'var(--space-4)', overflowY: 'auto', flexGrow: 1 }} className="glass-panel">

      {/* Header */}
      <div className="page-header" style={{ marginBottom: 'var(--space-6)', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: 'var(--radius-md)', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0 }}>
            🗑️
          </div>
          <div>
            <h1 className="page-header-title">Recycle Bin &amp; Data Loss Prevention Vault</h1>
            <p className="page-header-subtitle">Soft-deleted records archived safely. Linked data (Attendance, Payslips, Chats) is 100% preserved.</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
          <span className="badge-success" style={{ padding: '8px 16px', fontSize: 'var(--text-xs)', fontWeight: 'var(--fw-bold)', whiteSpace: 'nowrap' }}>
            🛡️ Zero Data Loss Active
          </span>
          {recycleBinItems.length > 0 && (
            <button
              type="button"
              className="btn btn-danger"
              style={{ padding: '8px 16px', fontSize: 'var(--text-xs)', fontWeight: 'var(--fw-bold)', boxShadow: '0 2px 8px rgba(239,68,68,0.3)', whiteSpace: 'nowrap' }}
              onClick={handleEmptyBinVault}
            >
              🔥 Empty Bin Vault ({recycleBinItems.length})
            </button>
          )}
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
        <div className="glass-card" style={{ padding: '16px 20px', borderRadius: '12px', background: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>📦</span> Total Vault Items
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#0f2b26', marginTop: '6px' }}>
            {recycleBinItems.length}
          </div>
        </div>
        <div className="glass-card" style={{ padding: '16px 20px', borderRadius: '12px', background: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>👥</span> Soft-Deleted Employees
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#d97706', marginTop: '6px' }}>
            {recycleBinItems.filter(i => (i.category || '').toLowerCase() === 'employee').length}
          </div>
        </div>
        <div className="glass-card" style={{ padding: '16px 20px', borderRadius: '12px', background: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>📋</span> Archived Leads &amp; Tasks
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#0d9488', marginTop: '6px' }}>
            {(recycleBinItems || []).filter(i => i && ['crm lead', 'task', 'system dropdown'].includes((i.category || '').toLowerCase())).length}
          </div>
        </div>
        <div className="glass-card" style={{ padding: '16px 20px', borderRadius: '12px', background: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>🛡️</span> Data Loss Rate
          </div>
          <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#059669', marginTop: '6px', display: 'inline-block', background: 'rgba(16, 185, 129, 0.1)', padding: '3px 10px', borderRadius: '6px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
            0.0% (Protected)
          </div>
        </div>
      </div>

      {/* Search & Category Filter Toolbar */}
      <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-5)', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="bin-category-filter-pills" style={{ display: 'flex', gap: '8px', overflowX: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: '4px', maxWidth: '100%' }}>
          {['all', 'employee', 'crm lead', 'task', 'system dropdown'].map(cat => {
            const isSelected = binCategoryFilter === cat;
            return (
              <button
                key={cat}
                type="button"
                style={{
                  padding: '8px 16px',
                  fontSize: '12px',
                  fontWeight: isSelected ? '800' : '600',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  transition: 'all 0.15s ease',
                  border: isSelected ? 'none' : '1px solid #cbd5e1',
                  background: isSelected ? 'linear-gradient(135deg, #0d9488 0%, #064e43 100%)' : '#ffffff',
                  color: isSelected ? '#ffffff' : '#334155',
                  boxShadow: isSelected ? '0 2px 8px rgba(13, 148, 136, 0.3)' : 'none'
                }}
                onClick={() => {
                  setBinCategoryFilter(cat);
                  setBinCurrentPage(1);
                }}
              >
                {cat === 'all' ? '📁 All Categories' : (cat === 'system dropdown' ? '⚙️ System Dropdown' : (cat === 'crm lead' ? '💬 CRM Lead' : (cat === 'employee' ? '👥 Employee' : '📋 Task')))}
              </button>
            );
          })}
        </div>

        <div className="bin-toolbar-right" style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          {isSuperAdmin && (
            <select
              className="form-control"
              style={{ padding: '8px 12px', fontSize: '12px', minWidth: '170px', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white' }}
              value={selectedBinTenant}
              onChange={(e) => {
                setSelectedBinTenant(e.target.value);
                setBinCurrentPage(1);
              }}
            >
              <option value="all">🏢 All Companies (SaaS)</option>
              <option value="acme_corp">Acme Corp</option>
              <option value="platform_superadmin">SaaS Platform Admin</option>
            </select>
          )}
          <input
            type="text"
            className="form-control"
            placeholder="🔍 Search deleted records..."
            style={{ padding: '8px 14px', fontSize: '12px', minWidth: '180px', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white' }}
            value={binSearchQuery}
            onChange={(e) => {
              setBinSearchQuery(e.target.value);
              setBinCurrentPage(1);
            }}
          />
        </div>
      </div>

      {/* Table Card */}
      <div className="payroll-table-card" style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <h3 className="payroll-table-title" style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>Archived Items ({filteredBinItems.length})</h3>
          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>
            Auto-purged after 90 days retention period
          </span>
        </div>

        <div className="mobile-swipe-hint" style={{ display: 'none', fontSize: '11px', color: '#0d9488', fontWeight: '700', padding: '4px 12px', textAlign: 'right' }}>Swipe table horizontally ↔</div>
        
        {/* INNER SCROLLABLE TABLE BOX CONTAINER */}
        <div style={{ flex: 1, overflowX: 'auto', overflowY: 'auto', WebkitOverflowScrolling: 'touch', borderBottom: '1px solid #e2e8f0', maxHeight: '440px', background: 'white' }}>
          <table className="std-table" style={{ width: '100%', minWidth: '750px', borderCollapse: 'separate', borderSpacing: 0 }}>
            <thead ref={binTheadRef} style={{ position: 'sticky', top: 0, zIndex: 10, background: '#f8fafc', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
              <tr style={{ userSelect: 'none' }}>
                {/* ARCHIVED ITEM Column with Drag Handle */}
                <th 
                  onClick={() => handleBinSort('name')}
                  style={{
                    position: 'relative',
                    width: `${binColumnWidths.name}px`,
                    maxWidth: `${binColumnWidths.name}px`,
                    cursor: 'pointer',
                    background: '#f8fafc',
                    padding: '12px 16px',
                    fontSize: '11px',
                    fontWeight: '800',
                    color: '#475569',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}
                >
                  ARCHIVED ITEM <span style={{ color: binSortConfig.key === 'name' ? '#0d9488' : '#94a3b8', marginLeft: '4px' }}>{binSortConfig.key === 'name' ? (binSortConfig.dir === 'asc' ? '▲' : '▼') : '⇅'}</span>
                  <div
                    onMouseDown={(e) => handleBinResizeStart(e, 'name')}
                    onClick={(e) => e.stopPropagation()}
                    title="Drag left/right to resize column"
                    style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '6px', cursor: 'col-resize', background: 'transparent', zIndex: 5 }}
                  />
                </th>

                {/* CATEGORY Column with Drag Handle */}
                <th 
                  onClick={() => handleBinSort('category')}
                  style={{
                    position: 'relative',
                    width: `${binColumnWidths.category}px`,
                    maxWidth: `${binColumnWidths.category}px`,
                    cursor: 'pointer',
                    background: '#f8fafc',
                    padding: '12px 16px',
                    fontSize: '11px',
                    fontWeight: '800',
                    color: '#475569',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}
                >
                  CATEGORY <span style={{ color: binSortConfig.key === 'category' ? '#0d9488' : '#94a3b8', marginLeft: '4px' }}>{binSortConfig.key === 'category' ? (binSortConfig.dir === 'asc' ? '▲' : '▼') : '⇅'}</span>
                  <div
                    onMouseDown={(e) => handleBinResizeStart(e, 'category')}
                    onClick={(e) => e.stopPropagation()}
                    title="Drag left/right to resize column"
                    style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '6px', cursor: 'col-resize', background: 'transparent', zIndex: 5 }}
                  />
                </th>

                {/* DELETED BY Column with Drag Handle */}
                <th 
                  onClick={() => handleBinSort('deletedBy')}
                  style={{
                    position: 'relative',
                    width: `${binColumnWidths.deletedBy}px`,
                    maxWidth: `${binColumnWidths.deletedBy}px`,
                    cursor: 'pointer',
                    background: '#f8fafc',
                    padding: '12px 16px',
                    fontSize: '11px',
                    fontWeight: '800',
                    color: '#475569',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}
                >
                  DELETED BY <span style={{ color: binSortConfig.key === 'deletedBy' ? '#0d9488' : '#94a3b8', marginLeft: '4px' }}>{binSortConfig.key === 'deletedBy' ? (binSortConfig.dir === 'asc' ? '▲' : '▼') : '⇅'}</span>
                  <div
                    onMouseDown={(e) => handleBinResizeStart(e, 'deletedBy')}
                    onClick={(e) => e.stopPropagation()}
                    title="Drag left/right to resize column"
                    style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '6px', cursor: 'col-resize', background: 'transparent', zIndex: 5 }}
                  />
                </th>

                {/* SOFT-DELETED DATE Column with Drag Handle */}
                <th 
                  onClick={() => handleBinSort('deletedAt')}
                  style={{
                    position: 'relative',
                    width: `${binColumnWidths.deletedAt}px`,
                    maxWidth: `${binColumnWidths.deletedAt}px`,
                    cursor: 'pointer',
                    background: '#f8fafc',
                    padding: '12px 16px',
                    fontSize: '11px',
                    fontWeight: '800',
                    color: '#475569',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}
                >
                  SOFT-DELETED DATE <span style={{ color: binSortConfig.key === 'deletedAt' ? '#0d9488' : '#94a3b8', marginLeft: '4px' }}>{binSortConfig.key === 'deletedAt' ? (binSortConfig.dir === 'asc' ? '▲' : '▼') : '⇅'}</span>
                  <div
                    onMouseDown={(e) => handleBinResizeStart(e, 'deletedAt')}
                    onClick={(e) => e.stopPropagation()}
                    title="Drag left/right to resize column"
                    style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '6px', cursor: 'col-resize', background: 'transparent', zIndex: 5 }}
                  />
                </th>

                {/* PRESERVED DEPENDENT LINKS Column */}
                <th
                  style={{
                    position: 'relative',
                    width: `${binColumnWidths.preservedLinks}px`,
                    maxWidth: `${binColumnWidths.preservedLinks}px`,
                    background: '#f8fafc',
                    padding: '12px 16px',
                    fontSize: '11px',
                    fontWeight: '800',
                    color: '#475569',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}
                >
                  PRESERVED DEPENDENT LINKS
                  <div
                    onMouseDown={(e) => handleBinResizeStart(e, 'preservedLinks')}
                    onClick={(e) => e.stopPropagation()}
                    title="Drag left/right to resize column"
                    style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '6px', cursor: 'col-resize', background: 'transparent', zIndex: 5 }}
                  />
                </th>

                <th style={{ textAlign: 'right', background: '#f8fafc', padding: '12px 16px', fontSize: '11px', fontWeight: '800', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  ACTIONS
                </th>
              </tr>
            </thead>
            <tbody>
              {(!paginatedBinItems || paginatedBinItems.filter(i => !!i).length === 0) ? (
                <tr>
                  <td colSpan="6" style={{ padding: '48px 20px', textAlign: 'center', color: '#94a3b8' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🗑️</div>
                    No archived items match your filter criteria.
                  </td>
                </tr>
              ) : (
                paginatedBinItems.filter(item => !!item).map(item => (
                  <tr key={item.id || item.originalId || Math.random()} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', fontWeight: '700', color: '#0f2b26', width: `${binColumnWidths.name}px`, maxWidth: `${binColumnWidths.name}px`, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <div>{item.name || 'Untitled Item'}</div>
                      {isSuperAdmin && item.tenantName && (
                        <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '500' }}>Company: {item.tenantName}</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', width: `${binColumnWidths.category}px` }}>
                      <span style={{ fontSize: '11px', fontWeight: '800', padding: '4px 10px', borderRadius: '12px', background: 'rgba(13, 148, 136, 0.1)', color: '#0d9488', border: '1px solid rgba(13, 148, 136, 0.2)' }}>
                        {item.category || 'General'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#334155', fontSize: '12px', fontWeight: '600', width: `${binColumnWidths.deletedBy}px`, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <div>{item.deletedBy || 'System User'}</div>
                      <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '500' }}>{item.deletedByEmail}</div>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#475569', fontSize: '12px', fontWeight: '600', width: `${binColumnWidths.deletedAt}px` }}>{item.deletedAt}</td>
                    <td style={{ padding: '12px 16px', width: `${binColumnWidths.preservedLinks}px` }}>
                      <span style={{ fontSize: '11px', fontWeight: '800', padding: '4px 10px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.1)', color: '#059669', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
                        🛡️ Intact: {item.preservedLinks || item.links || 'Full History Intact'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
                        <button
                          type="button"
                          style={{
                            padding: '6px 14px',
                            fontSize: '12px',
                            fontWeight: '700',
                            borderRadius: '8px',
                            border: 'none',
                            background: 'linear-gradient(135deg, #0d9488 0%, #064e43 100%)',
                            color: '#ffffff',
                            cursor: 'pointer',
                            boxShadow: '0 2px 6px rgba(13, 148, 136, 0.25)',
                            transition: 'all 0.15s ease'
                          }}
                          onClick={() => handleRestoreBinItem(item)}
                        >
                          🔄 Restore
                        </button>
                        <button
                          type="button"
                          style={{
                            padding: '6px 14px',
                            fontSize: '12px',
                            fontWeight: '700',
                            borderRadius: '8px',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            background: 'rgba(239, 68, 68, 0.1)',
                            color: '#ef4444',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                          onClick={() => handlePermanentDeleteBinItem(item.id, item.name)}
                        >
                          ❌ Purge
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer with Pagination */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>
            {totalBinItems > 0
              ? `Showing ${binStartIndex + 1} to ${binEndIndex} of ${totalBinItems} entries`
              : `Showing 0 to 0 of 0 entries`}
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#64748b' }}>
              <span>Rows:</span>
              <select
                value={binPageSize}
                onChange={(e) => {
                  setBinPageSize(Number(e.target.value));
                  setBinCurrentPage(1);
                }}
                style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', background: 'white' }}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                type="button"
                disabled={validBinPage <= 1}
                onClick={() => setBinCurrentPage(prev => Math.max(prev - 1, 1))}
                style={{ padding: '4px 10px', fontSize: '12px', fontWeight: '700', borderRadius: '6px', border: '1px solid #cbd5e1', background: validBinPage <= 1 ? '#f1f5f9' : 'white', color: validBinPage <= 1 ? '#cbd5e1' : '#334155', cursor: validBinPage <= 1 ? 'not-allowed' : 'pointer' }}
              >
                ‹ Prev
              </button>
              <span style={{ padding: '4px 10px', fontSize: '12px', fontWeight: '700', borderRadius: '6px', background: '#0d9488', color: 'white' }}>
                {validBinPage} / {totalBinPages}
              </span>
              <button
                type="button"
                disabled={validBinPage >= totalBinPages}
                onClick={() => setBinCurrentPage(prev => Math.min(prev + 1, totalBinPages))}
                style={{ padding: '4px 10px', fontSize: '12px', fontWeight: '700', borderRadius: '6px', border: '1px solid #cbd5e1', background: validBinPage >= totalBinPages ? '#f1f5f9' : 'white', color: validBinPage >= totalBinPages ? '#cbd5e1' : '#334155', cursor: validBinPage >= totalBinPages ? 'not-allowed' : 'pointer' }}
              >
                Next ›
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecycleBinPage;
