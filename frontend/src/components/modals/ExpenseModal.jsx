import React from 'react';
import { X } from 'lucide-react';
import MediaStorageEngine from '../../core/engines/MediaStorageEngine';

export default function ExpenseModal({
  showExpenseModal,
  setShowExpenseModal,
  expenseForm,
  setExpenseForm,
  selectedExpenseEmpId,
  setEmployeeExpenses,
  isDragActive,
  setIsDragActive,
  showToast,
  authUser
}) {
  if (!showExpenseModal) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content glass-panel" style={{ maxWidth: '440px', color: '#0f2b26' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '800' }}>💰 Log Daily Shift Expenses</h2>
          <X size={18} style={{ cursor: 'pointer', color: 'var(--text-dim)' }} onClick={() => setShowExpenseModal(false)} />
        </div>

        <form onSubmit={(e) => {
          e.preventDefault();
          const tollVal = expenseForm.tollEncountered ? (parseFloat(expenseForm.tollAmount) || 0) : 0;
          const breakfastVal = parseFloat(expenseForm.breakfast) || 0;
          const lunchVal = parseFloat(expenseForm.lunch) || 0;
          const dinnerVal = parseFloat(expenseForm.dinner) || 0;
          const otherVal = parseFloat(expenseForm.otherAmount) || 0;

          const totalSum = tollVal + breakfastVal + lunchVal + dinnerVal + otherVal;

          const expKey = `${selectedExpenseEmpId}_2026-07-18`;
          setEmployeeExpenses(prev => ({
            ...prev,
            [expKey]: {
              tolls: {
                encountered: expenseForm.tollEncountered,
                amount: tollVal,
                receipt_slip: expenseForm.tollEncountered ? 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&q=80&w=600' : ''
              },
              meals: {
                breakfast: breakfastVal,
                lunch: lunchVal,
                dinner: dinnerVal
              },
              other: {
                amount: otherVal,
                description: expenseForm.otherDescription
              },
              status: 'pending',
              totalAmount: totalSum
            }
          }));

          setShowExpenseModal(false);
          setExpenseForm({
            tollEncountered: false,
            tollAmount: '',
            tollSlip: '',
            breakfast: '',
            lunch: '',
            dinner: '',
            otherAmount: '',
            otherDescription: ''
          });
          if (showToast) showToast('⭐ Daily shift expenses logged successfully! Pending manager review.', 'success');
        }} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

          <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={expenseForm.tollEncountered}
                onChange={(e) => setExpenseForm({ ...expenseForm, tollEncountered: e.target.checked })}
                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
              />
              <span>Encountered Road Tolls?</span>
            </label>
          </div>

          {expenseForm.tollEncountered && (
            <>
              <div className="crm-group">
                <label className="crm-label">Toll Cost Amount (₹)</label>
                <input
                  type="number"
                  className="modal-input"
                  placeholder="e.g. 140"
                  value={expenseForm.tollAmount}
                  onChange={(e) => setExpenseForm({ ...expenseForm, tollAmount: e.target.value })}
                  required
                />
              </div>

              <div className="crm-group">
                <label className="crm-label">Upload Toll Receipt Slip Proof</label>
                <div
                  className={`file-dropzone ${isDragActive ? 'active' : ''}`}
                  onDragOver={(e) => { e.preventDefault(); setIsDragActive(true); }}
                  onDragLeave={() => setIsDragActive(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragActive(false);
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      setExpenseForm({ ...expenseForm, tollSlip: e.dataTransfer.files[0].name });
                      if (showToast) showToast(`Selected file: ${e.dataTransfer.files[0].name} via drag-and-drop!`, 'success');
                    }
                  }}
                  style={{ padding: '16px', background: '#f8fafc', border: '2px dashed #cbd5e1', borderRadius: '8px', textAlign: 'center', cursor: 'pointer' }}
                >
                  <span style={{ fontSize: '20px', display: 'block', marginBottom: '4px' }}>📁</span>
                  <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', display: 'block' }}>
                    {expenseForm.tollSlip ? `Selected: ${expenseForm.tollSlip}` : 'Drag & drop toll receipt slip here or click to browse'}
                  </span>
                  <input
                    type="file"
                    style={{ display: 'none' }}
                    id="toll-file-input"
                    onChange={async (e) => {
                      if (e.target.files && e.target.files[0]) {
                        const file = e.target.files[0];
                        try {
                          const res = await MediaStorageEngine.uploadMedia({
                            tenantId: authUser?.companyId || authUser?.tenantId || 'acme_corp',
                            category: 'expenses',
                            entityId: 'toll_receipt',
                            file: file
                          });
                          setExpenseForm(prev => ({ ...prev, tollSlip: res.downloadUrl || file.name }));
                          if (showToast) showToast(`✅ Uploaded toll receipt: ${file.name}`, 'success');
                        } catch (err) {
                          setExpenseForm(prev => ({ ...prev, tollSlip: file.name }));
                          if (showToast) showToast(`Selected file: ${file.name}`, 'success');
                        }
                      }
                    }}
                  />
                  <label htmlFor="toll-file-input" style={{ display: 'inline-block', marginTop: '6px', fontSize: '11px', color: 'var(--color-primary)', textDecoration: 'underline', cursor: 'pointer', fontWeight: '800' }}>
                    Browse Files
                  </label>
                </div>
              </div>
            </>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
            <div className="crm-group">
              <label className="crm-label" style={{ fontSize: '11px' }}>Breakfast (₹)</label>
              <input
                type="number"
                className="modal-input"
                placeholder="e.g. 80"
                value={expenseForm.breakfast}
                onChange={(e) => setExpenseForm({ ...expenseForm, breakfast: e.target.value })}
              />
            </div>
            <div className="crm-group">
              <label className="crm-label" style={{ fontSize: '11px' }}>Lunch (₹)</label>
              <input
                type="number"
                className="modal-input"
                placeholder="e.g. 150"
                value={expenseForm.lunch}
                onChange={(e) => setExpenseForm({ ...expenseForm, lunch: e.target.value })}
              />
            </div>
            <div className="crm-group">
              <label className="crm-label" style={{ fontSize: '11px' }}>Dinner (₹)</label>
              <input
                type="number"
                className="modal-input"
                placeholder="e.g. 200"
                value={expenseForm.dinner}
                onChange={(e) => setExpenseForm({ ...expenseForm, dinner: e.target.value })}
              />
            </div>
          </div>

          <div className="modal-split-grid">
            <div className="crm-group">
              <label className="crm-label">Other Expense Desc</label>
              <input
                type="text"
                className="modal-input"
                placeholder="e.g. Stationaries / Client tea"
                value={expenseForm.otherDescription}
                onChange={(e) => setExpenseForm({ ...expenseForm, otherDescription: e.target.value })}
              />
            </div>
            <div className="crm-group">
              <label className="crm-label">Amount (₹)</label>
              <input
                type="number"
                className="modal-input"
                placeholder="e.g. 50"
                value={expenseForm.otherAmount}
                onChange={(e) => setExpenseForm({ ...expenseForm, otherAmount: e.target.value })}
              />
            </div>
          </div>

          {/* Dynamic Live Estimate */}
          {(() => {
            const tollVal = expenseForm.tollEncountered ? (parseFloat(expenseForm.tollAmount) || 0) : 0;
            const breakfastVal = parseFloat(expenseForm.breakfast) || 0;
            const lunchVal = parseFloat(expenseForm.lunch) || 0;
            const dinnerVal = parseFloat(expenseForm.dinner) || 0;
            const otherVal = parseFloat(expenseForm.otherAmount) || 0;
            const estimatedTotal = tollVal + breakfastVal + lunchVal + dinnerVal + otherVal;

            return (
              <div style={{ padding: '12px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: '700', color: '#166534' }}>💵 ESTIMATED CLAIM TOTAL:</span>
                <strong style={{ fontSize: '16px', color: '#15803d' }}>₹{estimatedTotal.toFixed(2)}</strong>
              </div>
            );
          })()}

          <div className="modal-buttons" style={{ marginTop: '8px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setShowExpenseModal(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              ⭐ Submit Claim
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
