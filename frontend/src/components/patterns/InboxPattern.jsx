import React from 'react';
import PageContainer from '../ui/PageContainer';

/**
 * Global Design System v2.0 - InboxPattern (WhatsApp CRM Multi-agent Chat Stream)
 */
export default function InboxPattern({
  chatList,
  activeChatStream,
  contactDetailsPanel = null,
  style = {},
  className = ''
}) {
  return (
    <PageContainer fullWidth style={{ padding: '12px', height: 'calc(100vh - 80px)', overflow: 'hidden', ...style }} className={className}>
      <div
        style={{
          display: 'flex',
          height: '100%',
          width: '100%',
          borderRadius: '12px',
          overflow: 'hidden',
          border: '1px solid #e2e8f0',
          background: '#ffffff'
        }}
      >
        {/* Left Chat List Panel */}
        <div style={{ width: '320px', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', background: '#f8fafc', flexShrink: 0 }}>
          {chatList}
        </div>

        {/* Main Conversation Stream */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#ffffff' }}>
          {activeChatStream}
        </div>

        {/* Right Contact Info Drawer Panel */}
        {contactDetailsPanel && (
          <div style={{ width: '300px', borderLeft: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', background: '#f8fafc', flexShrink: 0 }}>
            {contactDetailsPanel}
          </div>
        )}
      </div>
    </PageContainer>
  );
}
