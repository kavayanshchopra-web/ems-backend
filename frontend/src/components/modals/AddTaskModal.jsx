import React from 'react';
import { X } from 'lucide-react';

export default function AddTaskModal({
  showAddTaskModal,
  setShowAddTaskModal,
  handleSaveTask,
  newTaskForm,
  setNewTaskForm,
  employees
}) {
  if (!showAddTaskModal) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content glass-panel" style={{ maxWidth: '450px', color: '#0f2b26' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '800' }}>Assign Tasks</h2>
          <X size={18} style={{ cursor: 'pointer', color: 'var(--text-dim)' }} onClick={() => setShowAddTaskModal(false)} />
        </div>
        <form onSubmit={handleSaveTask} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="crm-group">
            <label className="crm-label">Task Title</label>
            <input className="crm-input" type="text" required value={newTaskForm.title} onChange={e => setNewTaskForm({ ...newTaskForm, title: e.target.value })} />
          </div>
          <div className="crm-group">
            <label className="crm-label">Description</label>
            <textarea className="crm-textarea" value={newTaskForm.description} onChange={e => setNewTaskForm({ ...newTaskForm, description: e.target.value })} />
          </div>
          <div className="crm-group">
            <label className="crm-label">Assign To</label>
            <select className="crm-select" value={newTaskForm.assignedTo} onChange={e => setNewTaskForm({ ...newTaskForm, assignedTo: e.target.value })}>
              <option value="">Choose Employee</option>
              {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name || ''}</option>)}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div className="crm-group">
              <label className="crm-label">Priority</label>
              <select className="crm-select" value={newTaskForm.priority} onChange={e => setNewTaskForm({ ...newTaskForm, priority: e.target.value })}>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>
            <div className="crm-group">
              <label className="crm-label">Due Date</label>
              <input className="crm-input" type="date" value={newTaskForm.dueDate} onChange={e => setNewTaskForm({ ...newTaskForm, dueDate: e.target.value })} />
            </div>
          </div>
          <button type="submit" className="btn btn-primary" style={{ padding: '12px' }}>Create Task</button>
        </form>
      </div>
    </div>
  );
}
