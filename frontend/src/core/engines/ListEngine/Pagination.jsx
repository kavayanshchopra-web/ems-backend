/**
 * ENTERPRISE NUMBERED PAGINATION COMPONENT
 * Renders << < 1 2 3 ... 10 > >> Page Pills with Per Page Selector (10, 25, 50, 100)
 */

import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

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

  // Generate numbered page buttons (e.g. 1 2 3 4 5)
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;

    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);

    if (endPage - startPage + 1 < maxVisible) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return { pages, startPage, endPage };
  };

  const { pages, startPage, endPage } = getPageNumbers();

  return (
    <div
      className="pagination-container"
      style={{
        display: 'flex',
        alignItems: 'center',
        justify: 'space-between',
        padding: '10px 16px',
        background: '#f8fafc',
        borderTop: '1px solid #e2e8f0',
        fontSize: '12px',
        color: '#475569',
        flexWrap: 'wrap',
        gap: '12px',
        userSelect: 'none'
      }}
    >
      {/* 1. COUNTER TEXT */}
      <div style={{ fontWeight: '600' }}>
        Showing <span style={{ fontWeight: '800', color: '#0f172a' }}>{startIdx}–{endIdx}</span> of{' '}
        <span style={{ fontWeight: '800', color: '#0f172a' }}>{totalRecords}</span> Candidates
      </div>

      {/* 2. RIGHT CONTROLS: PER PAGE SELECTOR + NUMBERED PAGE PILLS */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        {/* PER PAGE SELECTOR */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b' }}>Per page:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              onPageSizeChange(Number(e.target.value));
              onPageChange(1);
            }}
            style={{
              padding: '4px 8px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '12px',
              fontWeight: '700',
              outline: 'none',
              background: '#ffffff',
              color: '#0d9488',
              cursor: 'pointer'
            }}
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>

        {/* ENTERPRISE NUMBERED PAGE PILLS << < 1 2 3 ... > >> */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {/* FIRST PAGE << */}
          <button
            type="button"
            title="First Page"
            disabled={currentPage <= 1}
            onClick={() => onPageChange(1)}
            style={{
              padding: '4px 6px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: currentPage <= 1 ? '#cbd5e1' : '#334155',
              cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <ChevronsLeft size={14} />
          </button>

          {/* PREVIOUS PAGE < */}
          <button
            type="button"
            title="Previous Page"
            disabled={currentPage <= 1}
            onClick={() => onPageChange(currentPage - 1)}
            style={{
              padding: '4px 6px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: currentPage <= 1 ? '#cbd5e1' : '#334155',
              cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <ChevronLeft size={14} />
          </button>

          {/* FIRST PAGE NUMBER IF TRUNCATED */}
          {startPage > 1 && (
            <>
              <button
                type="button"
                onClick={() => onPageChange(1)}
                style={{
                  minWidth: '28px',
                  height: '28px',
                  padding: '0 6px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#334155',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                1
              </button>
              {startPage > 2 && <span style={{ color: '#94a3b8', fontSize: '11px', padding: '0 2px' }}>...</span>}
            </>
          )}

          {/* NUMBERED PAGE BUTTONS */}
          {pages.map((p) => {
            const isActive = p === currentPage;
            return (
              <button
                key={p}
                type="button"
                onClick={() => onPageChange(p)}
                style={{
                  minWidth: '28px',
                  height: '28px',
                  padding: '0 6px',
                  borderRadius: '6px',
                  border: isActive ? '1px solid #0d9488' : '1px solid #cbd5e1',
                  background: isActive ? '#0d9488' : '#ffffff',
                  color: isActive ? '#ffffff' : '#334155',
                  fontSize: '12px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  boxShadow: isActive ? '0 2px 4px rgba(13, 148, 136, 0.2)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                {p}
              </button>
            );
          })}

          {/* LAST PAGE NUMBER IF TRUNCATED */}
          {endPage < totalPages && (
            <>
              {endPage < totalPages - 1 && <span style={{ color: '#94a3b8', fontSize: '11px', padding: '0 2px' }}>...</span>}
              <button
                type="button"
                onClick={() => onPageChange(totalPages)}
                style={{
                  minWidth: '28px',
                  height: '28px',
                  padding: '0 6px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#334155',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                {totalPages}
              </button>
            </>
          )}

          {/* NEXT PAGE > */}
          <button
            type="button"
            title="Next Page"
            disabled={currentPage >= totalPages}
            onClick={() => onPageChange(currentPage + 1)}
            style={{
              padding: '4px 6px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: currentPage >= totalPages ? '#cbd5e1' : '#334155',
              cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <ChevronRight size={14} />
          </button>

          {/* LAST PAGE >> */}
          <button
            type="button"
            title="Last Page"
            disabled={currentPage >= totalPages}
            onClick={() => onPageChange(totalPages)}
            style={{
              padding: '4px 6px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: currentPage >= totalPages ? '#cbd5e1' : '#334155',
              cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <ChevronsRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
