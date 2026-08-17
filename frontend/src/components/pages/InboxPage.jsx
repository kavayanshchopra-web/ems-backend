import React from 'react';
import {
  Search, Plus, Tag, Send, RefreshCw, MessageSquare,
  Trash2, Clock, Play
} from 'lucide-react';

export default function InboxPage({
  activeContact,
  setActiveContact,
  searchQuery,
  setSearchQuery,
  setNewChatError,
  sessions,
  setNewChatSessionId,
  setShowNewChatModal,
  chatTypeFilter,
  setChatTypeFilter,
  crmStageFilter,
  setCrmStageFilter,
  contacts,
  filteredContacts,
  messages,
  inputText,
  setInputText,
  isUploadingMedia,
  t,
  handleSendMessage,
  handleMediaUpload,
  crmRightTab,
  setCrmRightTab,
  crmCustomName,
  setCrmCustomName,
  crmEmail,
  setCrmEmail,
  crmStage,
  setCrmStage,
  crmLabels,
  newLabelText,
  setNewLabelText,
  handleAddLabel,
  handleRemoveLabel,
  getLabelStyles,
  crmNotes,
  setCrmNotes,
  handleSaveCRM,
  quickReplies,
  handleDeleteQuickReply,
  handleAddQuickReply,
  newReplyTitle,
  setNewReplyTitle,
  newReplyText,
  setNewReplyText,
  scheduledMessages,
  setScheduleMessageText,
  setScheduleDateTime,
  setShowScheduleModal,
  handleCancelScheduled,
  starredMessages,
  callLogs,
  hasMoreMessages = false,
  isLoadingMore = false,
  onLoadMoreMessages = () => {}
}) {
  return (
    <div className={`inbox-view ${activeContact ? 'has-active-chat' : 'no-active-chat'}`}>
      {/* Contact Chat List */}
      <div className="chat-list-panel glass-panel">
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '13px', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search chats or phone..."
              className="chat-search"
              style={{ paddingLeft: '32px', width: '100%' }}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button
            className="btn btn-primary"
            onClick={() => {
              setNewChatError('');
              const connected = (sessions || []).find(s => s.status === 'connected');
              if (connected) {
                setNewChatSessionId(connected.id);
              }
              setShowNewChatModal(true);
            }}
            style={{ padding: '0', width: '38px', height: '38px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
            title="Start New Chat"
          >
            <Plus size={20} />
          </button>
        </div>

        {/* Chat type filter tabs */}
        <div className="chat-filters-row" style={{ display: 'flex', gap: '4px', margin: '8px 0 6px 0', padding: '0 4px', flexWrap: 'wrap' }}>
          <button
            className={`btn-filter ${chatTypeFilter === 'all' ? 'active' : ''}`}
            onClick={() => setChatTypeFilter('all')}
            style={{ flex: '1 1 auto', padding: '6px 8px', fontSize: '10px', borderRadius: '6px', border: '1px solid var(--border-glass)', background: chatTypeFilter === 'all' ? 'rgba(99, 102, 241, 0.15)' : 'transparent', color: chatTypeFilter === 'all' ? 'var(--color-primary)' : 'var(--text-muted)', cursor: 'pointer' }}
          >
            All
          </button>
          <button
            className={`btn-filter ${chatTypeFilter === 'dm' ? 'active' : ''}`}
            onClick={() => setChatTypeFilter('dm')}
            style={{ flex: '1 1 auto', padding: '6px 8px', fontSize: '10px', borderRadius: '6px', border: '1px solid var(--border-glass)', background: chatTypeFilter === 'dm' ? 'rgba(99, 102, 241, 0.15)' : 'transparent', color: chatTypeFilter === 'dm' ? 'var(--color-primary)' : 'var(--text-muted)', cursor: 'pointer' }}
          >
            DMs
          </button>
          <button
            className={`btn-filter ${chatTypeFilter === 'group' ? 'active' : ''}`}
            onClick={() => setChatTypeFilter('group')}
            style={{ flex: '1 1 auto', padding: '6px 8px', fontSize: '10px', borderRadius: '6px', border: '1px solid var(--border-glass)', background: chatTypeFilter === 'group' ? 'rgba(99, 102, 241, 0.15)' : 'transparent', color: chatTypeFilter === 'group' ? 'var(--color-primary)' : 'var(--text-muted)', cursor: 'pointer' }}
          >
            Groups
          </button>
          <button
            className={`btn-filter ${chatTypeFilter === 'unread' ? 'active' : ''}`}
            onClick={() => setChatTypeFilter('unread')}
            style={{ flex: '1 1 auto', padding: '6px 8px', fontSize: '10px', borderRadius: '6px', border: '1px solid var(--border-glass)', background: chatTypeFilter === 'unread' ? 'rgba(99, 102, 241, 0.15)' : 'transparent', color: chatTypeFilter === 'unread' ? 'var(--color-primary)' : 'var(--text-muted)', cursor: 'pointer' }}
          >
            Unread
          </button>
          <button
            className={`btn-filter ${chatTypeFilter === 'archived' ? 'active' : ''}`}
            onClick={() => setChatTypeFilter('archived')}
            style={{ flex: '1 1 auto', padding: '6px 8px', fontSize: '10px', borderRadius: '6px', border: '1px solid var(--border-glass)', background: chatTypeFilter === 'archived' ? 'rgba(99, 102, 241, 0.15)' : 'transparent', color: chatTypeFilter === 'archived' ? 'var(--color-primary)' : 'var(--text-muted)', cursor: 'pointer' }}
          >
            Archived
          </button>
        </div>

        {/* CRM Stage Quick Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', padding: '0 4px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Stage:</span>
          <select
            className="crm-select"
            style={{ flex: 1, padding: '4px 8px', fontSize: '11px', height: '28px' }}
            value={crmStageFilter}
            onChange={(e) => setCrmStageFilter(e.target.value)}
          >
            <option value="all">All Stages</option>
            <option value="new">New Lead</option>
            <option value="contacted">Contacted</option>
            <option value="interested">Interested</option>
            <option value="proposal">Proposal Sent</option>
            <option value="won">Closed Won</option>
          </select>
        </div>

        <div className="chat-items-list" style={{ overflowY: 'auto', flex: 1 }}>
          {(filteredContacts || []).map((contact) => (
            <div
              key={contact.id}
              className={`chat-item ${activeContact?.id === contact.id ? 'active' : ''}`}
              onClick={() => setActiveContact(contact)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 12px',
                borderRadius: '8px',
                cursor: 'pointer',
                marginBottom: '4px',
                background: activeContact?.id === contact.id ? 'rgba(99, 102, 241, 0.12)' : 'transparent',
                transition: 'background 0.2s ease'
              }}
            >
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'var(--color-primary)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '700',
                fontSize: '14px',
                flexShrink: 0
              }}>
                {(contact.name || contact.phone || 'C')[0].toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: '600', fontSize: '13px', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {contact.name || contact.phone}
                  </div>
                  {contact.lastMessageTime && (
                    <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>
                      {new Date(contact.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '2px' }}>
                  {contact.lastMessage || contact.phone}
                </div>
              </div>
            </div>
          ))}
          {(!filteredContacts || filteredContacts.length === 0) && (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '12px' }}>
              No chats found.
            </div>
          )}
        </div>
      </div>

      {/* Center Main Chat Panel */}
      <div className="chat-main-panel glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {activeContact ? (
          <>
            {/* Active Chat Header */}
            <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  className="btn btn-secondary mobile-back-btn"
                  onClick={() => setActiveContact(null)}
                  style={{ padding: '4px 8px', fontSize: '12px' }}
                >
                  ← Back
                </button>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--color-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '13px' }}>
                  {(activeContact.name || activeContact.phone || 'C')[0].toUpperCase()}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '14px', color: 'var(--text-main)' }}>{activeContact.name || activeContact.phone}</h3>
                  <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>{activeContact.phone}</span>
                </div>
              </div>
            </div>

            {/* Chat Messages Log */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* On-Demand Lazy Loading Button (Conserves RAM & Speed) */}
              {hasMoreMessages && (
                <div style={{ display: 'flex', justifyContent: 'center', margin: '4px 0 10px 0' }}>
                  <button
                    type="button"
                    onClick={() => onLoadMoreMessages && onLoadMoreMessages()}
                    disabled={isLoadingMore}
                    style={{
                      background: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: 'var(--text-main, #ffffff)',
                      padding: '6px 14px',
                      borderRadius: '20px',
                      fontSize: '11px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.2s ease',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
                    }}
                  >
                    {isLoadingMore ? (
                      <>
                        <RefreshCw size={12} className="spin animate-spin" /> Loading previous messages...
                      </>
                    ) : (
                      <>
                        <span>⬆ Load Older Messages (50 more)</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {(messages || []).map((msg) => {
                const isOut = msg.fromMe || msg.from_me === 1;
                return (
                  <div
                    key={msg.id}
                    style={{
                      alignSelf: isOut ? 'flex-end' : 'flex-start',
                      maxWidth: '70%',
                      background: isOut ? 'var(--color-primary)' : 'rgba(255,255,255,0.08)',
                      color: isOut ? 'white' : 'var(--text-main)',
                      padding: '10px 14px',
                      borderRadius: '12px',
                      fontSize: '13px',
                      lineHeight: '1.4'
                    }}
                  >
                    <div>{msg.text_content || msg.text || msg.body}</div>
                    <div style={{ fontSize: '10px', opacity: 0.7, textAlign: 'right', marginTop: '4px' }}>
                      {msg.timestamp ? new Date(msg.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Chat Input Bar */}
            <form onSubmit={handleSendMessage} style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: '10px', alignItems: 'center' }}>
              <input
                type="text"
                className="crm-input"
                placeholder="Type a message..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                style={{ flex: 1, padding: '10px 14px' }}
              />
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isUploadingMedia || !inputText.trim()}
                style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                {isUploadingMedia ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" /> Sending...
                  </>
                ) : (
                  <>
                    <Send size={16} /> Send
                  </>
                )}
              </button>
            </form>
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexGrow: 1, color: 'var(--text-dim)', gap: '12px' }}>
            <MessageSquare size={48} strokeWidth={1} />
            <p>Select a chat from the inbox list to start replying</p>
          </div>
        )}
      </div>

      {/* Right CRM Details Panel */}
      {activeContact && (
        <div className="crm-detail-panel glass-panel" style={{ width: '300px', display: 'flex', flexDirection: 'column' }}>
          {/* Right Sidebar Tab Switches */}
          <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.05)', marginBottom: '16px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setCrmRightTab('info')}
              style={{ flex: '1 1 auto', padding: '8px', fontSize: '11px', border: 'none', background: 'transparent', color: crmRightTab === 'info' ? 'var(--color-primary)' : 'var(--text-dim)', borderBottom: crmRightTab === 'info' ? '2px solid var(--color-primary)' : 'none', cursor: 'pointer', fontWeight: crmRightTab === 'info' ? '600' : '400' }}
            >
              Info
            </button>
            <button
              onClick={() => setCrmRightTab('templates')}
              style={{ flex: '1 1 auto', padding: '8px', fontSize: '11px', border: 'none', background: 'transparent', color: crmRightTab === 'templates' ? 'var(--color-primary)' : 'var(--text-dim)', borderBottom: crmRightTab === 'templates' ? '2px solid var(--color-primary)' : 'none', cursor: 'pointer', fontWeight: crmRightTab === 'templates' ? '600' : '400' }}
            >
              Replies
            </button>
            <button
              onClick={() => setCrmRightTab('scheduled')}
              style={{ flex: '1 1 auto', padding: '8px', fontSize: '11px', border: 'none', background: 'transparent', color: crmRightTab === 'scheduled' ? 'var(--color-primary)' : 'var(--text-dim)', borderBottom: crmRightTab === 'scheduled' ? '2px solid var(--color-primary)' : 'none', cursor: 'pointer', fontWeight: crmRightTab === 'scheduled' ? '600' : '400' }}
            >
              Scheduled ({(scheduledMessages || []).length})
            </button>
            <button
              onClick={() => setCrmRightTab('starred')}
              style={{ flex: '1 1 auto', padding: '8px', fontSize: '11px', border: 'none', background: 'transparent', color: crmRightTab === 'starred' ? 'var(--color-primary)' : 'var(--text-dim)', borderBottom: crmRightTab === 'starred' ? '2px solid var(--color-primary)' : 'none', cursor: 'pointer', fontWeight: crmRightTab === 'starred' ? '600' : '400' }}
            >
              Starred ({(starredMessages || []).length})
            </button>
            <button
              onClick={() => setCrmRightTab('calls')}
              style={{ flex: '1 1 auto', padding: '8px', fontSize: '11px', border: 'none', background: 'transparent', color: crmRightTab === 'calls' ? '#0d9488' : 'var(--text-dim)', borderBottom: crmRightTab === 'calls' ? '2px solid #0d9488' : 'none', cursor: 'pointer', fontWeight: crmRightTab === 'calls' ? '700' : '400' }}
            >
              📞 Calls
            </button>
          </div>

          {crmRightTab === 'info' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto', flexGrow: 1 }}>
              <div className="crm-group">
                <label className="crm-label">WhatsApp Name</label>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', background: 'rgba(0,0,0,0.1)', padding: '8px 12px', borderRadius: '8px' }}>
                  {activeContact.name || 'Not Available'}
                </div>
              </div>

              <div className="crm-group">
                <label className="crm-label">CRM Custom Name</label>
                <input
                  type="text"
                  className="crm-input"
                  placeholder="Enter custom name"
                  value={crmCustomName}
                  onChange={(e) => setCrmCustomName(e.target.value)}
                />
              </div>

              <div className="crm-group">
                <label className="crm-label">Email Address</label>
                <input
                  type="email"
                  className="crm-input"
                  placeholder="example@mail.com"
                  value={crmEmail}
                  onChange={(e) => setCrmEmail(e.target.value)}
                />
              </div>

              <div className="crm-group">
                <label className="crm-label">Pipeline Stage</label>
                <select
                  className="crm-select"
                  value={crmStage}
                  onChange={(e) => setCrmStage(e.target.value)}
                >
                  <option value="new">New Lead</option>
                  <option value="contacted">Contacted</option>
                  <option value="interested">Interested</option>
                  <option value="proposal">Proposal Sent</option>
                  <option value="won">Closed Won</option>
                </select>
              </div>

              <div className="crm-group">
                <label className="crm-label">Labels / Tags</label>
                <form onSubmit={handleAddLabel} style={{ display: 'flex', gap: '6px' }}>
                  <input
                    type="text"
                    placeholder="Add tag"
                    className="crm-input"
                    value={newLabelText}
                    onChange={(e) => setNewLabelText(e.target.value)}
                  />
                  <button type="submit" className="btn btn-secondary" style={{ padding: '6px 10px' }}>
                    Add
                  </button>
                </form>
                <div className="crm-tags-list">
                  {(crmLabels || []).map((tag, index) => {
                    const tagStyle = getLabelStyles ? getLabelStyles(tag) : { background: '#f1f5f9', color: '#334155' };
                    return (
                      <span key={index} className="crm-tag-item" style={{ background: tagStyle.background, color: tagStyle.color, border: tagStyle.border }}>
                        <Tag size={10} style={{ color: tagStyle.color }} />
                        <span>{tag}</span>
                        <span className="crm-tag-remove" style={{ color: tagStyle.color }} onClick={() => handleRemoveLabel(tag)}>×</span>
                      </span>
                    );
                  })}
                </div>
              </div>

              <div className="crm-group">
                <label className="crm-label">Interaction Notes</label>
                <textarea
                  className="crm-textarea"
                  placeholder="Add details, context, next follow-up dates..."
                  value={crmNotes}
                  onChange={(e) => setCrmNotes(e.target.value)}
                />
              </div>

              <button
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '10px', marginBottom: '10px' }}
                onClick={handleSaveCRM}
              >
                Save CRM Details
              </button>
            </div>
          )}

          {crmRightTab === 'templates' && (
            <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, overflow: 'hidden' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', flexGrow: 1, marginBottom: '12px', paddingRight: '4px' }}>
                {(quickReplies || []).map(reply => (
                  <div
                    key={reply.id}
                    onClick={() => setInputText(reply.text)}
                    style={{ padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer', position: 'relative', transition: 'border-color 0.2s' }}
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.4)'}
                    onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'}
                  >
                    <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '4px' }}>{reply.title}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: '1.4' }}>{reply.text}</div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteQuickReply(reply.id); }}
                      style={{ position: 'absolute', right: '8px', top: '8px', background: 'transparent', border: 'none', color: 'var(--color-red)', fontSize: '14px', cursor: 'pointer', padding: '2px' }}
                    >
                      ×
                    </button>
                  </div>
                ))}
                {(!quickReplies || quickReplies.length === 0) && (
                  <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '12px' }}>
                    No templates saved. Add one below!
                  </div>
                )}
              </div>

              <form onSubmit={handleAddQuickReply} style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-main)' }}>Add Template</div>
                <input
                  type="text"
                  placeholder="Template Title"
                  className="crm-input"
                  style={{ fontSize: '11px', padding: '6px' }}
                  value={newReplyTitle}
                  onChange={(e) => setNewReplyTitle(e.target.value)}
                />
                <textarea
                  placeholder="Template message text..."
                  className="crm-textarea"
                  style={{ fontSize: '11px', padding: '6px', height: '60px', minHeight: '60px', resize: 'vertical' }}
                  value={newReplyText}
                  onChange={(e) => setNewReplyText(e.target.value)}
                />
                <button type="submit" className="btn btn-primary" style={{ padding: '6px', fontSize: '11px', width: '100%', marginBottom: '10px' }}>
                  Add Template
                </button>
              </form>
            </div>
          )}

          {crmRightTab === 'scheduled' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto', flexGrow: 1, maxHeight: '60vh' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ fontSize: '13px', fontWeight: '700' }}>Scheduled Follow-ups</h4>
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    setScheduleMessageText('');
                    setScheduleDateTime('');
                    setShowScheduleModal(true);
                  }}
                  style={{ fontSize: '10px', padding: '4px 8px' }}
                >
                  <Plus size={10} /> Schedule
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }}>
                {(scheduledMessages || []).map(msg => {
                  const sendDate = new Date(msg.send_at * 1000);
                  const isFailed = msg.status === 'failed';
                  const isSent = msg.status === 'sent';

                  return (
                    <div
                      key={msg.id}
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        borderRadius: '8px',
                        padding: '10px',
                        position: 'relative'
                      }}
                    >
                      {!isSent && (
                        <button
                          onClick={() => handleCancelScheduled(msg.id)}
                          style={{
                            position: 'absolute',
                            top: '8px',
                            right: '8px',
                            background: 'none',
                            border: 'none',
                            color: '#ef4444',
                            cursor: 'pointer'
                          }}
                          title="Cancel Scheduled Message"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', fontSize: '11px', color: 'var(--text-dim)' }}>
                        <Clock size={12} />
                        <span>{sendDate.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                        <span
                          className={`badge`}
                          style={{
                            marginLeft: 'auto',
                            fontSize: '9px',
                            padding: '1px 4px',
                            background: isSent ? 'rgba(16, 185, 129, 0.15)' : (isFailed ? 'rgba(239, 68, 68, 0.15)' : 'rgba(234, 179, 8, 0.15)'),
                            color: isSent ? '#34d399' : (isFailed ? '#f87171' : '#facc15')
                          }}
                        >
                          {msg.status}
                        </span>
                      </div>
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px', whiteSpace: 'pre-wrap', paddingRight: '20px' }}>
                        {msg.message_text}
                      </p>
                      {isFailed && msg.error_message && (
                        <p style={{ fontSize: '10px', color: '#f87171', marginTop: '4px', fontStyle: 'italic' }}>
                          Error: {msg.error_message}
                        </p>
                      )}
                    </div>
                  );
                })}

                {(!scheduledMessages || scheduledMessages.length === 0) && (
                  <div style={{ padding: '30px 10px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '12px' }}>
                    No messages scheduled for this lead.
                  </div>
                )}
              </div>
            </div>
          )}

          {crmRightTab === 'starred' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto', flexGrow: 1, maxHeight: '60vh' }}>
              <h4 style={{ fontSize: '13px', fontWeight: '700' }}>Starred Messages</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {(starredMessages || []).map(msg => {
                  const dateStr = new Date(msg.timestamp * 1000).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
                  const isOutgoing = msg.from_me === 1 || msg.fromMe === true;

                  return (
                    <div
                      key={msg.id}
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        borderRadius: '8px',
                        padding: '10px',
                        cursor: 'pointer'
                      }}
                      title="Click to view message details"
                      onClick={() => alert(`Starred Message:\n\n${msg.text_content || '[Media Message]'}`)}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-dim)', marginBottom: '6px' }}>
                        <span>{isOutgoing ? 'Sent (You)' : 'Received'}</span>
                        <span>{dateStr}</span>
                      </div>
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'pre-wrap' }}>
                        {msg.text_content || `[Starred ${msg.media_type || 'Media'}]`}
                      </p>
                    </div>
                  );
                })}

                {(!starredMessages || starredMessages.length === 0) && (
                  <div style={{ padding: '30px 10px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '12px' }}>
                    No starred messages in this chat.
                  </div>
                )}
              </div>
            </div>
          )}

          {crmRightTab === 'calls' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', flexGrow: 1, maxHeight: '60vh' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ fontSize: '13px', fontWeight: '700', margin: 0, color: 'var(--text-main)' }}>📞 Customer Call History</h4>
                <span className="badge-info" style={{ fontSize: '10px', fontWeight: 'bold', background: 'rgba(13, 148, 136, 0.15)', color: '#0d9488', padding: '2px 8px', borderRadius: '12px' }}>
                  {(callLogs || []).filter(c => c.customerPhone === activeContact?.phone || c.customerName === activeContact?.name || true).length} Calls Recorded
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {(callLogs || []).map(log => (
                  <div
                    key={log.id}
                    style={{
                      background: 'linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '10px',
                      padding: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '10px', fontWeight: '700', padding: '2px 8px', borderRadius: '12px', background: log.channel === 'WhatsApp' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(99, 102, 241, 0.15)', color: log.channel === 'WhatsApp' ? '#34d399' : '#818cf8' }}>
                        {log.channel === 'WhatsApp' ? '🟢 WhatsApp Voice' : '📱 Mobile SIM Call'}
                      </span>
                      <span style={{ fontSize: '10px', color: 'var(--text-dim)' }}>
                        {new Date(log.timestamp * 1000).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px' }}>
                      <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>
                        Agent: {log.agentName}
                      </span>
                      <span style={{ color: '#0d9488', fontWeight: '700' }}>
                        ⏱️ {log.duration}
                      </span>
                    </div>

                    {log.recordingUrl ? (
                      <div style={{ background: 'rgba(13, 148, 136, 0.12)', border: '1px solid rgba(13, 148, 136, 0.25)', padding: '8px 10px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <button
                          onClick={() => alert(`Playing Audio Recording for ${log.customerName}...`)}
                          style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#0d9488', border: 'none', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 6px rgba(13, 148, 136, 0.3)' }}
                        >
                          <Play size={14} style={{ marginLeft: '1px' }} />
                        </button>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '11px', fontWeight: '700', color: '#0d9488' }}>🎙️ Play Call Audio</div>
                          <div style={{ fontSize: '9px', color: 'var(--text-dim)' }}>Firebase Audio Stream</div>
                        </div>
                      </div>
                    ) : (
                      <div style={{ fontSize: '10px', color: '#94a3b8', fontStyle: 'italic' }}>No Audio (Missed/Rejected)</div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '6px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                      <span style={{ fontSize: '10px', fontWeight: '700', color: log.disposition === 'Interested' || log.disposition === 'Deal Closed' ? '#10b981' : '#f59e0b', background: log.disposition === 'Interested' || log.disposition === 'Deal Closed' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)', padding: '2px 8px', borderRadius: '6px' }}>
                        {log.disposition}
                      </span>
                      <span style={{ fontSize: '10px', color: 'var(--text-dim)', fontStyle: 'italic', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {log.notes}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
