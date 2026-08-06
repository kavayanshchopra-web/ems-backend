export const WHATSAPP_CHATS_MANIFEST = {
  moduleId: 'whatsapp_crm',
  label: 'WhatsApp Chats & Telecalling',
  icon: '💬',
  category: 'SALES & MARKETING',
  description: 'Live WhatsApp conversations, automated AI bot flows, dialer logs & lead chats.',
  capabilities: {
    views: true,
    listView: true,
    kanbanView: true,
    forms: true,
    summary: true,
    searchFilters: true
  },
  defaultStages: [
    { id: 'new', name: 'New Chat', color: '#3b82f6', emoji: '💬' },
    { id: 'active', name: 'Active Session', color: '#10b981', emoji: '🔥' },
    { id: 'resolved', name: 'Resolved', color: '#64748b', emoji: '✅' }
  ]
};
