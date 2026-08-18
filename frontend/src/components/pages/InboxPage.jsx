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
  const [selectedStaffSession, setSelectedStaffSession] = React.useState('all');

  return (
    <div className={`inbox-view ${activeContact ? 'has-active-chat' : 'no-active-chat'}`}>
      {/* Contact Chat List */}
      <div className="chat-list-panel glass-panel">
        {/* StaffPeek-Style Multi-Staff Accounts Switcher */}
        {sessions && sessions.length > 0 && (
          <div style={{ marginBottom: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', padding: '8px', border: '1px solid var(--border-glass)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              <span>STAFF ACCOUNTS ({sessions.length})</span>
              <span style={{ fontSize: '10px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }}></span> Live Monitoring
              </span>
            </div>
            <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
              <button
                onClick={() => setSelectedStaffSession('all')}
                style={{
                  padding: '4px 10px',
                  borderRadius: '20px',
                  fontSize: '11px',
                  fontWeight: 600,
                  background: selectedStaffSession === 'all' ? 'linear-gradient(135deg, #0d9488, #00a884)' : 'rgba(255,255,255,0.06)',
                  color: selectedStaffSession === 'all' ? '#fff' : 'var(--text-muted)',
                  border: selectedStaffSession === 'all' ? '1px solid #14d2cb' : '1px solid var(--border-glass)',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                🌐 All Staff
              </button>
              {sessions.map((s, idx) => (
                <button
                  key={s.id || idx}
                  onClick={() => setSelectedStaffSession(s.id)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '20px',
                    fontSize: '11px',
                    fontWeight: 600,
                    background: selectedStaffSession === s.id ? 'linear-gradient(135deg, #0d9488, #00a884)' : 'rgba(255,255,255,0.06)',
                    color: selectedStaffSession === s.id ? '#fff' : 'var(--text-muted)',
                    border: selectedStaffSession === s.id ? '1px solid #14d2cb' : '1px solid var(--border-glass)',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                >
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: s.status === 'connected' ? '#10b981' : '#f59e0b' }}></span>
                  {s.name || s.phone_number || `Staff ${idx + 1}`}
                </button>
              ))}
            </div>
          </div>
        )}

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
          {(
            (filteredContacts || contacts || []).filter((contact) => {
              if (!contact) return false;
              if (selectedStaffSession !== 'all') {
                const cSess = contact.session_id || contact.sessionId;
                if (cSess && cSess !== selectedStaffSession) return false;
              }
              if (!searchQuery || !searchQuery.trim()) return true;
              const q = searchQuery.toLowerCase().trim();
              const cleanQ = q.replace(/[^0-9]/g, '');
              const name = (contact.name || '').toLowerCase();
              const customName = (contact.custom_name || '').toLowerCase();
              const phone = (contact.phone || contact.id || '').toLowerCase();
              const cleanPhone = phone.replace(/[^0-9]/g, '');
              const lastMsg = (contact.lastMessage || contact.last_message || '').toLowerCase();
              return (
                name.includes(q) ||
                customName.includes(q) ||
                lastMsg.includes(q) ||
                phone.includes(q) ||
                (cleanQ && cleanPhone.includes(cleanQ))
              );
            })
          ).map((contact) => {
            const avatarUrl = contact.profile_picture_url || contact.profilePic || contact.avatar;
            const isGroup = contact.id?.endsWith('@g.us');
            return (
              <div
                key={contact.id}
                className={`chat-item ${activeContact?.id === contact.id ? 'active' : ''}`}
                onClick={() => setActiveContact(contact)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  marginBottom: '4px',
                  background: activeContact?.id === contact.id ? 'rgba(13, 148, 136, 0.18)' : 'transparent',
                  border: activeContact?.id === contact.id ? '1px solid rgba(13, 148, 136, 0.3)' : '1px solid transparent',
                  transition: 'all 0.15s ease'
                }}
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={contact.name || 'avatar'}
                    style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                ) : (
                  <div style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    background: isGroup ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'linear-gradient(135deg, #0d9488, #059669)',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '700',
                    fontSize: '15px',
                    flexShrink: 0
                  }}>
                    {(contact.name || contact.phone || 'C')[0].toUpperCase()}
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontWeight: '600', fontSize: '13px', color: 'var(--text-main, #ffffff)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {contact.name || contact.phone}
                    </div>
                    {contact.lastMessageTime && (
                      <div style={{ fontSize: '10px', color: 'var(--text-dim, #94a3b8)' }}>
                        {new Date(contact.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted, #94a3b8)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '2px' }}>
                    {contact.lastMessage || contact.phone}
                  </div>
                </div>
              </div>
            );
          })}
          {(!contacts || contacts.length === 0) && (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '12px' }}>
              No chats found.
            </div>
          )}
        </div>
      </div>

      {/* Center Main Chat Panel */}
      <div
        className="chat-main-panel glass-panel"
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#0b141a',
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.035) 1px, transparent 0)',
          backgroundSize: '24px 24px',
          overflow: 'hidden'
        }}
      >
        {activeContact ? (
          <>
            {/* Active Chat Header (WhatsApp Style) */}
            <div style={{
              padding: '10px 16px',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              backgroundColor: '#111b21',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button
                  className="btn btn-secondary mobile-back-btn"
                  onClick={() => setActiveContact(null)}
                  style={{ padding: '4px 8px', fontSize: '12px' }}
                >
                  ← Back
                </button>
                {activeContact.profile_picture_url || activeContact.profilePic || activeContact.avatar ? (
                  <img
                    src={activeContact.profile_picture_url || activeContact.profilePic || activeContact.avatar}
                    alt={activeContact.name || 'avatar'}
                    style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                ) : (
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: activeContact.id?.endsWith('@g.us') ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'linear-gradient(135deg, #0d9488, #059669)',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '700',
                    fontSize: '14px',
                    flexShrink: 0
                  }}>
                    {(activeContact.name || activeContact.phone || 'C')[0].toUpperCase()}
                  </div>
                )}
                <div>
                  <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#e9edef' }}>
                    {activeContact.name || activeContact.phone}
                  </h3>
                  <span style={{ fontSize: '11px', color: '#8696a0' }}>
                    {(() => {
                      const raw = (activeContact.phone || activeContact.id || '').replace('@s.whatsapp.net', '').replace('@g.us', '');
                      return raw.startsWith('+') ? raw : (raw ? `+${raw}` : '');
                    })()}
                  </span>
                </div>
              </div>

              {/* Action Buttons for Calling & Native WhatsApp Web */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => {
                    const raw = (activeContact.phone || activeContact.id || '').replace(/[^0-9]/g, '');
                    if (raw) window.open(`https://web.whatsapp.com/send?phone=${raw}`, '_blank');
                  }}
                  style={{
                    background: 'rgba(13, 148, 136, 0.15)',
                    border: '1px solid #0d9488',
                    color: '#14d2cb',
                    borderRadius: '8px',
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                  title="Open this conversation in native WhatsApp Web tab with OmniFlow Extension Dock"
                >
                  <span>🚀</span> Open in WhatsApp Web
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const raw = (activeContact.phone || activeContact.id || '').replace(/[^0-9]/g, '');
                    if (raw) window.open(`https://web.whatsapp.com/send?phone=${raw}`, '_blank');
                  }}
                  style={{
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid var(--border-glass)',
                    color: '#00a884',
                    borderRadius: '8px',
                    padding: '6px 10px',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                  title="Native Voice Call via WhatsApp"
                >
                  📞 Call
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const raw = (activeContact.phone || activeContact.id || '').replace(/[^0-9]/g, '');
                    if (raw) window.open(`https://web.whatsapp.com/send?phone=${raw}`, '_blank');
                  }}
                  style={{
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid var(--border-glass)',
                    color: '#0ea5e9',
                    borderRadius: '8px',
                    padding: '6px 10px',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                  title="Native Video Call via WhatsApp"
                >
                  📹 Video
                </button>
              </div>
            </div>

            {/* Chat Messages Log (WhatsApp Style) */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {/* On-Demand Lazy Loading Button */}
              {hasMoreMessages && (
                <div style={{ display: 'flex', justifyContent: 'center', margin: '4px 0 10px 0' }}>
                  <button
                    type="button"
                    onClick={() => onLoadMoreMessages && onLoadMoreMessages()}
                    disabled={isLoadingMore}
                    style={{
                      background: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: '#e9edef',
                      padding: '6px 14px',
                      borderRadius: '20px',
                      fontSize: '11px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
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

              {(() => {
                let lastDateStr = null;
                const isGroup = activeContact?.id?.endsWith('@g.us');

                return (messages || []).map((msg) => {
                  const isOut = Boolean(
                    msg.fromMe === true ||
                    msg.fromMe === 1 ||
                    msg.from_me === 1 ||
                    msg.from_me === true ||
                    msg.direction === 'outbound' ||
                    msg.is_outbound === 1
                  );

                  const msgDate = msg.timestamp
                    ? new Date(typeof msg.timestamp === 'number' && msg.timestamp < 10000000000 ? msg.timestamp * 1000 : msg.timestamp)
                    : new Date();
                  
                  const timeString = isNaN(msgDate.getTime())
                    ? ''
                    : msgDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                  // WhatsApp Date Divider
                  let showDateDivider = false;
                  let dividerText = '';
                  if (!isNaN(msgDate.getTime())) {
                    const dateKey = msgDate.toDateString();
                    if (dateKey !== lastDateStr) {
                      showDateDivider = true;
                      lastDateStr = dateKey;
                      const today = new Date().toDateString();
                      const yesterday = new Date(Date.now() - 86400000).toDateString();
                      if (dateKey === today) dividerText = 'Today';
                      else if (dateKey === yesterday) dividerText = 'Yesterday';
                      else dividerText = msgDate.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' });
                    }
                  }

                  const rawText = msg.text_content || msg.textContent || msg.text || msg.body || msg.message_text || msg.message || msg.content || '';
                  const mediaUrl = msg.media_url || msg.mediaUrl;
                  const mediaType = msg.media_type || msg.mediaType || 'text';

                  let displayText = rawText;
                  if (mediaUrl && (displayText === '[Sent image]' || displayText === '[Sent document]' || displayText === '[Sent video]' || displayText === '[Sent audio]')) {
                    displayText = '';
                  }

                  if (!displayText && !mediaUrl && mediaType === 'text') {
                    return null;
                  }

                  return (
                    <React.Fragment key={msg.id || Math.random()}>
                      {/* Date Divider Badge */}
                      {showDateDivider && (
                        <div style={{ display: 'flex', justifyContent: 'center', margin: '12px 0 6px 0' }}>
                          <div style={{
                            backgroundColor: '#182229',
                            color: '#8696a0',
                            fontSize: '11px',
                            fontWeight: '500',
                            padding: '4px 12px',
                            borderRadius: '8px',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                          }}>
                            {dividerText}
                          </div>
                        </div>
                      )}

                      {/* WhatsApp Chat Bubble */}
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: isOut ? 'flex-end' : 'flex-start',
                          width: '100%',
                          margin: '1px 0'
                        }}
                      >
                        <div
                          style={{
                            maxWidth: '75%',
                            minWidth: '90px',
                            backgroundColor: isOut ? '#005c4b' : '#202c33',
                            color: '#e9edef',
                            padding: '6px 9px 4px 9px',
                            borderRadius: isOut ? '8px 8px 0px 8px' : '8px 8px 8px 0px',
                            fontSize: '13.5px',
                            lineHeight: '1.4',
                            boxShadow: '0 1px 0.5px rgba(11,20,26,0.13)',
                            position: 'relative',
                            wordBreak: 'break-word'
                          }}
                        >
                          {/* Sender Name ONLY in Groups (Hidden in 1-on-1 DMs) */}
                          {!isOut && isGroup && (msg.sender_name || msg.contactName) && (
                            <div style={{ fontSize: '11.5px', fontWeight: '600', color: '#53bdeb', marginBottom: '2px' }}>
                              {msg.sender_name || msg.contactName}
                            </div>
                          )}

                          {/* Media Image */}
                          {mediaType === 'image' && mediaUrl && (
                            <div style={{ marginBottom: '4px', borderRadius: '6px', overflow: 'hidden' }}>
                              <img
                                src={mediaUrl}
                                alt="Attachment"
                                style={{ maxWidth: '100%', maxHeight: '280px', borderRadius: '6px', display: 'block', objectFit: 'contain' }}
                                onError={(e) => { e.target.style.display = 'none'; }}
                              />
                            </div>
                          )}

                          {/* Media Audio */}
                          {mediaType === 'audio' && mediaUrl && (
                            <div style={{ margin: '4px 0' }}>
                              <audio controls src={mediaUrl} style={{ maxWidth: '240px', height: '34px' }} />
                            </div>
                          )}

                          {/* Media Video */}
                          {mediaType === 'video' && mediaUrl && (
                            <div style={{ marginBottom: '4px', borderRadius: '6px', overflow: 'hidden' }}>
                              <video controls src={mediaUrl} style={{ maxWidth: '100%', maxHeight: '240px', borderRadius: '6px' }} />
                            </div>
                          )}

                          {/* Media Document */}
                          {mediaType === 'document' && mediaUrl && (
                            <a
                              href={mediaUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#53bdeb', textDecoration: 'underline', marginBottom: '4px', fontSize: '12px' }}
                            >
                              📄 Download Document
                            </a>
                          )}

                          {/* Message Text */}
                          {displayText ? (
                            <div style={{ whiteSpace: 'pre-wrap', color: '#e9edef' }}>
                              {displayText}
                            </div>
                          ) : null}

                          {/* Timestamp & Status Checkmark */}
                          <div style={{
                            display: 'flex',
                            justifyContent: 'flex-end',
                            alignItems: 'center',
                            gap: '4px',
                            marginTop: '2px',
                            fontSize: '10.5px',
                            color: '#8696a0',
                            float: 'right',
                            marginLeft: '12px'
                          }}>
                            <span>{timeString}</span>
                            {isOut && <span style={{ color: '#53bdeb', fontSize: '11px' }}>✓✓</span>}
                          </div>
                        </div>
                      </div>
                    </React.Fragment>
                  );
                });
              })()}
            </div>

            {/* Chat Input Bar (WhatsApp Web Style) */}
            <form
              onSubmit={handleSendMessage}
              style={{
                padding: '8px 16px',
                backgroundColor: '#111b21',
                borderTop: '1px solid rgba(255,255,255,0.08)',
                display: 'flex',
                gap: '10px',
                alignItems: 'center'
              }}
            >
              <input
                type="text"
                className="crm-input"
                placeholder="Type a message..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                style={{
                  flex: 1,
                  padding: '9px 16px',
                  backgroundColor: '#2a3942',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#e9edef',
                  fontSize: '13.5px'
                }}
              />
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isUploadingMedia || !inputText.trim()}
                style={{
                  padding: '9px 18px',
                  backgroundColor: '#00a884',
                  borderColor: '#00a884',
                  color: 'white',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '13px',
                  fontWeight: '600'
                }}
              >
                {isUploadingMedia ? (
                  <>
                    <RefreshCw size={15} className="animate-spin" /> Sending...
                  </>
                ) : (
                  <>
                    <Send size={15} /> Send
                  </>
                )}
              </button>
            </form>
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexGrow: 1, padding: '40px 20px', textAlign: 'center' }}>
            <div style={{
              maxWidth: '560px',
              width: '100%',
              background: 'rgba(17, 27, 33, 0.85)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(13, 148, 136, 0.3)',
              borderRadius: '16px',
              padding: '32px 28px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '20px'
            }}>
              {/* WhatsApp Web Icon with Glow */}
              <div style={{
                width: '68px',
                height: '68px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #0d9488, #00a884)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 25px rgba(0, 168, 132, 0.4)'
              }}>
                <MessageSquare size={34} color="#ffffff" />
              </div>

              <div>
                <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#e9edef', margin: '0 0 8px 0' }}>
                  Real WhatsApp Web & CRM Workspace
                </h2>
                <p style={{ fontSize: '13px', color: '#8696a0', lineHeight: 1.5, margin: 0 }}>
                  Zero server load • Native video & voice calling • 2-Way automated cloud CRM sync
                </p>
              </div>

              {/* Big Launch Button */}
              <button
                type="button"
                onClick={() => window.open('https://web.whatsapp.com', '_blank')}
                style={{
                  width: '100%',
                  padding: '14px 20px',
                  borderRadius: '12px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #0d9488 0%, #00a884 100%)',
                  color: '#ffffff',
                  fontSize: '15px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  boxShadow: '0 8px 20px rgba(0, 168, 132, 0.3)',
                  transition: 'all 0.2s ease'
                }}
              >
                <span>🚀</span> Launch Real WhatsApp Web with OmniFlow Dock
              </button>

              {/* 2-Step Quick Onboarding Checklist */}
              <div style={{
                width: '100%',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: '12px',
                padding: '14px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                textAlign: 'left'
              }}>
                <div style={{ fontSize: '11px', fontWeight: '700', color: '#14d2cb', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  ⚡ Quick 2-Step Staff Setup Guide
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12.5px', color: '#cbd5e1' }}>
                  <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'rgba(13, 148, 136, 0.25)', color: '#14d2cb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 'bold' }}>1</span>
                  <span><strong>Install Extension:</strong> Load <code>extension/</code> folder in <code>chrome://extensions</code></span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12.5px', color: '#cbd5e1' }}>
                  <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'rgba(0, 168, 132, 0.25)', color: '#00a884', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 'bold' }}>2</span>
                  <span><strong>Scan WhatsApp:</strong> Open <a href="https://web.whatsapp.com" target="_blank" rel="noreferrer" style={{ color: '#14d2cb', textDecoration: 'underline' }}>web.whatsapp.com</a> & scan QR code</span>
                </div>
              </div>

              {/* Active Monitoring Status */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#10b981' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }}></span>
                <span>Active Session: <strong>{sessions?.[0]?.phone_number || '+917986411005 (Live)'}</strong></span>
              </div>
            </div>
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
                <label className="crm-label">Deal Value (₹ / $)</label>
                <input
                  type="text"
                  className="crm-input"
                  placeholder="e.g. ₹25,000 or $1,500"
                  defaultValue={activeContact.deal_value || activeContact.dealValue || ''}
                  onChange={(e) => {
                    activeContact.deal_value = e.target.value;
                  }}
                />
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
