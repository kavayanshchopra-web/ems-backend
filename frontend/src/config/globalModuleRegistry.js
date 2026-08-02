/**
 * EMS Global Module Registry
 * Authoritative central registry of configurable EMS modules, capabilities, and entity models.
 */

export const GLOBAL_MODULE_REGISTRY = {
  recruitment_ats: {
    id: 'recruitment_ats',
    label: 'Recruitment ATS',
    category: 'HR Management',
    description: 'Candidate Pipeline & Hiring Roster',
    icon: '🧑‍💼',
    configurable: true,
    status: 'Configured',
    primaryEntity: 'candidate',
    capabilities: {
      forms: true,
      summary: true,
      searchFilters: true,
      listView: true,
      kanbanView: true,
      views: true
    }
  },
  employees: {
    id: 'employees',
    label: 'All Employees',
    category: 'HR Management',
    description: 'Employee Directory & Lifecycle Profiles',
    icon: '👥',
    configurable: true,
    status: 'Configured',
    primaryEntity: 'employee',
    capabilities: {
      forms: true,
      summary: true,
      searchFilters: true,
      listView: true,
      kanbanView: true,
      views: true
    }
  },
  asset_management: {
    id: 'asset_management',
    label: 'Asset Management',
    category: 'Operations & IT',
    description: 'Hardware, Laptops, & Office Asset Allocation',
    icon: '💻',
    configurable: true,
    status: 'Configured',
    primaryEntity: 'asset',
    capabilities: {
      forms: true,
      summary: true,
      searchFilters: true,
      listView: true,
      kanbanView: true,
      views: true
    }
  },
  crm: {
    id: 'crm',
    label: 'CRM Lead Pipeline',
    category: 'Sales & Marketing',
    description: 'Leads, Deals, & Customer Pipeline',
    icon: '📈',
    configurable: false,
    status: 'Coming Soon',
    primaryEntity: 'deal',
    capabilities: {
      forms: true,
      summary: true,
      searchFilters: true,
      listView: true,
      kanbanView: true,
      views: true
    }
  }
};
