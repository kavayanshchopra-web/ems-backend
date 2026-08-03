/**
 * UNIVERSAL ENTERPRISE IMPORT ENGINE & CUSTOM IMPORT WIZARD
 * 100% Metadata-Driven Custom Import Wizard for all EMS Modules
 */

import React, { useState, useRef } from 'react';
import { Upload, Download, FileSpreadsheet, CheckCircle2, AlertCircle, RefreshCw, X, ArrowRight, FileText } from 'lucide-react';
import { LabelEngine } from '../LabelEngine';
import { getNextSequentialId } from '../../../services/atsStorageService';

export default function ImportModal({
  isOpen = false,
  onClose = () => {},
  records = [],
  setRecords = () => {},
  moduleConfig = {},
  showToast = () => {}
}) {
  if (!isOpen) return null;

  const fileInputRef = useRef(null);
  const fields = moduleConfig.fields || [];
  const entityName = LabelEngine.getEntityName(moduleConfig);
  const entityNamePlural = LabelEngine.getEntityNamePlural(moduleConfig);

  // Wizard Stages: 1 = Upload, 2 = Mapping, 3 = Preview & Strategy, 4 = Result
  const [step, setStep] = useState(1);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [fileHeaders, setFileHeaders] = useState([]);
  const [parsedRows, setParsedRows] = useState([]);
  const [fieldMapping, setFieldMapping] = useState({}); // { [fileHeader]: targetFieldId }
  const [duplicateStrategy, setDuplicateStrategy] = useState('skip'); // 'skip' | 'overwrite' | 'import_all'
  const [importSummary, setImportSummary] = useState(null);

  // Reset Wizard State on Close
  const handleResetAndClose = () => {
    setStep(1);
    setUploadedFile(null);
    setFileHeaders([]);
    setParsedRows([]);
    setFieldMapping({});
    setDuplicateStrategy('skip');
    setImportSummary(null);
    onClose();
  };

  // 1. DOWNLOAD SAMPLE CSV TEMPLATE
  const handleDownloadSampleTemplate = () => {
    const headerRow = fields.map(f => `"${String(f.label).replace(/"/g, '""')}"`).join(',');
    const sampleRow = fields.map(f => {
      if (f.type === 'email') return '"john.doe@company.com"';
      if (f.type === 'phone') return '"+91 9876543210"';
      if (f.type === 'currency') return '"50000"';
      if (f.type === 'dropdown') return `"${f.options?.[0] || 'Active'}"`;
      return `"Sample ${f.label}"`;
    }).join(',');

    const csvContent = '\uFEFF' + [headerRow, sampleRow].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `sample_${entityNamePlural.toLowerCase().replace(/\s+/g, '_')}_template.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`📥 Downloaded sample template for ${entityNamePlural}`, 'info');
  };

  // 2. PARSE UPLOADED CSV FILE
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv') && !file.name.endsWith('.txt')) {
      showToast('Please upload a valid .csv file', 'error');
      return;
    }

    setUploadedFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result || '';
        const lines = text.split(/\r\n|\n/).filter(line => line.trim().length > 0);

        if (lines.length < 2) {
          showToast('CSV file is empty or missing data rows', 'error');
          return;
        }

        // Parse Headers
        const rawHeaders = lines[0].split(',').map(h => h.replace(/^["']|["']$/g, '').trim());
        setFileHeaders(rawHeaders);

        // Parse Rows
        const dataRows = lines.slice(1).map(line => {
          const cells = line.split(',').map(c => c.replace(/^["']|["']$/g, '').trim());
          const rowObj = {};
          rawHeaders.forEach((header, index) => {
            rowObj[header] = cells[index] !== undefined ? cells[index] : '';
          });
          return rowObj;
        });

        setParsedRows(dataRows);

        // Auto-Match Column Headers with Manifest Fields
        const initialMapping = {};
        rawHeaders.forEach(header => {
          const normHeader = header.toLowerCase().replace(/[^a-z0-9]/g, '');
          const matchedField = fields.find(f => {
            const normLabel = String(f.label).toLowerCase().replace(/[^a-z0-9]/g, '');
            const normId = String(f.id).toLowerCase().replace(/[^a-z0-9]/g, '');
            return normLabel === normHeader || normId === normHeader;
          });

          if (matchedField) {
            initialMapping[header] = matchedField.id;
          } else {
            initialMapping[header] = '__ignore__';
          }
        });

        setFieldMapping(initialMapping);
        setStep(2); // Advance to Field Mapping
      } catch (err) {
        showToast('Failed to parse CSV file', 'error');
      }
    };
    reader.readAsText(file);
  };

  // 3. EXECUTE IMPORT PROCESS
  const handleExecuteImport = () => {
    let importedCount = 0;
    let skippedCount = 0;
    let updatedCount = 0;

    const existingRecords = [...records];
    const existingEmails = new Set(existingRecords.map(r => String(r.email || '').toLowerCase().trim()));
    const existingNames = new Set(existingRecords.map(r => String(r.name || r.fullName || '').toLowerCase().trim()));

    const newRecordsToAppend = [];

    parsedRows.forEach((row, idx) => {
      const recordPayload = {};

      // Map row values into target fields
      Object.keys(fieldMapping).forEach(header => {
        const targetFieldId = fieldMapping[header];
        if (targetFieldId && targetFieldId !== '__ignore__') {
          const fieldDef = fields.find(f => f.id === targetFieldId);
          const rawVal = row[header];
          if (fieldDef) {
            recordPayload[fieldDef.key || fieldDef.id] = rawVal;
          }
        }
      });

      // Name & Email Resolution
      const recordName = recordPayload.name || recordPayload.fullName || recordPayload.employeeName || `Imported ${entityName} ${idx + 1}`;
      const recordEmail = String(recordPayload.email || '').toLowerCase().trim();

      // Check Duplicates
      const isDuplicate = (recordEmail && existingEmails.has(recordEmail)) || (recordName && existingNames.has(recordName.toLowerCase().trim()));

      if (isDuplicate && duplicateStrategy === 'skip') {
        skippedCount++;
        return;
      }

      if (isDuplicate && duplicateStrategy === 'overwrite') {
        const existingIdx = existingRecords.findIndex(r =>
          (recordEmail && String(r.email || '').toLowerCase().trim() === recordEmail) ||
          (recordName && String(r.name || r.fullName || '').toLowerCase().trim() === recordName.toLowerCase().trim())
        );
        if (existingIdx !== -1) {
          existingRecords[existingIdx] = {
            ...existingRecords[existingIdx],
            ...recordPayload,
            updatedAt: new Date().toISOString()
          };
          updatedCount++;
          return;
        }
      }

      // Default Status Assignment if blank
      if (!recordPayload.status && !recordPayload.stage) {
        recordPayload.status = moduleConfig.defaultFields?.find(f => f.id === 'status')?.defaultValue || 'Active';
      }

      // Generate New Sequential Record
      const newId = getNextSequentialId(moduleConfig.moduleId || 'employees', records);
      const createdRecord = {
        id: newId,
        name: recordName,
        ...recordPayload,
        createdAt: new Date().toISOString()
      };

      newRecordsToAppend.push(createdRecord);
      importedCount++;
    });

    const finalRecords = [...newRecordsToAppend, ...existingRecords];
    setRecords(finalRecords);

    // Save Summary & Advance to Final Step
    setImportSummary({
      imported: importedCount,
      updated: updatedCount,
      skipped: skippedCount,
      total: parsedRows.length
    });

    setStep(4);
    showToast(`🎉 Import Complete: ${importedCount} added, ${updatedCount} updated, ${skippedCount} skipped`, 'success');
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
        justify: 'center',
        padding: '16px'
      }}
      onClick={handleResetAndClose}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '14px',
          width: '100%',
          maxWidth: '620px',
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
              <Upload size={18} color="#0d9488" /> Custom Import Wizard
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>
              Import {entityNamePlural} data from CSV / Excel file
            </p>
          </div>
          <button
            type="button"
            onClick={handleResetAndClose}
            style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b', padding: '4px' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* MODAL BODY */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '18px', maxHeight: '70vh', overflowY: 'auto' }}>

          {/* STAGE 1: FILE UPLOAD & TEMPLATE DOWNLOAD */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ padding: '14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '13px', fontWeight: '800', color: '#166534' }}>📥 Download Sample Template</h4>
                  <p style={{ margin: '2px 0 0 0', fontSize: '11.5px', color: '#15803d' }}>Pre-formatted CSV with required column headers</p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadSampleTemplate}
                  style={{ padding: '7px 12px', background: '#059669', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Download size={14} /> Download CSV
                </button>
              </div>

              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: '2px dashed #cbd5e1',
                  borderRadius: '10px',
                  padding: '32px 16px',
                  textAlign: 'center',
                  background: '#f8fafc',
                  cursor: 'pointer',
                  transition: 'border-color 0.15s ease'
                }}
              >
                <FileSpreadsheet size={36} color="#0d9488" style={{ marginBottom: '8px' }} />
                <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: '800', color: '#0f172a' }}>Click to Upload or Drag CSV File</h4>
                <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Supports .csv files with standard headers</p>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept=".csv,.txt"
                  style={{ display: 'none' }}
                />
              </div>
            </div>
          )}

          {/* STAGE 2: FIELD MAPPING */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ margin: 0, fontSize: '13px', fontWeight: '800', color: '#0f172a' }}>
                  Map CSV Columns to {entityName} Fields
                </h4>
                <span style={{ fontSize: '11.5px', color: '#0d9488', fontWeight: '700' }}>
                  {parsedRows.length} Rows Found in File
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '220px', overflowY: 'auto', paddingRight: '4px' }}>
                {fileHeaders.map(header => (
                  <div key={header} style={{ display: 'grid', gridTemplateColumns: '1fr 30px 1fr', alignItems: 'center', gap: '8px', padding: '8px 12px', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '12px', fontWeight: '700', color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      📄 {header}
                    </span>
                    <ArrowRight size={14} color="#64748b" style={{ justifySelf: 'center' }} />
                    <select
                      value={fieldMapping[header] || '__ignore__'}
                      onChange={(e) => setFieldMapping({ ...fieldMapping, [header]: e.target.value })}
                      style={{ padding: '6px 10px', fontSize: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#0f172a', fontWeight: '600' }}
                    >
                      <option value="__ignore__">⛔ Do Not Import</option>
                      {fields.map(f => (
                        <option key={f.id} value={f.id}>
                          ✓ {f.label} ({f.id})
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STAGE 3: DUPLICATE STRATEGY & PREVIEW */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '800', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '8px' }}>
                  Select Duplicate Handling Strategy
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setDuplicateStrategy('skip')}
                    style={{
                      padding: '10px',
                      borderRadius: '8px',
                      border: duplicateStrategy === 'skip' ? '2px solid #0d9488' : '1px solid #cbd5e1',
                      background: duplicateStrategy === 'skip' ? 'rgba(13, 148, 136, 0.08)' : '#ffffff',
                      color: duplicateStrategy === 'skip' ? '#0d9488' : '#334155',
                      fontWeight: '700',
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    🚫 Skip Duplicates
                  </button>
                  <button
                    type="button"
                    onClick={() => setDuplicateStrategy('overwrite')}
                    style={{
                      padding: '10px',
                      borderRadius: '8px',
                      border: duplicateStrategy === 'overwrite' ? '2px solid #0d9488' : '1px solid #cbd5e1',
                      background: duplicateStrategy === 'overwrite' ? 'rgba(13, 148, 136, 0.08)' : '#ffffff',
                      color: duplicateStrategy === 'overwrite' ? '#0d9488' : '#334155',
                      fontWeight: '700',
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    🔄 Overwrite Existing
                  </button>
                  <button
                    type="button"
                    onClick={() => setDuplicateStrategy('import_all')}
                    style={{
                      padding: '10px',
                      borderRadius: '8px',
                      border: duplicateStrategy === 'import_all' ? '2px solid #0d9488' : '1px solid #cbd5e1',
                      background: duplicateStrategy === 'import_all' ? 'rgba(13, 148, 136, 0.08)' : '#ffffff',
                      color: duplicateStrategy === 'import_all' ? '#0d9488' : '#334155',
                      fontWeight: '700',
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    ➕ Import All
                  </button>
                </div>
              </div>

              <div>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '12px', fontWeight: '800', color: '#0f172a', textTransform: 'uppercase' }}>
                  Preview First 3 Rows
                </h4>
                <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '1px solid #cbd5e1' }}>
                        {Object.keys(fieldMapping).filter(h => fieldMapping[h] !== '__ignore__').map(h => (
                          <th key={h} style={{ padding: '6px 10px', textAlign: 'left', fontWeight: '800', color: '#475569' }}>
                            {fields.find(f => f.id === fieldMapping[h])?.label || h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {parsedRows.slice(0, 3).map((row, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          {Object.keys(fieldMapping).filter(h => fieldMapping[h] !== '__ignore__').map(h => (
                            <td key={h} style={{ padding: '6px 10px', color: '#0f172a' }}>
                              {row[h] || '—'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* STAGE 4: SUCCESS SUMMARY */}
          {step === 4 && importSummary && (
            <div style={{ textAlign: 'center', padding: '16px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              <CheckCircle2 size={48} color="#059669" />
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>Import Completed Successfully!</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', width: '100%', maxWidth: '400px', marginTop: '8px' }}>
                <div style={{ padding: '12px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                  <div style={{ fontSize: '20px', fontWeight: '800', color: '#166534' }}>{importSummary.imported}</div>
                  <div style={{ fontSize: '11px', color: '#15803d', fontWeight: '700' }}>Added</div>
                </div>
                <div style={{ padding: '12px', background: '#eff6ff', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                  <div style={{ fontSize: '20px', fontWeight: '800', color: '#1e40af' }}>{importSummary.updated}</div>
                  <div style={{ fontSize: '11px', color: '#1d4ed8', fontWeight: '700' }}>Updated</div>
                </div>
                <div style={{ padding: '12px', background: '#fffbeb', borderRadius: '8px', border: '1px solid #fde68a' }}>
                  <div style={{ fontSize: '20px', fontWeight: '800', color: '#b45309' }}>{importSummary.skipped}</div>
                  <div style={{ fontSize: '11px', color: '#d97706', fontWeight: '700' }}>Skipped</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div style={{ padding: '16px 24px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {step > 1 && step < 4 ? (
            <button
              type="button"
              onClick={() => setStep(prev => prev - 1)}
              style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#475569', fontWeight: '700', fontSize: '12.5px', cursor: 'pointer' }}
            >
              ← Back
            </button>
          ) : (
            <div />
          )}

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={handleResetAndClose}
              style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#475569', fontWeight: '700', fontSize: '12.5px', cursor: 'pointer' }}
            >
              {step === 4 ? 'Close' : 'Cancel'}
            </button>

            {step === 2 && (
              <button
                type="button"
                onClick={() => setStep(3)}
                style={{ padding: '8px 18px', borderRadius: '6px', border: 'none', background: 'linear-gradient(135deg, #064e43 0%, #0d9488 100%)', color: '#ffffff', fontWeight: '800', fontSize: '12.5px', cursor: 'pointer' }}
              >
                Next: Preview & Strategy →
              </button>
            )}

            {step === 3 && (
              <button
                type="button"
                onClick={handleExecuteImport}
                style={{ padding: '8px 20px', borderRadius: '6px', border: 'none', background: 'linear-gradient(135deg, #064e43 0%, #0d9488 100%)', color: '#ffffff', fontWeight: '800', fontSize: '12.5px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                🚀 Confirm & Import {parsedRows.length} Records
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
