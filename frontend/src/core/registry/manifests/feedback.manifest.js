/**
 * FEEDBACK & SUGGESTIONS MODULE MANIFEST
 * System Manifest for Feedback & Platform Suggestions Module
 */

import { MODULE_CATEGORIES, LICENSE_PLANS } from '../types';

export const FEEDBACK_MANIFEST = {
  moduleId: 'feedback',
  version: '1.0.0',
  minPlatformVersion: '1.0.0',
  name: 'Feedback & Suggestions',
  description: 'Submit platform feedback, report issues, suggest feature improvements, and track resolution status in real-time.',
  category: MODULE_CATEGORIES?.HELP_SUPPORT || 'HELP_SUPPORT',
  icon: '💬',
  accentColor: '#ec4899',
  author: 'EMS Core Platform',
  
  requiredLicensePlan: LICENSE_PLANS?.FREE || 'FREE',
  isCoreModule: true,
  dependencies: [],
  
  routes: [
    {
      path: '/feedback',
      componentKey: 'FeedbackView',
      exact: true,
      requiresAuth: true,
      requiredPermissions: ['feedback.view']
    }
  ],
  
  navigation: [
    {
      id: 'nav_feedback',
      label: 'Feedback & Suggestions',
      icon: 'MessageSquareHeart',
      category: 'Help & Support',
      order: 10
    }
  ],
  
  permissions: [
    { key: 'feedback.view', name: 'View Feedback', description: 'Access platform feedback center and view submission history', defaultRoles: ['superadmin', 'owner', 'admin', 'manager', 'employee', 'agent'] },
    { key: 'feedback.create', name: 'Submit Feedback', description: 'Submit bug reports, feature requests, and satisfaction ratings', defaultRoles: ['superadmin', 'owner', 'admin', 'manager', 'employee', 'agent'] },
    { key: 'feedback.delete', name: 'Delete Feedback', description: 'Delete feedback submissions (Super Admin only)', defaultRoles: ['superadmin'] }
  ],
  
  defaultFields: [
    { id: 'rating', label: 'Satisfaction Rating (1-5)', type: 'number', systemField: true, required: true, searchable: false, filterable: true, sortable: true, showOnCreate: true, showOnEdit: true, showOnView: true },
    { id: 'category', label: 'Feedback Category', type: 'dropdown', systemField: true, required: true, searchable: true, filterable: true, sortable: true, showOnCreate: true, showOnEdit: true, showOnView: true, options: ['bug', 'feature_request', 'ui_ux', 'performance', 'general'] },
    { id: 'title', label: 'Feedback Title', type: 'text', systemField: true, required: true, searchable: true, filterable: false, sortable: true, showOnCreate: true, showOnEdit: true, showOnView: true, placeholder: 'e.g. Add dark mode preference, Call recording audio waveform issue' },
    { id: 'message', label: 'Detailed Feedback / Steps', type: 'textarea', systemField: true, required: true, searchable: true, filterable: false, sortable: false, showOnCreate: true, showOnEdit: true, showOnView: true, placeholder: 'Describe your feedback, suggestion, or steps to reproduce the issue...' },
    { id: 'pageModule', label: 'Target Module / Page', type: 'text', systemField: true, required: false, searchable: true, filterable: true, sortable: false, showOnCreate: true, showOnEdit: true, showOnView: true },
    { id: 'priority', label: 'Priority Level', type: 'dropdown', systemField: true, required: false, searchable: false, filterable: true, sortable: true, showOnCreate: true, showOnEdit: true, showOnView: true, options: ['low', 'medium', 'high', 'urgent'] },
    { id: 'companyName', label: 'Company Name', type: 'text', systemField: true, required: false, searchable: true, filterable: true, sortable: true, showOnCreate: false, showOnEdit: false, showOnView: true },
    { id: 'userName', label: 'Submitted By (Name)', type: 'text', systemField: true, required: false, searchable: true, filterable: true, sortable: true, showOnCreate: false, showOnEdit: false, showOnView: true },
    { id: 'userEmail', label: 'Submitted By (Email)', type: 'email', systemField: true, required: false, searchable: true, filterable: true, sortable: true, showOnCreate: false, showOnEdit: false, showOnView: true },
    { id: 'status', label: 'Status', type: 'dropdown', systemField: true, required: true, searchable: false, filterable: true, sortable: true, showOnCreate: false, showOnEdit: true, showOnView: true, options: ['new', 'under_review', 'in_progress', 'planned', 'resolved', 'closed'] },
    { id: 'adminReply', label: 'Super Admin Resolution Reply', type: 'textarea', systemField: true, required: false, searchable: true, filterable: false, sortable: false, showOnCreate: false, showOnEdit: true, showOnView: true }
  ],
  
  defaultSummaryWidgets: [
    { id: 'total_feedback', title: 'Total Feedbacks', metric: 'count', calculation: 'count', icon: 'MessageSquare', color: '#3b82f6' },
    { id: 'avg_rating', title: 'Avg Satisfaction Rating', metric: 'rating', calculation: 'average', icon: 'Star', color: '#f59e0b' },
    { id: 'resolved_feedback', title: 'Resolved Issues', metric: 'status', calculation: 'count_resolved', icon: 'CheckCircle', color: '#10b981' }
  ],
  
  views: {
    availableViews: ['list', 'cards'],
    defaultView: 'cards'
  }
};
