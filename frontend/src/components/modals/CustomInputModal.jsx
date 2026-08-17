import React from 'react';
import { X } from 'lucide-react';

export default function CustomInputModal({ inputModal, setInputModal }) {
  if (!inputModal?.isOpen) return null;

  return (
    <div 
      onClick={(e) => {
        if (e.target === e.currentTarget) setInputModal(prev => ({ ...prev, isOpen: false }));
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
    >
      <div style={{
        width: '100%',
        maxWidth: '460px',
        background: '#ffffff',
        borderRadius: '20px',
        boxShadow: '0 25px 60px -15px rgba(0,0,0,0.4), 0 0 0 1px rgba(13, 148, 136, 0.25)',
        overflow: 'hidden',
        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        transform: 'scale(1)',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
      }}>
        {/* Modal Header */}
        <div style={{
          background: 'linear-gradient(135deg, #0d9488 0%, #0f766e 50%, #064e43 100%)',
          padding: '20px 24px',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'relative',
          boxShadow: '0 4px 20px rgba(13, 148, 136, 0.3)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'rgba(255, 255, 255, 0.2)',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.4)'
            }}>
              ✨
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '800', letterSpacing: '-0.01em', color: '#ffffff' }}>
                {inputModal.title || 'Configure Option'}
              </h3>
              {inputModal.subtitle && (
                <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: 'rgba(255, 255, 255, 0.85)', fontWeight: '500' }}>
                  {inputModal.subtitle}
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setInputModal(prev => ({ ...prev, isOpen: false }))}
            style={{
              background: 'rgba(255, 255, 255, 0.15)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: '#ffffff',
              borderRadius: '10px',
              width: '32px',
              height: '32px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={(e) => {
          e.preventDefault();
          if (inputModal.value && inputModal.value.trim() && inputModal.onSave) {
            inputModal.onSave(inputModal.value.trim());
            setInputModal(prev => ({ ...prev, isOpen: false }));
          }
        }}>
          <div style={{ padding: '24px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#334155', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
              Option Title / Value
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                autoFocus
                placeholder={inputModal.placeholder || 'Enter value...'}
                value={inputModal.value || ''}
                onChange={(e) => setInputModal(prev => ({ ...prev, value: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: '2px solid #0d9488',
                  fontSize: '15px',
                  fontWeight: '700',
                  color: '#0f2b26',
                  outline: 'none',
                  background: '#f0fdf4',
                  boxSizing: 'border-box',
                  boxShadow: '0 2px 8px rgba(13, 148, 136, 0.12)',
                  transition: 'all 0.2s ease'
                }}
              />
            </div>
            <p style={{ margin: '8px 0 0 0', fontSize: '11px', color: '#64748b', fontWeight: '500' }}>
              💡 Press <strong style={{ color: '#0d9488' }}>Enter ↵</strong> to save or <strong style={{ color: '#64748b' }}>Esc</strong> to cancel.
            </p>
          </div>

          {/* Modal Actions */}
          <div style={{
            padding: '16px 24px',
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            gap: '12px',
            background: '#f8fafc',
            borderTop: '1px solid #e2e8f0'
          }}>
            <button
              type="button"
              onClick={() => setInputModal(prev => ({ ...prev, isOpen: false }))}
              style={{
                padding: '10px 18px',
                fontSize: '13px',
                fontWeight: '700',
                borderRadius: '10px',
                border: '1.5px solid #cbd5e1',
                background: '#ffffff',
                color: '#475569',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!inputModal.value || !inputModal.value.trim()}
              style={{
                padding: '10px 24px',
                fontSize: '13px',
                fontWeight: '800',
                borderRadius: '10px',
                border: 'none',
                background: inputModal.value && inputModal.value.trim() 
                  ? 'linear-gradient(135deg, #0d9488 0%, #064e43 100%)' 
                  : '#94a3b8',
                color: '#ffffff',
                cursor: inputModal.value && inputModal.value.trim() ? 'pointer' : 'not-allowed',
                boxShadow: inputModal.value && inputModal.value.trim() 
                  ? '0 4px 14px rgba(13, 148, 136, 0.4)' 
                  : 'none',
                transition: 'all 0.2s ease'
              }}
            >
              Save & Apply
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
