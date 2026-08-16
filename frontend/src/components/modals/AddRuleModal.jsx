import React from 'react';
import { X } from 'lucide-react';

export default function AddRuleModal({
  showAddRuleModal,
  setShowAddRuleModal,
  handleAddChatbotRule,
  chatbotRuleError,
  chatbotRuleKeyword,
  setChatbotRuleKeyword,
  chatbotRuleMatchType,
  setChatbotRuleMatchType,
  chatbotRuleReply,
  setChatbotRuleReply
}) {
  if (!showAddRuleModal) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content glass-panel" style={{ maxWidth: '440px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '700' }}>Add Chatbot Rule</h2>
          <X size={18} style={{ cursor: 'pointer', color: 'var(--text-dim)' }} onClick={() => setShowAddRuleModal(false)} />
        </div>

        <form onSubmit={handleAddChatbotRule} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {chatbotRuleError && (
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '10px 12px', borderRadius: '8px', color: '#f87171', fontSize: '12px' }}>
              {chatbotRuleError}
            </div>
          )}

          <div className="crm-group">
            <label className="crm-label">Matching Keyword/Phrase</label>
            <input
              type="text"
              className="modal-input"
              placeholder="e.g. price"
              value={chatbotRuleKeyword}
              onChange={(e) => setChatbotRuleKeyword(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="crm-group">
            <label className="crm-label">Match Type</label>
            <select
              className="crm-select"
              style={{ width: '100%', height: '38px', padding: '6px 12px' }}
              value={chatbotRuleMatchType}
              onChange={(e) => setChatbotRuleMatchType(e.target.value)}
              required
            >
              <option value="contains">Contains (matches if word is anywhere in text)</option>
              <option value="exact">Exact (matches if text matches keyword exactly)</option>
            </select>
          </div>

          <div className="crm-group">
            <label className="crm-label">Automated Reply Text</label>
            <textarea
              className="modal-input"
              style={{ height: '100px', resize: 'none', padding: '8px 12px' }}
              placeholder="e.g. Our catalog price lists start from $10. Visit [Link] for more info!"
              value={chatbotRuleReply}
              onChange={(e) => setChatbotRuleReply(e.target.value)}
              required
            />
          </div>

          <div className="modal-buttons" style={{ marginTop: '8px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setShowAddRuleModal(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Save Rule
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
