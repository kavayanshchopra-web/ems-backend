/**
 * UNIVERSAL ENTERPRISE EXPORT ENGINE & CUSTOM EXPORT WIZARD
 * 100% Metadata-Driven Custom Export Wizard for all EMS Modules
 */

import React, { useState } from 'react';
import { Download, FileText, FileSpreadsheet, Printer, CheckSquare, Square, X } from 'lucide-react';
import { LabelEngine } from '../LabelEngine';

export default function ExportModal({
  isOpen = false,
  onClose = () => {},
  records = [],
  selectedIds = [],
  moduleConfig = {},
  showToast = () => {}
}) {
  if (!isOpen) return null;

  const fields = moduleConfig.fields || [];
  const columns = moduleConfig.columns || [];
  const entityName = LabelEngine.getEntityName(moduleConfig);
  const entityNamePlural = LabelEngine.getEntityNamePlural(moduleConfig);

  // Initialize selected fields with visible columns by default
  const defaultFieldIds = fields.map(f => f.id);
  const visibleFieldIds = columns.filter(c => c.visible !== false).map(c => c.fieldKey || c.id);

  const [exportScope, setExportScope] = useState(selectedIds.length > 0 ? 'selected' : 'all'); // 'all' | 'selected'
  const [exportFormat, setExportFormat] = useState('excel'); // 'excel' | 'csv' | 'pdf'
  const [fieldSearchQuery, setFieldSearchQuery] = useState('');
  const [selectedFieldIds, setSelectedFieldIds] = useState(
    visibleFieldIds.length > 0 ? visibleFieldIds : defaultFieldIds
  );

  const filteredFields = fields.filter(f =>
    String(f.label || '').toLowerCase().includes(fieldSearchQuery.toLowerCase().trim()) ||
    String(f.id || '').toLowerCase().includes(fieldSearchQuery.toLowerCase().trim())
  );

  const targetRecords = exportScope === 'selected' && selectedIds.length > 0
    ? records.filter(r => selectedIds.includes(r.id))
    : records;

  const handleToggleField = (fieldId) => {
    setSelectedFieldIds(prev =>
      prev.includes(fieldId) ? prev.filter(id => id !== fieldId) : [...prev, fieldId]
    );
  };

  const handleSelectAll = () => {
    setSelectedFieldIds(fields.map(f => f.id));
  };

  const handleSelectVisibleOnly = () => {
    setSelectedFieldIds(visibleFieldIds.length > 0 ? visibleFieldIds : defaultFieldIds);
  };

  const handleClearAll = () => {
    setSelectedFieldIds([]);
  };

  const sanitizeCell = (val) => {
    if (val === undefined || val === null) return '';
    if (typeof val === 'object') return JSON.stringify(val);
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const handleExecuteExport = () => {
    if (targetRecords.length === 0) {
      showToast('No records available to export', 'error');
      return;
    }

    if (selectedFieldIds.length === 0) {
      showToast('Please select at least one field to export', 'warning');
      return;
    }

    const exportFields = fields.filter(f => selectedFieldIds.includes(f.id));
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `${entityNamePlural.toLowerCase().replace(/\s+/g, '_')}_export_${timestamp}`;

    if (exportFormat === 'csv' || exportFormat === 'excel') {
      // Build CSV Data
      const headers = exportFields.map(f => sanitizeCell(f.label)).join(',');
      const rows = targetRecords.map(rec => {
        return exportFields.map(f => {
          let rawVal = rec[f.key || f.id];
          if (rawVal === undefined && rec.customFields) {
            rawVal = rec.customFields[f.key || f.id];
          }
          return sanitizeCell(rawVal);
        }).join(',');
      });

      const csvContent = '\uFEFF' + [headers, ...rows].join('\r\n'); // BOM for UTF-8 Excel support
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `${filename}.${exportFormat === 'excel' ? 'csv' : 'csv'}`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast(`📥 Exported ${targetRecords.length} ${entityNamePlural.toLowerCase()} successfully`, 'success');
      onClose();
    } else if (exportFormat === 'pdf') {
      // Trigger Printable HTML Document Window
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        showToast('Please allow popups to generate PDF report', 'error');
        return;
      }

      const tableHeadersHTML = exportFields.map(f => `<th style="padding:10px 12px; border:1px solid #cbd5e1; background:#f8fafc; font-size:11px; text-transform:uppercase;">${f.label}</th>`).join('');
      const tableRowsHTML = targetRecords.map(rec => {
        const cells = exportFields.map(f => {
          let rawVal = rec[f.key || f.id];
          if (rawVal === undefined && rec.customFields) {
            rawVal = rec.customFields[f.key || f.id];
          }
          return `<td style="padding:8px 12px; border:1px solid #e2e8f0; font-size:12px;">${rawVal !== undefined && rawVal !== null ? String(rawVal) : '—'}</td>`;
        }).join('');
        return `<tr>${cells}</tr>`;
      }).join('');

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${entityNamePlural} Report — ${timestamp}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 24px; color: #0f172a; }
              h2 { margin: 0 0 4px 0; color: #0d9488; }
              p { margin: 0 0 16px 0; color: #64748b; font-size: 13px; }
              table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            </style>
          </head>
          <body>
            <h2>${moduleConfig.name || entityNamePlural} Export Report</h2>
            <p>Generated on ${new Date().toLocaleString()} • Total Records: ${targetRecords.length}</p>
            <table>
              <thead><tr>${tableHeadersHTML}</tr></thead>
              <tbody>${tableRowsHTML}</tbody>
            </table>
            <script>
              window.onload = function() { window.print(); };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
      showToast(`🖨️ PDF Report generated for ${targetRecords.length} records`, 'success');
      onClose();
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '14px',
          width: '100%',
          maxWidth: '560px',
          boxShadow: '0 20px 40px -15px rgba(0,0,0,0.3)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* MODAL HEADER */}
        <div style={{ padding: '18px 24px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Download size={18} color="#0d9488" /> Custom Export Wizard
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>
              Export {entityNamePlural} data with custom field selection
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b', padding: '4px' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* MODAL BODY */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '18px', maxHeight: '70vh', overflowY: 'auto' }}>
          {/* 1. EXPORT SCOPE */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: '800', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '8px' }}>
              1. Select Records Scope
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setExportScope('all')}
                style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: exportScope === 'all' ? '2px solid #0d9488' : '1px solid #cbd5e1',
                  background: exportScope === 'all' ? 'rgba(13, 148, 136, 0.08)' : '#ffffff',
                  color: exportScope === 'all' ? '#0d9488' : '#334155',
                  fontWeight: '700',
                  fontSize: '12.5px',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                All Filtered Records ({records.length})
              </button>
              <button
                type="button"
                onClick={() => setExportScope('selected')}
                disabled={selectedIds.length === 0}
                style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: exportScope === 'selected' ? '2px solid #0d9488' : '1px solid #cbd5e1',
                  background: exportScope === 'selected' ? 'rgba(13, 148, 136, 0.08)' : '#ffffff',
                  color: exportScope === 'selected' ? '#0d9488' : '#334155',
                  fontWeight: '700',
                  fontSize: '12.5px',
                  cursor: selectedIds.length > 0 ? 'pointer' : 'not-allowed',
                  opacity: selectedIds.length > 0 ? 1 : 0.5,
                  textAlign: 'left'
                }}
              >
                Selected Records Only ({selectedIds.length})
              </button>
            </div>
          </div>

          {/* 2. EXPORT FORMAT */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: '800', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '8px' }}>
              2. Select Format
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setExportFormat('excel')}
                style={{
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: exportFormat === 'excel' ? '2px solid #0d9488' : '1px solid #cbd5e1',
                  background: exportFormat === 'excel' ? 'rgba(13, 148, 136, 0.08)' : '#ffffff',
                  color: exportFormat === 'excel' ? '#0d9488' : '#334155',
                  fontWeight: '700',
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <FileSpreadsheet size={15} /> Excel (.csv)
              </button>
              <button
                type="button"
                onClick={() => setExportFormat('csv')}
                style={{
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: exportFormat === 'csv' ? '2px solid #0d9488' : '1px solid #cbd5e1',
                  background: exportFormat === 'csv' ? 'rgba(13, 148, 136, 0.08)' : '#ffffff',
                  color: exportFormat === 'csv' ? '#0d9488' : '#334155',
                  fontWeight: '700',
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <FileText size={15} /> Standard CSV
              </button>
              <button
                type="button"
                onClick={() => setExportFormat('pdf')}
                style={{
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: exportFormat === 'pdf' ? '2px solid #0d9488' : '1px solid #cbd5e1',
                  background: exportFormat === 'pdf' ? 'rgba(13, 148, 136, 0.08)' : '#ffffff',
                  color: exportFormat === 'pdf' ? '#0d9488' : '#334155',
                  fontWeight: '700',
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Printer size={15} /> PDF Report
              </button>
            </div>
          </div>

          {/* 3. FIELD SELECTION CHECKBOXES WITH DEDICATED FIELD SEARCH BAR */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ fontSize: '12px', fontWeight: '800', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                3. Choose Fields ({selectedFieldIds.length} / {fields.length})
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={handleSelectAll}
                  style={{ border: 'none', background: 'transparent', color: '#0d9488', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}
                >
                  Select All
                </button>
                <span style={{ color: '#cbd5e1' }}>•</span>
                <button
                  type="button"
                  onClick={handleSelectVisibleOnly}
                  style={{ border: 'none', background: 'transparent', color: '#0d9488', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}
                >
                  Visible Only
                </button>
                <span style={{ color: '#cbd5e1' }}>•</span>
                <button
                  type="button"
                  onClick={handleClearAll}
                  style={{ border: 'none', background: 'transparent', color: '#ef4444', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}
                >
                  Clear All
                </button>
              </div>
            </div>

            {/* DEDICATED FIELD LABEL SEARCH BAR */}
            <div style={{ marginBottom: '8px' }}>
              <input
                type="text"
                placeholder="🔍 Search field labels (e.g. salary, email, role)..."
                value={fieldSearchQuery}
                onChange={(e) => setFieldSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 12px',
                  fontSize: '12px',
                  borderRadius: '7px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#0f172a',
                  boxSizing: 'border-box',
                  outline: 'none'
                }}
              />
            </div>

            {/* SCROLLABLE FIELD CHECKBOXES GRID */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '8px',
                maxHeight: '170px',
                overflowY: 'auto',
                padding: '10px',
                background: '#f8fafc',
                borderRadius: '8px',
                border: '1px solid #e2e8f0'
              }}
            >
              {filteredFields.length === 0 ? (
                <div style={{ gridColumn: 'span 2', textAlign: 'center', padding: '12px', color: '#64748b', fontSize: '12px' }}>
                  No fields match "{fieldSearchQuery}"
                </div>
              ) : (
                filteredFields.map(field => {
                  const isChecked = selectedFieldIds.includes(field.id);
                  return (
                    <label
                      key={field.id}
                      onClick={() => handleToggleField(field.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '12px',
                        fontWeight: isChecked ? '700' : '500',
                        color: isChecked ? '#0f172a' : '#64748b',
                        cursor: 'pointer',
                        userSelect: 'none'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        style={{ accentColor: '#0d9488', cursor: 'pointer' }}
                      />
                      <span>{field.label}</span>
                    </label>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* MODAL FOOTER */}
        <div style={{ padding: '16px 24px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button
            type="button"
            onClick={onClose}
            style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#475569', fontWeight: '700', fontSize: '12.5px', cursor: 'pointer' }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleExecuteExport}
            style={{ padding: '8px 20px', borderRadius: '6px', border: 'none', background: 'linear-gradient(135deg, #064e43 0%, #0d9488 100%)', color: '#ffffff', fontWeight: '800', fontSize: '12.5px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 6px rgba(13, 148, 136, 0.3)' }}
          >
            <Download size={14} /> Download {targetRecords.length} Records
          </button>
        </div>
      </div>
    </div>
  );
}
