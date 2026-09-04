/**
 * CONVERSATIONS & OMNI-TIMELINE HUB MODULE MANIFEST
 * Unified Omnichannel Stream: WhatsApp Chats, Call Recordings, and Notes
 */

import { MODULE_CATEGORIES, LICENSE_PLANS } from '../types';

export const CONVERSATIONS_MANIFEST = {
  moduleId: 'conversations',
  version: '1.0.0',
  minPlatformVersion: '1.0.0',
  name: 'Conversations & Omni-Timeline',
  description: 'Unified lead communications: WhatsApp messages, call records with audio recordings, and CRM notes.',
  category: MODULE_CATEGORIES.CRM_SALES,
  icon: '💬',
  accentColor: '#0d9488',
  author: 'EMS Core Team',
  
  requiredLicensePlan: LICENSE_PLANS.COMMUNITY,
  isCoreModule: true,
  dependencies: ['contacts'],
  
  routes: [
    {
      path: '/conversations',
      componentKey: 'ConversationsPage',
      exact: true,
      requiresAuth: true,
      requiredPermissions: ['conversations.view']
    }
  ],
  
  navigation: [
    {
      id: 'nav_conversations',
      label: 'Conversations',
      icon: 'MessageSquare',
      category: 'CRM & SALES',
      order: 0
    }
  ],
  
  permissions: [
    { key: 'conversations.view', name: 'View Conversations', description: 'Access omnichannel conversation stream and call recordings', defaultRoles: ['superadmin', 'owner', 'admin', 'manager', 'employee'] },
    { key: 'conversations.reply', name: 'Send Messages', description: 'Reply to leads via WhatsApp', defaultRoles: ['superadmin', 'owner', 'admin', 'manager', 'employee'] },
    { key: 'conversations.call', name: 'Call Contact', description: 'Trigger softphone/SIM call from conversations', defaultRoles: ['superadmin', 'owner', 'admin', 'manager', 'employee'] },
    { key: 'conversations.manage', name: 'Manage Conversations', description: 'Archive conversations and update lead stages', defaultRoles: ['superadmin', 'owner', 'admin', 'manager'] }
  ]
};
