import React from 'react';

export default function ConfirmModal({ confirmModal, setConfirmModal }) {
  if (!confirmModal?.isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 999999,
      padding: '20px'
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '18px',
        padding: '28px 24px 24px',
        maxWidth: '400px',
        width: '100%',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
        border: '1px solid #e2e8f0',
        textAlign: 'center',
        animation: 'fadeIn 0.2s ease-out'
      }}>
        <div style={{
          width: '52px',
          height: '52px',
          borderRadius: '50%',
          background: confirmModal.danger ? '#fee2e2' : '#e0f2fe',
          color: confirmModal.danger ? '#ef4444' : '#0284c7',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px',
          fontSize: '22px'
        }}>
          {confirmModal.danger ? '⚠️' : 'ℹ️'}
        </div>
        <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', marginBottom: '8px' }}>
          {confirmModal.title}
        </h3>
        <p style={{ fontSize: '13px', color: '#64748b', lineHeight: '1.5', marginBottom: '24px' }}>
          {confirmModal.message}
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button
            type="button"
            onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
            style={{
              flex: 1,
              padding: '10px 16px',
              borderRadius: '10px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#475569',
              fontWeight: '700',
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            {confirmModal.cancelText || 'Cancel'}
          </button>
          <button
            type="button"
            onClick={() => {
              if (confirmModal.onConfirm) confirmModal.onConfirm();
              setConfirmModal(prev => ({ ...prev, isOpen: false }));
            }}
            style={{
              flex: 1,
              padding: '10px 16px',
              borderRadius: '10px',
              border: 'none',
              background: confirmModal.danger ? '#dc2626' : '#0d9488',
              color: '#ffffff',
              fontWeight: '700',
              fontSize: '13px',
              cursor: 'pointer',
              boxShadow: confirmModal.danger ? '0 4px 12px rgba(220, 38, 38, 0.35)' : '0 4px 12px rgba(13, 148, 136, 0.35)'
            }}
          >
            {confirmModal.confirmText || 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}
