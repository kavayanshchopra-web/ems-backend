/**
 * UNIVERSAL PAGINATION COMPONENT
 */

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({
  currentPage = 1,
  pageSize = 25,
  totalRecords = 0,
  onPageChange = () => {},
  onPageSizeChange = () => {}
}) {
  const totalPages = Math.ceil(totalRecords / pageSize) || 1;
  const startIdx = totalRecords === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endIdx = Math.min(currentPage * pageSize, totalRecords);

  return (
    <div
      className="pagination-container"
      style={{
        display: 'flex',
        alignItems: 'center',
        justify: 'space-between',
        padding: '10px 14px',
        background: '#f8fafc',
        borderTop: '1px solid #e2e8f0',
        fontSize: '12px',
        color: '#475569',
        flexWrap: 'wrap',
        gap: '8px'
      }}
    >
      <div>
        Showing <span style={{ fontWeight: '700', color: '#0f172a' }}>{startIdx}–{endIdx}</span> of{' '}
        <span style={{ fontWeight: '700', color: '#0f172a' }}>{totalRecords}</span> records
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>Per page:</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            style={{ padding: '3px 6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '12px', outline: 'none', background: '#ffffff' }}
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => onPageChange(currentPage - 1)}
            style={{
              padding: '4px 8px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
              opacity: currentPage <= 1 ? 0.5 : 1,
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <ChevronLeft size={14} />
          </button>

          <span style={{ fontWeight: '700', padding: '0 6px' }}>
            {currentPage} / {totalPages}
          </span>

          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => onPageChange(currentPage + 1)}
            style={{
              padding: '4px 8px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
              opacity: currentPage >= totalPages ? 0.5 : 1,
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
