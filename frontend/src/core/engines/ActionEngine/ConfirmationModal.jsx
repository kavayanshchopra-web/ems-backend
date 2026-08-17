/**
 * UNIVERSAL CONFIRMATION MODAL COMPONENT
 * Schema-Driven Confirmation Dialog for Archive & Destructive Actions
 */

import React from 'react';
import Modal from '../../../components/ui/Modal';
import Button from '../../../components/ui/Button';
import { AlertTriangle } from 'lucide-react';

export default function ConfirmationModal({
  isOpen = false,
  onClose = () => {},
  onConfirm = () => {},
  title = 'Confirm Action',
  message = '',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isProcessing = false
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            padding: '12px 14px',
            borderRadius: '8px',
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            color: '#991b1b'
          }}
        >
          <AlertTriangle size={20} style={{ color: '#dc2626', flexShrink: 0, marginTop: '2px' }} />
          <div style={{ fontSize: '13px', lineHeight: 1.5, color: '#334155' }}>
            {message}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
          <Button variant="secondary" size="md" onClick={onClose} type="button" disabled={isProcessing}>
            {cancelText}
          </Button>
          <Button
            variant="primary"
            size="md"
            type="button"
            onClick={onConfirm}
            disabled={isProcessing}
            style={{ background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)', color: 'white', border: 'none' }}
          >
            {isProcessing ? 'Processing...' : confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
