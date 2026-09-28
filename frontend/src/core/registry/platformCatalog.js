/**
 * PLATFORM MASTER MODULE & PAGE CATALOG (platformCatalog.js)
 * Single Source of Truth for all platform pages, top-level applications, and internal header sub-tabs.
 * Powers SuperAdmin Module Provisioning Hub, App Launcher, RBAC permissions & Navigation Gates.
 * 
 * Auto-Extensible: Automatically discovers any new manifests or dynamic pages created at runtime.
 */

import { masterModuleRegistry } from './MasterModuleRegistry';

// Canonical base system catalog
export const SYSTEM_MODULE_CATALOG = [
  // 1. DASHBOARDS
  {
    id: 'admin_dashboard',
    label: 'Company Overview',
    icon: '📊',
    category: 'DASHBOARDS',
    desc: 'Executive KPI metrics, staff statistics, and live company overview dashboard.',
    isParentModule: true
  },
  {
    id: 'manager_dashboard',
    label: 'Task Analytics',
    icon: '📈',
    category: 'DASHBOARDS',
    desc: 'Department-level productivity tracking and workload metrics.'
  },

  // 2. TASK MANAGEMENT
  {
    id: 'tasks',
    label: 'Task Management',
    icon: '📋',
    category: 'OPERATIONS',
    desc: 'Team task delegation, priorities, due dates, and completion status.',
    isParentModule: true
  },

  // 3. LIVE TRACKING MAP
  {
    id: 'gps_attendance',
    label: 'Live Tracking Map',
    icon: '🌐',
    category: 'OPERATIONS',
    desc: 'Real-time GPS route tracking & live geo-location pin map.',
    isParentModule: true
  },

  // 4. HR MANAGEMENT & SUB-PAGES
  {
    id: 'hr_management',
    label: 'HR Management (App)',
    icon: '👥',
    category: 'HR MANAGEMENT',
    desc: 'Complete HR & workforce suite top-level launcher module.',
    isParentModule: true
  },
  {
    id: 'employees',
    label: 'All Employees',
    icon: '👥',
    category: 'HR MANAGEMENT',
    desc: 'Staff directory, dynamic employee profiles, salary, and status.',
    parentModuleId: 'hr_management'
  },
  {
    id: 'recruitment_ats',
    label: 'Recruitment & ATS',
    icon: '🎯',
    category: 'HR MANAGEMENT',
    desc: 'Candidate pipeline, resume management, hiring stages, and job postings.',
    parentModuleId: 'hr_management'
  },
  {
    id: 'asset_management',
    label: 'Asset Management',
    icon: '💻',
    category: 'HR MANAGEMENT',
    desc: 'Company hardware, laptops, SIM cards, serial tags, and allocations.',
    parentModuleId: 'hr_management'
  },
  {
    id: 'verify_documents',
    label: 'Verify Documents',
    icon: '📋',
    category: 'HR MANAGEMENT',
    desc: 'Employee KYC verification, ID cards, education proofs, and approvals.',
    parentModuleId: 'hr_management'
  },
  {
    id: 'offboarding',
    label: 'Offboarding Exit',
    icon: '🚪',
    category: 'HR MANAGEMENT',
    desc: 'Employee resignation, clearance checklists, handover, and exit surveys.',
    parentModuleId: 'hr_management'
  },

  // 5. PAYROLL & FINANCE & SUB-PAGES
  {
    id: 'payroll_finance',
    label: 'Payroll & Finance (App)',
    icon: '💳',
    category: 'PAYROLL & FINANCE',
    desc: 'Complete financial operations & payroll top-level launcher module.',
    isParentModule: true
  },
  {
    id: 'payroll',
    label: 'Payroll & Salary',
    icon: '💰',
    category: 'PAYROLL & FINANCE',
    desc: 'Monthly salary generation, deductions, bonuses, and pay slip downloads.',
    parentModuleId: 'payroll_finance'
  },
  {
    id: 'taxes_compliance',
    label: 'Taxes & Compliance',
    icon: '📄',
    category: 'PAYROLL & FINANCE',
    desc: 'Tax slabs, PF/ESI deductions, compliance records, and certificates.',
    parentModuleId: 'payroll_finance'
  },
  {
    id: 'ff_settlements',
    label: 'F&F Settlements',
    icon: '✅',
    category: 'PAYROLL & FINANCE',
    desc: 'Full & Final settlement calculations for relieved employees.',
    parentModuleId: 'payroll_finance'
  },
  {
    id: 'advances_loans',
    label: 'Advances & Loans',
    icon: '💳',
    category: 'PAYROLL & FINANCE',
    desc: 'Staff salary advance requests, EMI tracking, and approval workflow.',
    parentModuleId: 'payroll_finance'
  },
  {
    id: 'expenses',
    label: 'Expenses Claim',
    icon: '🧾',
    category: 'PAYROLL & FINANCE',
    desc: 'Travel & daily expense reimbursements with receipt upload and approval.',
    parentModuleId: 'payroll_finance'
  },

  // 6. REPORTS & ANALYTICS & SUB-PAGES
  {
    id: 'reporting',
    label: 'Reports & Analytics (App)',
    icon: '📊',
    category: 'REPORTS & ANALYTICS',
    desc: 'Central enterprise reporting & analytics top-level launcher module.',
    isParentModule: true
  },
  {
    id: 'reports_telephony',
    label: 'Phone System Reports',
    icon: '📞',
    category: 'REPORTS & ANALYTICS',
    desc: 'Inbound/outbound call metrics, agent volume, durations, and recordings analytics.',
    parentModuleId: 'reporting'
  },
  {
    id: 'reports_crm',
    label: 'CRM Sales Reports',
    icon: '📈',
    category: 'REPORTS & ANALYTICS',
    desc: 'Sales pipeline velocity, conversion rates, and revenue projections.',
    parentModuleId: 'reporting'
  },
  {
    id: 'reports_cross',
    label: 'Cross-Analytics Reports',
    icon: '🔄',
    category: 'REPORTS & ANALYTICS',
    desc: 'Cross-module correlation reports connecting HR, attendance, calls, and performance.',
    parentModuleId: 'reporting'
  },
  {
    id: 'reports_builder',
    label: 'Custom Report Builder',
    icon: '🎛️',
    category: 'REPORTS & ANALYTICS',
    desc: 'Custom ad-hoc report designer with dynamic columns, filters, and export.',
    parentModuleId: 'reporting'
  },

  // 7. CRM & SALES
  {
    id: 'contacts',
    label: 'Contacts Directory',
    icon: '👥',
    category: 'CRM & SALES',
    desc: 'Contact directory, leads, customer segments, and duplicate restrictions.',
    isParentModule: true
  },
  {
    id: 'conversations',
    label: 'Conversations Inbox',
    icon: '💬',
    category: 'CRM & SALES',
    desc: 'Unified communications feed, WhatsApp chats, and call recordings.',
    isParentModule: true
  },
  {
    id: 'wa_live_web',
    label: 'WhatsApp Web Live',
    icon: '📱',
    category: 'CRM & SALES',
    desc: 'Embedded WhatsApp Web interface for direct customer conversations.',
    isParentModule: true
  },
  {
    id: 'kanban',
    label: 'CRM Deals Pipeline',
    icon: '📈',
    category: 'CRM & SALES',
    desc: 'Drag-and-drop sales lead stages, deal values, and customer notes.',
    isParentModule: true
  },
  {
    id: 'telecalling',
    label: 'Phone System & PBX',
    icon: '📞',
    category: 'CRM & SALES',
    desc: 'Telecalling call logs, audio playback, dispositions, and SIM bridge.',
    isParentModule: true
  },

  // 8. OPERATIONS
  {
    id: 'operations',
    label: 'Operations (App)',
    icon: '🏢',
    category: 'OPERATIONS',
    desc: 'Company operations parent launcher module.',
    isParentModule: true
  },
  {
    id: 'office_kiosk',
    label: 'Office Kiosk Mode',
    icon: '🏢',
    category: 'OPERATIONS',
    desc: 'Tablet / Kiosk face-scan attendance mode for office entry gates.',
    parentModuleId: 'operations'
  },
  {
    id: 'notice_board',
    label: 'Notice Board',
    icon: '🔔',
    category: 'OPERATIONS',
    desc: 'Company announcements, circulars, and broadcast notices.',
    parentModuleId: 'operations'
  },
  {
    id: 'holidays',
    label: 'Holidays List',
    icon: '🏖️',
    category: 'OPERATIONS',
    desc: 'Annual festival calendar, national holidays, and regional day-offs.',
    parentModuleId: 'operations'
  },

  // 9. WORKFLOWS & AUTOMATIONS
  {
    id: 'automations_sandbox',
    label: 'Automations Hub',
    icon: '⚡',
    category: 'WORKFLOWS',
    desc: 'Event triggers, webhooks & automated multi-step actions engine.',
    isParentModule: true
  },

  // 10. MY PORTAL
  {
    id: 'my_portal',
    label: 'My Portal (App)',
    icon: '👤',
    category: 'MY PORTAL',
    desc: 'Employee self-service personal portal top-level launcher module.',
    isParentModule: true
  },
  {
    id: 'my_attendance',
    label: 'Shift Attendance',
    icon: '⏱️',
    category: 'MY PORTAL',
    desc: 'Employee self check-in / check-out with selfie and geolocation.',
    parentModuleId: 'my_portal'
  },
  {
    id: 'leaves',
    label: 'Leaves Requests',
    icon: '🏖️',
    category: 'MY PORTAL',
    desc: 'Casual, sick, and earned leave balance application and manager approvals.',
    parentModuleId: 'my_portal'
  },
  {
    id: 'shifts',
    label: 'Work Shift Roster',
    icon: '📅',
    category: 'MY PORTAL',
    desc: 'Monthly work shifts, weekly off schedules, and roster planner.',
    parentModuleId: 'my_portal'
  },

  // 11. ADMINISTRATION & SECURITY
  {
    id: 'audit_logs',
    label: 'System Audit Logs',
    icon: '🛡️',
    category: 'ADMINISTRATION',
    desc: 'Immutable security audit trail, IP tracking, and user activity logging.',
    isParentModule: true
  },
  {
    id: 'media_storage',
    label: 'Media & Storage',
    icon: '💾',
    category: 'ADMINISTRATION',
    desc: 'Secure cloud asset storage, employee files, and document vault.',
    isParentModule: true
  },
  {
    id: 'superadmin_plans',
    label: 'System Super Admin',
    icon: '👑',
    category: 'ADMINISTRATION',
    desc: 'Multi-tenant provisioning, plans, pricing & telemetry.',
    isParentModule: true
  },

  // 12. HELP & SUPPORT
  {
    id: 'help_support',
    label: 'Help & Support (App)',
    icon: '❓',
    category: 'SUPPORT',
    desc: 'Guides, system walkthroughs, and user support top-level launcher module.',
    isParentModule: true
  },
  {
    id: 'app_guide',
    label: 'App Guide & Tour',
    icon: '🌐',
    category: 'SUPPORT',
    desc: 'Interactive guided application tour, tutorials, and system walkthrough.',
    parentModuleId: 'help_support'
  },
  {
    id: 'feedback',
    label: 'Feedback & Suggestions',
    icon: '💌',
    category: 'SUPPORT',
    desc: 'Feature requests, user bug reporting, and feedback vault.',
    parentModuleId: 'help_support'
  },

  // 13. SETTINGS
  {
    id: 'settings',
    label: 'General Settings',
    icon: '⚙️',
    category: 'SETTINGS',
    desc: 'Company branding, logos, timezone, and general workspace configurations.',
    isParentModule: true
  },
  {
    id: 'integrations',
    label: 'Integrations & Webhooks',
    icon: '🔌',
    category: 'SETTINGS',
    desc: 'Third-party API keys, webhook URLs, and GoHighLevel sync.',
    parentModuleId: 'settings'
  },
  {
    id: 'roles_permissions',
    label: 'Roles & Permissions',
    icon: '🔐',
    category: 'SETTINGS',
    desc: 'Granular RBAC matrix for Admin, Manager, HR, and Employee roles.',
    parentModuleId: 'settings'
  },
  {
    id: 'recycle_bin',
    label: 'Trash & Recycle Bin',
    icon: '🗑️',
    category: 'SETTINGS',
    desc: 'Trash vault for restoring soft-deleted records or permanent purge.',
    parentModuleId: 'settings'
  },
  {
    id: 'system_dropdowns',
    label: 'System Master Dropdowns',
    icon: '🏷️',
    category: 'SETTINGS',
    desc: 'Master dropdown values for departments, designations, and tags.',
    parentModuleId: 'settings'
  },
  {
    id: 'module_configuration',
    label: 'Module Configuration',
    icon: '🎛️',
    category: 'SETTINGS',
    desc: 'Custom fields, dynamic forms builder, and table column customizer.',
    parentModuleId: 'settings'
  },
  {
    id: 'billing',
    label: 'Subscription Billing',
    icon: '💳',
    category: 'SETTINGS',
    desc: 'SaaS plan upgrades, seat quotas, invoices, and payment gateways.',
    parentModuleId: 'settings'
  }
];

