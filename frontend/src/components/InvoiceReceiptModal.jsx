import React, { useRef } from 'react';
import { 
  X, 
  Printer, 
  Download, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Building2, 
  ShieldCheck, 
  QrCode,
  FileText,
  CreditCard,
  Layers
} from 'lucide-react';
import SubscriptionEngine, { formatINR, amountInWords, DEFAULT_PRICING_CONFIG } from '../core/engines/SubscriptionEngine';

export default function InvoiceReceiptModal({ invoice, isOpen, onClose }) {
  const printRef = useRef(null);

  if (!isOpen || !invoice) return null;

  const seller = DEFAULT_PRICING_CONFIG?.sellerDetails || {
    legalName: DEFAULT_PRICING_CONFIG?.platformLegalName || 'OmniFlow Cloud Technologies Private Limited',
    tagline: DEFAULT_PRICING_CONFIG?.platformTradeName || 'OmniFlow EMS & CRM Platform',
    gstin: DEFAULT_PRICING_CONFIG?.platformGSTIN || '06AAHCO0192A1ZK',
    pan: DEFAULT_PRICING_CONFIG?.platformPAN || 'AAHCO0192A',
    address: DEFAULT_PRICING_CONFIG?.platformAddress || 'DLF Cyber City, Tower B, Phase III, Sector 24, Gurugram, Haryana - 122002',
    state: DEFAULT_PRICING_CONFIG?.platformState || 'Haryana',
    stateCode: DEFAULT_PRICING_CONFIG?.platformStateCode || '06',
    email: DEFAULT_PRICING_CONFIG?.platformEmail || 'billing@employeemanagementsystems.com',
    phone: DEFAULT_PRICING_CONFIG?.platformPhone || '+91 98765 43210',
    website: DEFAULT_PRICING_CONFIG?.platformWebsite || 'https://employeemanagementsystems.com'
  };

  const isPaid = invoice.status === 'paid' || invoice.status === 'active';
  const isPending = invoice.status === 'pending' || invoice.status === 'payment_under_review';

  const buyerState = invoice.buyer_state || invoice.buyerState || 'Haryana';
  const sellerState = seller?.state || 'Haryana';
  const isIntraState = buyerState.toLowerCase().trim() === sellerState.toLowerCase().trim();

  const handlePrint = () => {
    window.print();
  };

  const lineItems = Array.isArray(invoice.line_items) 
    ? invoice.line_items 
    : (typeof invoice.line_items === 'string' ? JSON.parse(invoice.line_items || '[]') : []);

  const taxableAmount = Number(invoice.taxable_subtotal || invoice.taxableSubtotal || (invoice.subtotal - (invoice.discount || 0))) || 0;
  const grandTotal = Number(invoice.grand_total || invoice.grandTotal || invoice.amount_paid) || 0;
  const taxRate = Number(invoice.tax_rate || invoice.taxRate) || 18;
  const taxAmount = Number(invoice.tax_amount || invoice.taxAmount) || 0;
  const cgst = Number(invoice.cgst_amount || invoice.cgstAmount) || (isIntraState ? taxAmount / 2 : 0);
  const sgst = Number(invoice.sgst_amount || invoice.sgstAmount) || (isIntraState ? taxAmount / 2 : 0);
  const igst = Number(invoice.igst_amount || invoice.igstAmount) || (!isIntraState ? taxAmount : 0);

  const s = {
    overlay: {
      position: 'fixed',
      inset: 0,
      background: 'rgba(5, 8, 17, 0.85)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '20px',
      overflowY: 'auto'
    },
    modal: {
      background: '#0f172a',
      border: '1px solid rgba(255, 255, 255, 0.12)',
      borderRadius: '20px',
      maxWidth: '860px',
      width: '100%',
      color: '#ffffff',
      boxShadow: '0 25px 60px rgba(0, 0, 0, 0.6)',
      overflow: 'hidden',
      position: 'relative'
    },
    topBar: {
      padding: '16px 24px',
      background: 'rgba(30, 41, 59, 0.8)',
      borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    },
    body: {
      padding: '28px',
      background: '#0b1120',
      color: '#e2e8f0',
      fontFamily: "'Inter', sans-serif"
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
      marginTop: '16px',
      fontSize: '12.5px'
    },
    th: {
      textAlign: 'left',
      padding: '10px 12px',
      background: 'rgba(30, 41, 59, 0.9)',
      color: '#94a3b8',
      fontWeight: '700',
      borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
    },
    td: {
      padding: '12px',
      borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
      color: '#cbd5e1'
    }
  };

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={(e) => e.stopPropagation()}>
        
        {/* Top Bar */}
        <div style={s.topBar}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileText size={18} style={{ color: '#2dd4bf' }} />
            <h3 style={{ fontSize: '16px', fontWeight: '800', margin: 0, color: '#ffffff' }}>
              Tax Invoice & Payment Receipt
            </h3>
            <span style={{
              fontSize: '11px',
              padding: '2px 8px',
              borderRadius: '20px',
              fontWeight: '700',
              background: isPaid ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
              color: isPaid ? '#34d399' : '#fbbf24',
              border: isPaid ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(245, 158, 11, 0.4)'
            }}>
              {isPaid ? 'PAID / VERIFIED' : 'PAYMENT UNDER REVIEW'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={handlePrint}
              style={{
                background: '#0d9488',
                color: '#ffffff',
                border: 'none',
                padding: '7px 14px',
                borderRadius: '8px',
                fontSize: '12.5px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Printer size={14} />
              <span>Print A4 Invoice</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                color: '#cbd5e1',
                padding: '7px',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Invoice Printable Document */}
        <div ref={printRef} style={s.body}>
          
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '20px', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span style={{ fontSize: '20px' }}>⚡</span>
                <h2 style={{ fontSize: '18px', fontWeight: '800', margin: 0, color: '#ffffff' }}>
                  {seller.legalName}
                </h2>
              </div>
              <p style={{ fontSize: '11.5px', color: '#94a3b8', margin: '2px 0' }}>{seller.address}</p>
              <p style={{ fontSize: '11.5px', color: '#94a3b8', margin: '2px 0' }}>
                GSTIN: <strong style={{ color: '#2dd4bf', fontFamily: 'monospace' }}>{seller.gstin}</strong> | State Code: {seller.stateCode} ({seller.state})
              </p>
              <p style={{ fontSize: '11.5px', color: '#94a3b8', margin: '2px 0' }}>Support: {seller.email} | Telephony: {seller.phone}</p>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ display: 'inline-block', padding: '3px 10px', background: 'rgba(45, 212, 191, 0.15)', border: '1px solid rgba(45, 212, 191, 0.3)', borderRadius: '6px', color: '#2dd4bf', fontSize: '11px', fontWeight: '800', marginBottom: '8px' }}>
                TAX INVOICE (Sec. 31 CGST Act)
              </div>
              <div style={{ fontSize: '12px', fontFamily: 'monospace', color: '#cbd5e1' }}>
                <div>Invoice No: <strong style={{ color: '#ffffff' }}>{invoice.invoice_number || invoice.invoiceNumber}</strong></div>
                <div>Date: {new Date(invoice.invoice_date || invoice.created_at || Date.now()).toLocaleDateString('en-IN')}</div>
                <div>Place of Supply: {buyerState}</div>
                <div>Reverse Charge: No</div>
              </div>
            </div>
          </div>

          {/* Billed To */}
          <div style={{ background: 'rgba(30, 41, 59, 0.5)', borderRadius: '12px', padding: '16px', marginBottom: '20px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <span style={{ fontSize: '11px', fontWeight: '800', color: '#2dd4bf', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>
              Billed To (Customer Details)
            </span>
            <div style={{ fontSize: '13px', fontWeight: '700', color: '#ffffff' }}>
              {invoice.company_name || invoice.companyName || 'Registered Enterprise Customer'}
            </div>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
              Admin: {invoice.buyer_name || invoice.buyerName || 'Primary Administrator'} • {invoice.buyer_email || invoice.buyerEmail}
            </div>
            {invoice.buyer_gstin && (
              <div style={{ fontSize: '12px', color: '#e2e8f0', marginTop: '2px' }}>
                Buyer GSTIN: <strong style={{ color: '#2dd4bf', fontFamily: 'monospace' }}>{invoice.buyer_gstin}</strong>
              </div>
            )}
          </div>

          {/* Line Items Table */}
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Description of Cloud Services</th>
                <th style={s.th}>SAC Code</th>
                <th style={{ ...s.th, textAlign: 'right' }}>Taxable Amount</th>
              </tr>
            </thead>
            <tbody>
              {lineItems.length > 0 ? (
                lineItems.map((item, idx) => (
                  <tr key={idx}>
                    <td style={s.td}>
                      <strong>{item.description || item.name}</strong>
                      {item.details && <div style={{ fontSize: '11px', color: '#94a3b8' }}>{item.details}</div>}
                    </td>
                    <td style={{ ...s.td, fontFamily: 'monospace' }}>{item.sacCode || '998313'}</td>
                    <td style={{ ...s.td, textAlign: 'right', fontWeight: '700', color: '#ffffff' }}>{formatINR(item.amount || item.taxableAmount)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td style={s.td}>
                    <strong>{invoice.plan_name || 'Enterprise SaaS Plan Subscription'}</strong>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>Cloud CRM, Multi-Tenant Telecalling & HR Management Suite</div>
                  </td>
                  <td style={{ ...s.td, fontFamily: 'monospace' }}>998313</td>
                  <td style={{ ...s.td, textAlign: 'right', fontWeight: '700', color: '#ffffff' }}>{formatINR(taxableAmount)}</td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Tax Breakdown & Totals */}
          <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{ maxWidth: '340px', width: '100%', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12.5px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#cbd5e1' }}>
                <span>Taxable Subtotal (SAC 998313):</span>
                <span>{formatINR(taxableAmount)}</span>
              </div>

              {isIntraState ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                    <span>CGST (9%):</span>
                    <span>{formatINR(cgst)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                    <span>SGST (9%):</span>
                    <span>{formatINR(sgst)}</span>
                  </div>
                </>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                  <span>IGST (18%):</span>
                  <span>{formatINR(igst)}</span>
                </div>
              )}

              <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.1)', margin: '6px 0' }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', fontWeight: '800', color: '#2dd4bf' }}>
                <span>Total Amount (INR):</span>
                <span>{formatINR(grandTotal)}</span>
              </div>
            </div>
          </div>

          <div style={{ marginTop: '16px', fontSize: '11.5px', color: '#94a3b8', fontStyle: 'italic', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '10px' }}>
            Amount in words: {amountInWords(grandTotal)}
          </div>

          {/* Signature & Verification Note */}
          <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: '16px', borderTop: '1px dashed rgba(255, 255, 255, 0.1)' }}>
            <div style={{ fontSize: '11px', color: '#64748b' }}>
              This is a digitally generated tax invoice under Section 31 CGST Act. No physical signature required.
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '12px', fontWeight: '700', color: '#ffffff' }}>For {seller.legalName}</div>
              <div style={{ fontSize: '11px', color: '#10b981', fontWeight: '600', marginTop: '4px' }}>✓ Digitally Authorized Signatory</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
