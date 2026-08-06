export const EXPENSE_CLAIMS_MANIFEST = {
  moduleId: 'expenses',
  label: 'Expense Claims & Reimbursements',
  icon: '🧾',
  category: 'PAYROLL & FINANCE',
  description: 'Employee voucher claims, travel reimbursements, receipt attachments & approvals.',
  capabilities: {
    views: true,
    listView: true,
    kanbanView: true,
    forms: true,
    summary: true,
    searchFilters: true
  },
  defaultStages: [
    { id: 'submitted', name: 'Submitted', color: '#f59e0b', emoji: '⏳' },
    { id: 'approved', name: 'Approved', color: '#10b981', emoji: '✅' },
    { id: 'reimbursed', name: 'Reimbursed', color: '#3b82f6', emoji: '💵' },
    { id: 'rejected', name: 'Rejected', color: '#ef4444', emoji: '❌' }
  ]
};