// Runtime dynamic memory store for dynamically added pages
const _dynamicPages = new Map();

/**
 * Register a new page/module dynamically at runtime.
 * Automatically broadcasts update event to re-render Provisioning Hub & Nav.
 * @param {Object} pageDef - { id, label, icon, category, desc, parentModuleId, isParentModule }
 */
export function registerDynamicPage(pageDef) {
  if (!pageDef || !pageDef.id) return;
  _dynamicPages.set(pageDef.id, {
    id: pageDef.id,
    label: pageDef.label || pageDef.name || pageDef.id,
    icon: pageDef.icon || '🧩',
    category: pageDef.category || 'CUSTOM MODULES',
    desc: pageDef.desc || pageDef.description || 'Dynamic custom platform module',
    isParentModule: !!pageDef.isParentModule,
    parentModuleId: pageDef.parentModuleId || null,
    isDynamic: true
  });

  try {
    if (typeof window !== 'undefined') {
      const stored = Array.from(_dynamicPages.values());
      localStorage.setItem('omnilflow_dynamic_registered_pages', JSON.stringify(stored));
      window.dispatchEvent(new CustomEvent('omnilflow_catalog_updated'));
    }
  } catch (e) {}
}

/**
 * Get all provisionable modules and pages (combining Master Catalog + Registry Manifests + Dynamic Pages)
 * Ensures automatic discovery without manual hardcoding.
 * @returns {Array<Object>}
 */
