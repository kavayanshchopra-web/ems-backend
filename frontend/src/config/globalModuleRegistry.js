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
    configurable: true,
    status: 'Configured',
    primaryEntity: 'deal',
    capabilities: {
      forms: true,
      summary: true,
      searchFilters: true,
      listView: true,
      kanbanView: true,
      views: true
    }
  },
  payroll: {
    id: 'payroll',
    label: 'Payroll & Finance',
    category: 'Payroll & Finance',
    description: 'Employee Salaries, Claims, & Payslip Generation',
    icon: '💵',
    configurable: true,
    status: 'Configured',
    primaryEntity: 'payroll',
    capabilities: {
      forms: true,
      summary: true,
      searchFilters: true,
      listView: true,
      kanbanView: true,
      views: true
    }
  },
  expenses: {
    id: 'expenses',
    label: 'Expense Claims',
    category: 'Payroll & Finance',
    description: 'Employee voucher claims, travel reimbursements, receipt attachments & approvals',
    icon: '🧾',
    configurable: true,
    status: 'Configured',
    primaryEntity: 'expense',
    capabilities: {
      forms: true,
      summary: true,
      searchFilters: true,
      listView: true,
      kanbanView: true,
      views: true
    }
  },
  advances_loans: {
    id: 'advances_loans',
    label: 'Advances & Loans',
    category: 'Payroll & Finance',
    description: 'Process advanced payout requests and company loan approvals for employees',
    icon: '💳',
    configurable: true,
    status: 'Configured',
    primaryEntity: 'advance_loan',
    capabilities: {
      forms: true,
      summary: true,
      searchFilters: true,
      listView: true,
      kanbanView: true,
      views: true
    }
  },
  verify_documents: {
    id: 'verify_documents',
    label: 'Verify Documents',
    category: 'HR Management',
    description: 'Audit employee KYC files, Aadhaar, PAN, Bank Passbook, and Degree Certificates',
    icon: '📄',
    configurable: true,
    status: 'Configured',
    primaryEntity: 'kyc_document',
    capabilities: {
      forms: true,
      summary: true,
      searchFilters: true,
      listView: true,
      kanbanView: true,
      views: true
    }
  },
  offboarding: {
    id: 'offboarding',
    label: 'Offboarding Exit',
    category: 'HR Management',
    description: 'Track resignation clearances, IT asset handovers, NOC checklists, F&F settlements, and exit interviews',
    icon: '🚪',
    configurable: true,
    status: 'Configured',
    primaryEntity: 'offboarding_case',
    capabilities: {
      forms: true,
      summary: true,
      searchFilters: true,
      listView: true,
      kanbanView: true,
      views: true
    }
  },
  holidays: {
    id: 'holidays',
    label: 'Company Holidays Calendar',
    category: 'Operations & IT',
    description: 'Annual official gazetted holidays, restricted leave schedule, and festival calendar',
    icon: '📅',
    configurable: true,
    status: 'Configured',
    primaryEntity: 'holiday',
    capabilities: {
      forms: true,
      summary: true,
      searchFilters: true,
      listView: true,
      kanbanView: true,
      views: true
    }
  },
  notice_board: {
    id: 'notice_board',
    label: 'Workspace Notice Board',
    category: 'Operations & IT',
    description: 'Broadcast company announcements, updates, guidelines, and official notices',
    icon: '🔔',
    configurable: true,
    status: 'Configured',
    primaryEntity: 'notice',
    capabilities: {
      forms: true,
      summary: true,
      searchFilters: true,
      listView: true,
      kanbanView: true,
      views: true
    }
  },
  tasks: {
    id: 'tasks',
    label: 'Tasks Board',
    category: 'Operations & IT',
    description: 'Assign, track, and manage team task workloads with interactive Kanban boards',
    icon: '📋',
    configurable: true,
    status: 'Configured',
    primaryEntity: 'task',
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
