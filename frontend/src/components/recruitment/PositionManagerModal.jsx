import React, { useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { Plus, Edit2, Archive, MapPin, Users } from 'lucide-react';

/**
 * Recruitment Position Requisition Manager Modal
 * Responsive container & table overflow prevents action clipping.
 */
export default function PositionManagerModal({
  isOpen,
  onClose,
  positions = [],
  onSavePositions,
  systemDropdowns = {},
  atsCandidates = [],
  showToast = () => {}
}) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingPosition, setEditingPosition] = useState(null);

  const designations = (systemDropdowns?.designations || []).map(d => typeof d === 'object' ? d.name : d);
  const departments = (systemDropdowns?.departments || []).map(d => typeof d === 'object' ? d.name : d);

  const [formState, setFormState] = useState({
    title: '',
    designation: designations[0] || 'Software Engineer',
    department: departments[0] || 'IT & Engineering',
    location: 'Chandigarh',
    employmentType: 'Full-time',
    openings: 1,
    status: 'Open',
    description: ''
  });

  const openAddPosition = () => {
    setEditingPosition(null);
    setFormState({
      title: '',
      designation: designations[0] || 'Software Engineer',
      department: departments[0] || 'IT & Engineering',
      location: 'Chandigarh',
      employmentType: 'Full-time',
      openings: 1,
      status: 'Open',
      description: ''
    });
    setShowAddForm(true);
  };

  const openEditPosition = (pos) => {
    setEditingPosition(pos);
    setFormState({
      title: pos.title,
      designation: pos.designation,
      department: pos.department,
      location: pos.location,
      employmentType: pos.employmentType,
      openings: pos.openings || 1,
      status: pos.status || 'Open',
      description: pos.description || ''
    });
    setShowAddForm(true);
  };

  const handleSaveForm = (e) => {
    e.preventDefault();
    if (!formState.title.trim()) {
      showToast('Position Title is required', 'error');
      return;
    }

    if (editingPosition) {
      const updated = positions.map(p => p.id === editingPosition.id ? { ...p, ...formState } : p);
      onSavePositions(updated);
      showToast(`Updated position "${formState.title}"`, 'success');
    } else {
      const newPos = {
        id: 'pos_' + Date.now(),
        ...formState,
        createdAt: new Date().toISOString()
      };
      onSavePositions([newPos, ...positions]);
      showToast(`Created new position "${formState.title}"!`, 'success');
    }

    setShowAddForm(false);
  };

  const handleToggleStatus = (posId, currentStatus) => {
    const nextStatus = currentStatus === 'Open' ? 'Closed' : 'Open';
    const updated = positions.map(p => p.id === posId ? { ...p, status: nextStatus } : p);
    onSavePositions(updated);
    showToast(`Position status set to ${nextStatus}`, 'info');
  };

  const handleArchivePosition = (pos) => {
    if (!window.confirm(`Archive position "${pos.title}"?`)) return;
    const updated = positions.filter(p => p.id !== pos.id);
    onSavePositions(updated);
    showToast(`Archived position "${pos.title}"`, 'info');
  };

  const getCandidateCount = (posTitle, posDesignation) => {
    return (atsCandidates || []).filter(c => {
      const p = String(c.position || '').toLowerCase();
      return p === posTitle.toLowerCase() || p === posDesignation.toLowerCase();
    }).length;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Manage Recruitment Positions & Requisitions"
      subtitle="Define hiring openings linked to System Designations and track active candidate applications."
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: '100%' }}>

        {!showAddForm ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748b' }}>
                Active Positions ({positions.length})
              </span>
              <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={openAddPosition}>
                Create Position
              </Button>
            </div>

            <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflowX: 'auto', overflowY: 'auto', maxHeight: '380px' }}>
              <table style={{ width: '100%', minWidth: '650px', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead style={{ background: '#f8fafc', position: 'sticky', top: 0, zIndex: 5 }}>
                  <tr>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: '800', color: '#475569' }}>POSITION TITLE</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: '800', color: '#475569' }}>DESIGNATION / DEPT</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: '800', color: '#475569' }}>OPENINGS</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: '800', color: '#475569' }}>CANDIDATES</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: '800', color: '#475569' }}>STATUS</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '800', color: '#475569', minWidth: '130px' }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {positions.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
                        No active recruitment positions. Click "+ Create Position" to add one.
                      </td>
                    </tr>
                  ) : (
                    positions.map(pos => {
                      const candCount = getCandidateCount(pos.title, pos.designation);
                      return (
                        <tr key={pos.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '10px 12px' }}>
                            <div style={{ fontWeight: '700', color: '#0f172a' }}>{pos.title}</div>
                            <div style={{ fontSize: '10px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <MapPin size={10} /> {pos.location} • {pos.employmentType}
                            </div>
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <div style={{ fontWeight: '600', color: '#334155' }}>{pos.designation}</div>
                            <div style={{ fontSize: '10px', color: '#64748b' }}>{pos.department}</div>
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: '800', color: '#0d9488' }}>
                            {pos.openings}
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                            <Badge variant={candCount > 0 ? 'info' : 'neutral'}>
                              <Users size={10} style={{ marginRight: '3px' }} /> {candCount}
                            </Badge>
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(pos.id, pos.status)}
                              style={{ border: 'none', background: 'none', cursor: 'pointer' }}
                            >
                              <Badge variant={pos.status === 'Open' ? 'success' : 'neutral'}>
                                {pos.status || 'Open'}
                              </Badge>
                            </button>
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', minWidth: '130px' }}>
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                              <button
                                type="button"
                                onClick={() => openEditPosition(pos)}
                                style={{ padding: '4px 8px', fontSize: '11px', borderRadius: '4px', border: '1px solid #cbd5e1', background: 'white', color: '#334155', cursor: 'pointer' }}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => handleArchivePosition(pos)}
                                style={{ padding: '4px 8px', fontSize: '11px', borderRadius: '4px', border: '1px solid #cbd5e1', background: 'white', color: '#ef4444', cursor: 'pointer' }}
                              >
                                Archive
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          /* ADD / EDIT POSITION FORM */
          <form onSubmit={handleSaveForm} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ fontWeight: '800', fontSize: '13px', color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
              {editingPosition ? 'Edit Recruitment Position' : 'Create New Recruitment Position'}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                Position Title / Requisition Name <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Senior React Developer — Chandigarh"
                value={formState.title}
                onChange={(e) => setFormState({ ...formState, title: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                  System Designation
                </label>
                <select
                  value={formState.designation}
                  onChange={(e) => setFormState({ ...formState, designation: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', background: 'white', outline: 'none' }}
                >
                  {designations.map((d, i) => (
                    <option key={i} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                  Department
                </label>
                <select
                  value={formState.department}
                  onChange={(e) => setFormState({ ...formState, department: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', background: 'white', outline: 'none' }}
                >
                  {departments.map((dep, i) => (
                    <option key={i} value={dep}>{dep}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>Location</label>
                <input
                  type="text"
                  value={formState.location}
                  onChange={(e) => setFormState({ ...formState, location: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>Employment Type</label>
                <select
                  value={formState.employmentType}
                  onChange={(e) => setFormState({ ...formState, employmentType: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', background: 'white', outline: 'none' }}
                >
                  <option value="Full-time">Full-time</option>
                  <option value="Part-time">Part-time</option>
                  <option value="Contract">Contract</option>
                  <option value="Internship">Internship</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>Openings</label>
                <input
                  type="number"
                  min="1"
                  value={formState.openings}
                  onChange={(e) => setFormState({ ...formState, openings: parseInt(e.target.value) || 1 })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
              <Button variant="secondary" size="md" type="button" onClick={() => setShowAddForm(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="md" type="submit">
                {editingPosition ? 'Save Position' : 'Create Position'}
              </Button>
            </div>
          </form>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
          <Button variant="secondary" size="md" onClick={onClose}>
            Close
          </Button>
        </div>

      </div>
    </Modal>
  );
}