export function getAllProvisionableModules() {
  const map = new Map();

  // 1. Load from Canonical Master Catalog
  SYSTEM_MODULE_CATALOG.forEach(mod => {
    map.set(mod.id, { ...mod });
  });

  // 2. Discover from MasterModuleRegistry manifests
  try {
    if (masterModuleRegistry && typeof masterModuleRegistry.getAllManifests === 'function') {
      const manifests = masterModuleRegistry.getAllManifests();
      (manifests || []).forEach(m => {
        const id = m.moduleId || m.id;
        if (id && !map.has(id)) {
          map.set(id, {
            id,
            label: m.name || m.label || id,
            icon: m.icon || '📦',
            category: m.category || 'PLATFORM MODULES',
            desc: m.description || `Module: ${m.name || id}`,
            isParentModule: false
          });
        }
      });
    }
  } catch (e) {
    console.warn('[platformCatalog] Registry discovery notice:', e);
  }

  // 3. Discover from Local Dynamic Registrations
  _dynamicPages.forEach((page, id) => {
    map.set(id, { ...page });
  });

  // 4. Discover from LocalStorage Persisted Custom Modules
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = localStorage.getItem('omnilflow_dynamic_registered_pages');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          parsed.forEach(p => {
            if (p && p.id) {
              map.set(p.id, { ...p });
              _dynamicPages.set(p.id, p);
            }
          });
        }
      }
    }
  } catch (e) {}

  return Array.from(map.values());
}

/**
 * Dynamically extract all unique categories present in the active catalog.
 * @param {Array<Object>} modules 
 * @returns {Array<string>}
 */
export function getCatalogCategories(modules = null) {
  const mods = modules || getAllProvisionableModules();
  const cats = new Set(['ALL']);
  mods.forEach(m => {
    if (m.category && typeof m.category === 'string') {
      cats.add(m.category.toUpperCase().trim());
    }
  });
  return Array.from(cats);
}
