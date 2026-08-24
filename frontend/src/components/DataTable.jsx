import React, { useState, useMemo } from 'react';

/**
 * Universal Reusable Data Table Component
 * Includes:
 * - Dynamic Column Sorting (A-Z, Z-A, 1-9, 9-1) on header click
 * - Integrated Table Footer Bar (Showing X to Y of Z entries)
 * - Rows per page selection (10, 25, 50, 100)
 * - Page navigation controls (< Prev, 1, 2, 3, Next >)
 * - Responsive auto-scroll wrapper
 */
export default function DataTable({
  columns = [],
  data = [],
  initialPageSize = 10,
  emptyMessage = "No data available in table.",
  keyExtractor = (row, index) => row.id || index,
  showFooter = true
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [sortKey, setSortKey] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc'); // 'asc' | 'desc'

  // Handle header click for sorting
  const handleSort = (col) => {
    const key = typeof col.accessor === 'string' ? col.accessor : col.sortKey;
    if (!key) return;

    if (sortKey === key) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        setSortKey(null);
        setSortDirection('asc');
      }
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  // Sort data dynamically
  const sortedData = useMemo(() => {
    if (!sortKey) return data;
    return [...data].sort((a, b) => {
      const valA = a[sortKey] ?? '';
      const valB = b[sortKey] ?? '';

      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortDirection === 'asc' ? valA - valB : valB - valA;
      }
      const strA = String(valA).toLowerCase();
      const strB = String(valB).toLowerCase();
      if (strA < strB) return sortDirection === 'asc' ? -1 : 1;
      if (strA > strB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortKey, sortDirection]);

  const totalItems = sortedData.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const validCurrentPage = Math.min(currentPage, totalPages);

  const startIndex = (validCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const currentData = sortedData.slice(startIndex, endIndex);

  const handlePageSizeChange = (e) => {
    setPageSize(Number(e.target.value));
    setCurrentPage(1);
  };

  const handlePrevPage = () => {
    if (validCurrentPage > 1) setCurrentPage(validCurrentPage - 1);
  };

  const handleNextPage = () => {
    if (validCurrentPage < totalPages) setCurrentPage(validCurrentPage + 1);
  };

  return (
    <div className="app-table-card">
      <div className="app-table-wrapper">
        <table className="app-table">
          <thead>
            <tr>
              {columns.map((col, idx) => {
                const key = typeof col.accessor === 'string' ? col.accessor : col.sortKey;
                const isSorted = sortKey === key && key !== undefined;
                const isSortable = key !== undefined;

                return (
                  <th
                    key={idx}
                    style={{
                      ...(col.headerStyle || col.style),
                      cursor: isSortable ? 'pointer' : 'default',
                      userSelect: 'none'
                    }}
                    onClick={() => isSortable && handleSort(col)}
                    title={isSortable ? `Click to sort by ${col.header}` : undefined}
                  >
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <span>{String(col.header || '').replace(/[⇅↑↓]/g, '').trim()}</span>
                      {isSortable && (
                        <span style={{ fontSize: '11px', color: isSorted ? '#0d9488' : '#94a3b8' }}>
                          {isSorted ? (sortDirection === 'asc' ? '▲' : '▼') : '⇅'}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {currentData.length > 0 ? (
              currentData.map((row, rowIndex) => (
                <tr key={keyExtractor(row, rowIndex)}>
                  {columns.map((col, colIndex) => {
                    let val = '';
                    if (typeof col.accessor === 'function') {
                      val = col.accessor(row, rowIndex);
                    } else if (typeof col.accessor === 'string') {
                      val = row[col.accessor];
                    }
                    let cellContent = col.render ? col.render(row, rowIndex) : val;
                    if (!col.render && (col.accessor === 'phone' || col.accessor === 'customerPhone' || col.id === 'phone' || col.id === 'customerPhone' || col.accessor === 'mobile') && val) {
                      cellContent = (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontFamily: 'monospace' }}>{val}</span>
                          <button
                            type="button"
                            title="📞 Call via Softphone"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.openGlobalDialer) {
                                window.openGlobalDialer(val, row.name || row.customerName || '');
                              }
                            }}
                            style={{
                              padding: '1px 5px',
                              borderRadius: '4px',
                              background: 'rgba(16, 185, 129, 0.18)',
                              color: '#059669',
                              border: '1px solid rgba(16, 185, 129, 0.3)',
                              cursor: 'pointer',
                              fontSize: '11px',
                              lineHeight: '1.2'
                            }}
                          >
                            📞
                          </button>
                        </div>
                      );
                    }

                    return (
                      <td key={colIndex} style={col.cellStyle || col.style}>
                        {cellContent}
                      </td>
                    );
                  })}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} style={{ textAlign: 'center', padding: '32px 16px', color: '#94a3b8', fontStyle: 'italic' }}>
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showFooter && (
        <div className="app-table-footer">
          <div className="app-table-footer-left">
            {totalItems > 0
              ? `Showing ${startIndex + 1} to ${endIndex} of ${totalItems} entries`
              : `Showing 0 to 0 of 0 entries`}
          </div>

          <div className="app-table-footer-right">
            <div className="app-table-rows-per-page">
              <span>Rows per page:</span>
              <select value={pageSize} onChange={handlePageSizeChange}>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            <div className="app-table-pagination">
              <button
                type="button"
                className="app-pagination-btn"
                onClick={handlePrevPage}
                disabled={validCurrentPage <= 1}
                title="Previous Page"
              >
                ‹
              </button>
              
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                <button
                  key={pageNum}
                  type="button"
                  className={`app-pagination-btn ${pageNum === validCurrentPage ? 'active' : ''}`}
                  onClick={() => setCurrentPage(pageNum)}
                >
                  {pageNum}
                </button>
              ))}

              <button
                type="button"
                className="app-pagination-btn"
                onClick={handleNextPage}
                disabled={validCurrentPage >= totalPages}
                title="Next Page"
              >
                ›
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
