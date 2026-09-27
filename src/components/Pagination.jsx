import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

export default function Pagination({
  currentPage,
  page,
  totalItems,
  total,
  pageSize = 10,
  pageSizeOptions = [10, 25, 50, 100],
  onPageChange,
  onPageSizeChange,
  itemName = 'items',
  disabled = false
}) {
  const activePage = page !== undefined ? page : (currentPage !== undefined ? currentPage : 1);
  const activeTotal = total !== undefined ? total : (totalItems !== undefined ? totalItems : 0);
  const totalPages = Math.max(1, Math.ceil(activeTotal / pageSize));
  const validPage = Math.max(1, Math.min(activePage, totalPages));

  if (activeTotal <= 0 && totalPages <= 1) {
    return null;
  }

  const startItem = activeTotal === 0 ? 0 : (validPage - 1) * pageSize + 1;
  const endItem = Math.min(validPage * pageSize, activeTotal);

  // Generate page numbers with smart window & ellipsis
  const getPageNumbers = () => {
    const delta = 2;
    const range = [];
    const rangeWithDots = [];
    let l;

    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= validPage - delta && i <= validPage + delta)) {
        range.push(i);
      }
    }

    for (const i of range) {
      if (l) {
        if (i - l === 2) {
          rangeWithDots.push(l + 1);
        } else if (i - l !== 1) {
          rangeWithDots.push('...');
        }
      }
      rangeWithDots.push(i);
      l = i;
    }

    return rangeWithDots;
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 20px',
        borderTop: '1px solid #e2e8f0',
        background: '#ffffff',
        flexWrap: 'wrap',
        gap: 12,
        fontFamily: 'inherit'
      }}
    >
      {/* Left: Summary and Per Page Selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 13, color: '#64748b' }}>
        <span>
          Showing <strong>{startItem}</strong> to <strong>{endItem}</strong> of{' '}
          <strong>{activeTotal.toLocaleString()}</strong> {itemName}
        </span>

        {onPageSizeChange && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>Per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                const newSize = Number(e.target.value);
                onPageSizeChange(newSize);
                if (onPageChange) onPageChange(1);
              }}
              disabled={disabled}
              style={{
                padding: '4px 8px',
                borderRadius: 6,
                border: '1px solid #cbd5e1',
                fontSize: 12.5,
                background: '#ffffff',
                color: '#334155',
                cursor: disabled ? 'not-allowed' : 'pointer',
                fontWeight: 500
              }}
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Right: Navigation Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {/* First page button */}
        <button
          type="button"
          onClick={() => onPageChange && onPageChange(1)}
          disabled={validPage <= 1 || disabled}
          title="First Page"
          style={{
            minWidth: 30,
            height: 30,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid #e2e8f0',
            borderRadius: 6,
            background: '#ffffff',
            color: '#475569',
            cursor: validPage <= 1 || disabled ? 'not-allowed' : 'pointer',
            opacity: validPage <= 1 || disabled ? 0.45 : 1,
            transition: 'all 0.15s'
          }}
        >
          <ChevronsLeft size={15} />
        </button>

        {/* Prev button */}
        <button
          type="button"
          onClick={() => onPageChange && onPageChange(validPage - 1)}
          disabled={validPage <= 1 || disabled}
          title="Previous Page"
          style={{
            minWidth: 30,
            height: 30,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid #e2e8f0',
            borderRadius: 6,
            background: '#ffffff',
            color: '#475569',
            cursor: validPage <= 1 || disabled ? 'not-allowed' : 'pointer',
            opacity: validPage <= 1 || disabled ? 0.45 : 1,
            transition: 'all 0.15s'
          }}
        >
          <ChevronLeft size={15} />
        </button>

        {/* Numbered Pills */}
        {getPageNumbers().map((p, idx) =>
          p === '...' ? (
            <span key={`dots-${idx}`} style={{ padding: '0 6px', color: '#94a3b8', fontSize: 13, userSelect: 'none' }}>
              …
            </span>
          ) : (
            <button
              key={`page-${p}`}
              type="button"
              onClick={() => onPageChange && onPageChange(p)}
              disabled={disabled}
              style={{
                minWidth: 32,
                height: 30,
                padding: '0 8px',
                borderRadius: 6,
                border: validPage === p ? '1px solid #008744' : '1px solid #e2e8f0',
                background: validPage === p ? '#008744' : '#ffffff',
                color: validPage === p ? '#ffffff' : '#334155',
                fontSize: 12.5,
                fontWeight: validPage === p ? 700 : 500,
                cursor: disabled ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s'
              }}
            >
              {p}
            </button>
          )
        )}

        {/* Next button */}
        <button
          type="button"
          onClick={() => onPageChange && onPageChange(validPage + 1)}
          disabled={validPage >= totalPages || disabled}
          title="Next Page"
          style={{
            minWidth: 30,
            height: 30,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid #e2e8f0',
            borderRadius: 6,
            background: '#ffffff',
            color: '#475569',
            cursor: validPage >= totalPages || disabled ? 'not-allowed' : 'pointer',
            opacity: validPage >= totalPages || disabled ? 0.45 : 1,
            transition: 'all 0.15s'
          }}
        >
          <ChevronRight size={15} />
        </button>

        {/* Last page button */}
        <button
          type="button"
          onClick={() => onPageChange && onPageChange(totalPages)}
          disabled={validPage >= totalPages || disabled}
          title="Last Page"
          style={{
            minWidth: 30,
            height: 30,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid #e2e8f0',
            borderRadius: 6,
            background: '#ffffff',
            color: '#475569',
            cursor: validPage >= totalPages || disabled ? 'not-allowed' : 'pointer',
            opacity: validPage >= totalPages || disabled ? 0.45 : 1,
            transition: 'all 0.15s'
          }}
        >
          <ChevronsRight size={15} />
        </button>
      </div>
    </div>
  );
}
