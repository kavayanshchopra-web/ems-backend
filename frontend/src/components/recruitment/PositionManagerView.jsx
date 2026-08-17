/**
 * RECRUITMENT REQUISITIONS & POSITIONS FULL PAGE VIEW
 * Replaces popup modals with full page management UI
 */

import React, { useState } from 'react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { Plus, MapPin, Users, ArrowLeft, Trash2, Edit2 } from 'lucide-react';

export default function PositionManagerView({
  positions = [],
  onSavePositions = () => {},
  systemDropdowns = {},
  atsCandidates = [],
  showToast = () => {},
  onBack = () => {}
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
    const candCount = getCandidateCount(pos.title, pos.designation);
    if (candCount > 0) {
      showToast(`Cannot archive position "${pos.title}" because ${candCount} candidate(s) are assigned to it.`, 'error');
      return;
    }

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
      {/* HEADER STRIP */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justify: 'space-between',
          background: '#ffffff',
          padding: '16px 20px',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Button variant="outline" size="sm" icon={<ArrowLeft size={14} />} onClick={onBack}>
            Back to Candidates Pipeline
          </Button>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>
              Job Requisitions & Openings Manager
            </h2>
            <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>
              Manage active hiring openings, locations, and linked candidate requisitions.
            </p>
          </div>
        </div>

        {!showAddForm && (
          <Button variant="primary" size="md" icon={<Plus size={16} />} onClick={openAddPosition}>
            Create New Position
          </Button>
        )}
      </div>

      {/* BODY CONTENT AREA */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          padding: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
        }}
      >
        {!showAddForm ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', fontWeight: '800', color: '#334155' }}>
                Active Positions ({positions.length})
              </span>
            </div>

            <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflowX: 'auto' }}>
              <table style={{ width: '100%', minWidth: '650px', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <tr>
                    <th style={{ padding: '12px 14px', textAlign: 'left', fontWeight: '800', color: '#475569' }}>POSITION TITLE</th>
                    <th style={{ padding: '12px 14px', textAlign: 'left', fontWeight: '800', color: '#475569' }}>DESIGNATION / DEPT</th>
                    <th style={{ padding: '12px 14px', textAlign: 'center', fontWeight: '800', color: '#475569' }}>OPENINGS</th>
                    <th style={{ padding: '12px 14px', textAlign: 'center', fontWeight: '800', color: '#475569' }}>CANDIDATES</th>
                    <th style={{ padding: '12px 14px', textAlign: 'center', fontWeight: '800', color: '#475569' }}>STATUS</th>
                    <th style={{ padding: '12px 14px', textAlign: 'right', fontWeight: '800', color: '#475569' }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {positions.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
                        No active recruitment positions. Click "+ Create New Position" to add one.
                      </td>
                    </tr>
                  ) : (
                    positions.map(pos => {
                      const candCount = getCandidateCount(pos.title, pos.designation);
                      return (
                        <tr key={pos.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '12px 14px' }}>
                            <div style={{ fontWeight: '800', color: '#0f172a', fontSize: '14px' }}>{pos.title}</div>
                            <div style={{ fontSize: '11px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                              <MapPin size={11} /> {pos.location} • {pos.employmentType}
                            </div>
                          </td>
                          <td style={{ padding: '12px 14px' }}>
                            <div style={{ fontWeight: '700', color: '#334155' }}>{pos.designation}</div>
                            <div style={{ fontSize: '11px', color: '#64748b' }}>{pos.department}</div>
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: '800', color: '#0d9488', fontSize: '14px' }}>
                            {pos.openings}
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                            <Badge variant={candCount > 0 ? 'info' : 'neutral'}>
                              <Users size={12} style={{ marginRight: '4px' }} /> {candCount} candidates
                            </Badge>
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'center' }}>
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
                          <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                              <Button
                                variant="outline"
                                size="sm"
                                icon={<Edit2 size={12} />}
                                onClick={() => openEditPosition(pos)}
                              >
                                Edit
                              </Button>
                              <Button
                                variant="secondary"
                                size="sm"
                                icon={<Trash2 size={12} />}
                                onClick={() => handleArchivePosition(pos)}
                                style={{ color: '#ef4444', borderColor: '#fca5a5' }}
                              >
                                Archive
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* CREATE / EDIT POSITION FORM */
          <form onSubmit={handleSaveForm} style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '720px' }}>
            <div style={{ fontWeight: '800', fontSize: '15px', color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
              {editingPosition ? 'Edit Job Requisition' : 'Create New Job Requisition'}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                Position Title / Requisition Name <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Senior React Developer — Chandigarh"
                value={formState.title}
                onChange={(e) => setFormState({ ...formState, title: e.target.value })}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                  System Designation
                </label>
                <select
                  value={formState.designation}
                  onChange={(e) => setFormState({ ...formState, designation: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', background: 'white', outline: 'none' }}
                >
                  {designations.map((d, i) => (
                    <option key={i} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                  Department
                </label>
                <select
                  value={formState.department}
                  onChange={(e) => setFormState({ ...formState, department: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', background: 'white', outline: 'none' }}
                >
                  {departments.map((dep, i) => (
                    <option key={i} value={dep}>{dep}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>Location</label>
                <input
                  type="text"
                  value={formState.location}
                  onChange={(e) => setFormState({ ...formState, location: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>Employment Type</label>
                <select
                  value={formState.employmentType}
                  onChange={(e) => setFormState({ ...formState, employmentType: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', background: 'white', outline: 'none' }}
                >
                  <option value="Full-time">Full-time</option>
                  <option value="Part-time">Part-time</option>
                  <option value="Contract">Contract</option>
                  <option value="Internship">Internship</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>Openings</label>
                <input
                  type="number"
                  min="1"
                  value={formState.openings}
                  onChange={(e) => setFormState({ ...formState, openings: parseInt(e.target.value) || 1 })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
              <Button variant="secondary" size="md" type="button" onClick={() => setShowAddForm(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="md" type="submit">
                {editingPosition ? 'Save Position' : 'Create Position'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
