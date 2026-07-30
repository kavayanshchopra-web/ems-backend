import React from 'react';

/**
 * Global Design System v2.0 - Pagination Primitive
 */
export default function Pagination({
  currentPage = 1,
  totalPages = 1,
  pageSize = 10,
  totalEntries = 0,
  startIndex = 0,
  endIndex = 0,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50],
  style = {},
  className = ''
}) {
  return (
    <div
      className={`app-table-footer ${className}`}
      style={{
        padding: '12px 20px',
        borderTop: '1px solid #e2e8f0',
        display: 'flex',
        justify: 'space-between',
        alignItems: 'center',
        background: '#f8fafc',
        borderBottomLeftRadius: '12px',
        borderBottomRightRadius: '12px',
        flexWrap: 'wrap',
        gap: '12px',
        ...style
      }}
    >
      <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>
        {totalEntries > 0
          ? `Showing ${startIndex + 1} to ${endIndex} of ${totalEntries} entries`
          : `Showing 0 to 0 of 0 entries`}
      </div>

      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        {onPageSizeChange && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#64748b' }}>
            <span>Rows:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', background: 'white', cursor: 'pointer' }}
            >
              {pageSizeOptions.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
        )}

        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
            style={{
              padding: '4px 10px',
              fontSize: '12px',
              fontWeight: '700',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              background: currentPage <= 1 ? '#f1f5f9' : '#ffffff',
              color: currentPage <= 1 ? '#cbd5e1' : '#334155',
              cursor: currentPage <= 1 ? 'not-allowed' : 'pointer'
            }}
          >
            ‹ Prev
          </button>
          <span style={{ padding: '4px 10px', fontSize: '12px', fontWeight: '700', borderRadius: '6px', background: '#0d9488', color: '#ffffff' }}>
            {currentPage} / {totalPages || 1}
          </span>
          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
            style={{
              padding: '4px 10px',
              fontSize: '12px',
              fontWeight: '700',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              background: currentPage >= totalPages ? '#f1f5f9' : '#ffffff',
              color: currentPage >= totalPages ? '#cbd5e1' : '#334155',
              cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer'
            }}
          >
            Next ›
          </button>
        </div>
      </div>
    </div>
  );
}
