import React from 'react';
import { X } from 'lucide-react';

export default function BeatPlannerModal({
  showBeatPlannerModal,
  setShowBeatPlannerModal,
  tempCheckpoints,
  setTempCheckpoints,
  newCheckpointForm,
  setNewCheckpointForm,
  selectedPlannerEmpId,
  setEmployeeBeatPlans
}) {
  if (!showBeatPlannerModal) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content glass-panel" style={{ maxWidth: '480px', color: '#0f2b26' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '800' }}>🗺️ Assign Custom Beat Route</h2>
          <X size={18} style={{ cursor: 'pointer', color: 'var(--text-dim)' }} onClick={() => setShowBeatPlannerModal(false)} />
        </div>

        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
          Create a target beat route for the field agent. Add checkpoints in order of priority. These will render live on the map route trail.
        </p>

        {/* Quick Preset Buttons */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#0d9488', marginBottom: '6px' }}>⚡ QUICK LANDMARK SHORTCUTS:</label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              style={{ padding: '4px 8px', fontSize: '11px', background: '#e0f2fe', color: '#0369a1', border: 'none', borderRadius: '4px', fontWeight: '700', cursor: 'pointer' }}
              onClick={() => setNewCheckpointForm({ name: 'HQ Connaught Place', lat: '28.6139', lng: '77.2090' })}
            >
              🏢 CP HQ Office
            </button>
            <button
              type="button"
              style={{ padding: '4px 8px', fontSize: '11px', background: '#e0f2fe', color: '#0369a1', border: 'none', borderRadius: '4px', fontWeight: '700', cursor: 'pointer' }}
              onClick={() => setNewCheckpointForm({ name: 'DLF Cyber City Gurgaon', lat: '28.4595', lng: '77.0266' })}
            >
              💼 Cyber City
            </button>
            <button
              type="button"
              style={{ padding: '4px 8px', fontSize: '11px', background: '#e0f2fe', color: '#0369a1', border: 'none', borderRadius: '4px', fontWeight: '700', cursor: 'pointer' }}
              onClick={() => setNewCheckpointForm({ name: 'TechCorp Sector 62 Noida', lat: '28.6280', lng: '77.3649' })}
            >
              💻 Noida Sec 62
            </button>
            <button
              type="button"
              style={{ padding: '4px 8px', fontSize: '11px', background: '#e0f2fe', color: '#0369a1', border: 'none', borderRadius: '4px', fontWeight: '700', cursor: 'pointer' }}
              onClick={() => setNewCheckpointForm({ name: 'Lajpat Nagar Hub', lat: '28.5800', lng: '77.2500' })}
            >
              🛍️ Lajpat Nagar
            </button>
          </div>
        </div>

        {/* Checkpoint Add Form */}
        <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '16px' }}>
          <h4 style={{ fontSize: '12px', fontWeight: '800', color: '#0f2b26', marginBottom: '10px' }}>➕ ADD CHECKPOINT</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div className="crm-group">
              <label className="crm-label" style={{ fontSize: '10px' }}>Checkpoint Name</label>
              <input
                type="text"
                className="modal-input"
                placeholder="e.g. DLF Cyber City Hub"
                value={newCheckpointForm.name}
                onChange={(e) => setNewCheckpointForm({ ...newCheckpointForm, name: e.target.value })}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div className="crm-group">
                <label className="crm-label" style={{ fontSize: '10px' }}>Latitude</label>
                <input
                  type="text"
                  className="modal-input"
                  placeholder="e.g. 28.4595"
                  value={newCheckpointForm.lat}
                  onChange={(e) => setNewCheckpointForm({ ...newCheckpointForm, lat: e.target.value })}
                />
              </div>
              <div className="crm-group">
                <label className="crm-label" style={{ fontSize: '10px' }}>Longitude</label>
                <input
                  type="text"
                  className="modal-input"
                  placeholder="e.g. 77.0266"
                  value={newCheckpointForm.lng}
                  onChange={(e) => setNewCheckpointForm({ ...newCheckpointForm, lng: e.target.value })}
                />
              </div>
            </div>
            <button
              type="button"
              className="btn btn-primary"
              style={{ alignSelf: 'flex-end', padding: '6px 14px', fontSize: '11px' }}
              onClick={() => {
                if (!newCheckpointForm.name || !newCheckpointForm.lat || !newCheckpointForm.lng) {
                  return alert('Please fill in checkpoint details');
                }
                const newPt = {
                  id: 't_pt_' + Date.now(),
                  name: newCheckpointForm.name,
                  lat: parseFloat(newCheckpointForm.lat),
                  lng: parseFloat(newCheckpointForm.lng)
                };
                setTempCheckpoints([...tempCheckpoints, newPt]);
                setNewCheckpointForm({ name: '', lat: '', lng: '' });
              }}
            >
              ➕ Add Checkpoint
            </button>
          </div>
        </div>

        {/* Current Route Checkpoint List */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#0d9488', marginBottom: '8px' }}>📋 ACTIVE SEQUENCE PATH:</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '180px', overflowY: 'auto' }}>
            {tempCheckpoints.map((pt, idx) => (
              <div key={pt.id || idx} style={{ background: 'white', border: '1px solid #cbd5e1', padding: '8px 12px', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                <div>
                  <strong style={{ color: 'var(--color-primary)' }}>⭐ {idx + 1}:</strong> {pt.name}
                  <span style={{ fontSize: '10px', color: '#64748b', marginLeft: '6px' }}>({pt.lat}, {pt.lng})</span>
                </div>
                <button
                  type="button"
                  style={{ background: 'none', border: 'none', color: '#ef4444', fontWeight: 'bold', cursor: 'pointer' }}
                  onClick={() => setTempCheckpoints(tempCheckpoints.filter(item => item.id !== pt.id))}
                >
                  Remove
                </button>
              </div>
            ))}
            {tempCheckpoints.length === 0 && (
              <div style={{ textAlign: 'center', padding: '16px', background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '6px', color: '#64748b', fontSize: '12px' }}>
                No checkpoints added yet. Build the path using custom checkpoints.
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="modal-buttons" style={{ borderTop: '1px solid #cbd5e1', paddingTop: '12px' }}>
          <button type="button" className="btn btn-secondary" onClick={() => setShowBeatPlannerModal(false)}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            style={{ background: '#10b981', borderColor: '#10b981' }}
            onClick={() => {
              setEmployeeBeatPlans(prev => ({
                ...prev,
                [selectedPlannerEmpId]: tempCheckpoints
              }));
              setShowBeatPlannerModal(false);
              console.log(`Dispatched beat route allocation to agent ID: ${selectedPlannerEmpId}`);
            }}
          >
            💾 Dispatch Route to Field Agent
          </button>
        </div>
      </div>
    </div>
  );
}
