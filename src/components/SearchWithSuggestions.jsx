import { useState, useRef, useEffect } from 'react';
import { Search, X, Building2, MapPin, Package, FileText, Award } from 'lucide-react';

export default function SearchWithSuggestions({
  value = '',
  onChange,
  onSelect,
  placeholder = 'Search...',
  suggestions = [],
  className = '',
  style = {}
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleSelect = (item) => {
    const textToFill = typeof item === 'string' ? item : (item.value || item.label || '');
    onChange?.(textToFill);
    onSelect?.(item);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleClear = () => {
    onChange?.('');
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const getIcon = (type) => {
    switch (type) {
      case 'Company':
        return <Building2 size={14} style={{ color: '#008744', flexShrink: 0 }} />;
      case 'Site':
        return <MapPin size={14} style={{ color: '#0284c7', flexShrink: 0 }} />;
      case 'Product':
        return <Package size={14} style={{ color: '#f59e0b', flexShrink: 0 }} />;
      case 'Certificate':
        return <Award size={14} style={{ color: '#8b5cf6', flexShrink: 0 }} />;
      default:
        return <FileText size={14} style={{ color: '#64748b', flexShrink: 0 }} />;
    }
  };

  const showDropdown = isOpen && Boolean(value.trim()) && suggestions.length > 0;

  return (
    <div
      ref={containerRef}
      className={`search-box-container ${className}`}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        minWidth: 260,
        maxWidth: 420,
        width: '100%',
        ...style
      }}
    >
      <div
        className="search-box"
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          position: 'relative',
          background: 'white',
          borderRadius: 8,
          border: '1px solid #e2e8f0',
          transition: 'all 0.15s ease',
          padding: '0 8px 0 10px',
          boxSizing: 'border-box'
        }}
      >
        <Search size={15} className="search-icon" style={{ color: '#94a3b8', flexShrink: 0 }} />
        <input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => {
            onChange?.(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            if (value.trim()) setIsOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setIsOpen(false);
          }}
          style={{
            border: 'none',
            outline: 'none',
            boxShadow: 'none',
            background: 'transparent',
            padding: '8px 8px 8px 8px',
            fontSize: 13,
            color: '#0f172a',
            width: '100%',
            fontWeight: 500
          }}
        />
        {value && (
          <button
            type="button"
            onClick={handleClear}
            style={{
              background: 'none',
              border: 'none',
              padding: 4,
              cursor: 'pointer',
              color: '#94a3b8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 4
            }}
            title="Clear search"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Autocomplete Dropdown List */}
      {showDropdown && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            background: '#ffffff',
            borderRadius: 10,
            border: '1px solid #e2e8f0',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
            maxHeight: 280,
            overflowY: 'auto',
            zIndex: 1100,
            padding: '4px 0',
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
          }}
        >
          <div
            style={{
              padding: '6px 12px',
              fontSize: 11,
              fontWeight: 700,
              color: '#94a3b8',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              borderBottom: '1px solid #f1f5f9'
            }}
          >
            Suggestions ({suggestions.length})
          </div>
          {suggestions.map((item, idx) => {
            const label = typeof item === 'string' ? item : item.label;
            const type = typeof item === 'string' ? 'Company' : (item.type || 'Company');
            const subtext = typeof item === 'string' ? null : item.subtext;

            return (
              <div
                key={idx}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(item);
                }}
                style={{
                  padding: '8px 12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                  fontSize: 13,
                  transition: 'background-color 0.12s ease'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, overflow: 'hidden' }}>
                  {getIcon(type)}
                  <div style={{ minWidth: 0, overflow: 'hidden' }}>
                    <div style={{ fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {label}
                    </div>
                    {subtext && (
                      <div style={{ fontSize: 11, color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {subtext}
                      </div>
                    )}
                  </div>
                </div>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: 6,
                    background: type === 'Company' ? '#dcfce7' : (type === 'Site' ? '#e0f2fe' : '#f1f5f9'),
                    color: type === 'Company' ? '#15803d' : (type === 'Site' ? '#0369a1' : '#475569'),
                    textTransform: 'uppercase',
                    letterSpacing: '0.03em',
                    flexShrink: 0
                  }}
                >
                  {type}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
