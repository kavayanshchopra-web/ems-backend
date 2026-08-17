import React from 'react';
import { Plus, Trash2, Bot } from 'lucide-react';

export default function ChatbotPage({
  chatbotRules = [],
  setChatbotRuleError,
  setChatbotRuleKeyword,
  setChatbotRuleReply,
  setChatbotRuleMatchType,
  setShowAddRuleModal,
  handleToggleRule,
  handleDeleteRule
}) {
  return (
    <div className="chatbot-rules-view glass-panel" style={{ padding: '24px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '20px', minHeight: '80vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: '700' }}>Chatbot Auto-Response Rules</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Define keywords and automated replies. When an incoming message matches, the bot will automatically reply.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => {
          if (setChatbotRuleError) setChatbotRuleError('');
          if (setChatbotRuleKeyword) setChatbotRuleKeyword('');
          if (setChatbotRuleReply) setChatbotRuleReply('');
          if (setChatbotRuleMatchType) setChatbotRuleMatchType('contains');
          if (setShowAddRuleModal) setShowAddRuleModal(true);
        }}>
          <Plus size={16} /> Add New Rule
        </button>
      </div>

      <div className="chatbot-rules-list" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px', marginTop: '10px' }}>
        {(chatbotRules || []).map(rule => (
          <div key={rule.id} className="chatbot-rule-card" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', position: 'relative' }}>
            <div style={{ position: 'absolute', top: '16px', right: '16px', display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={rule.is_active === 1}
                onChange={(e) => handleToggleRule && handleToggleRule(rule.id, e.target.checked)}
                style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                title={rule.is_active ? 'Disable Rule' : 'Enable Rule'}
              />
              <button
                onClick={() => handleDeleteRule && handleDeleteRule(rule.id)}
                style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0 4px', display: 'flex', alignItems: 'center' }}
                title="Delete Rule"
              >
                <Trash2 size={14} />
              </button>
            </div>

            <div style={{ paddingRight: '40px' }}>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <span className="badge badge-indigo" style={{ textTransform: 'uppercase', fontSize: '10px', padding: '2px 6px', borderRadius: '4px' }}>
                  {rule.match_type}
                </span>
                <span style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-main)' }}>
                  "{rule.keyword}"
                </span>
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '12px', whiteSpace: 'pre-wrap' }}>
                <strong>Reply:</strong> {rule.reply_text}
              </div>
            </div>
          </div>
        ))}

        {(!chatbotRules || chatbotRules.length === 0) && (
          <div style={{ gridColumn: '1 / -1', padding: '60px 20px', textAlign: 'center', border: '1px dashed rgba(255,255,255,0.05)', borderRadius: '10px', color: 'var(--text-dim)' }}>
            <Bot size={48} strokeWidth={1} style={{ marginBottom: '12px', color: 'var(--text-dim)', margin: '0 auto 12px auto' }} />
            <h3>No chatbot rules configured yet</h3>
            <p style={{ fontSize: '13px', marginTop: '6px' }}>Create your first auto-response keyword matching rule above.</p>
          </div>
        )}
      </div>
    </div>
  );
}
