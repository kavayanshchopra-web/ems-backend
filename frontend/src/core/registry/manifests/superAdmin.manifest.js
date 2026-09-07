/**
 * SUPER ADMIN SYSTEM MANIFEST & METRIC REGISTRY
 * Dedicated isolated system model for Super Admin Control Center.
 * STRICT ISOLATION: Accessible ONLY by authUser.role === 'superadmin'.
 * Not exposed in tenant client manifests, billing add-ons, or employee portals.
 */

export const SUPER_ADMIN_MANIFEST = {
  moduleId: 'superadmin',
  version: '2.0.0',
  name: 'Super Admin Control Center',
  description: 'Enterprise platform governance, multi-tenant telemetry, global module provisioning, and financial revenue tracking.',
  icon: '👑',
  accentColor: '#0d9488',
  requiresRole: 'superadmin',
  isTenantExempt: true, // Guarantees isolation from tenant billing & client menus

  // 1. DYNAMIC METRIC CARDS REGISTRY
  kpiCards: [
    {
      id: 'revenue',
      label: 'Total Revenue',
      category: 'Finance',
      icon: 'DollarSign',
      color: '#0d9488',
      bgLight: 'rgba(13, 148, 136, 0.12)',
      border: 'rgba(13, 148, 136, 0.25)',
      defaultActive: true,
      targetTab: 'subscription_hub',
      format: 'currency',
      description: 'Sum of all verified and paid client SaaS invoices'
    },
    {
      id: 'expenses',
      label: 'Total Expenses',
      category: 'Finance',
      icon: 'TrendingDown',
      color: '#ef4444',
      bgLight: 'rgba(239, 68, 68, 0.12)',
      border: 'rgba(239, 68, 68, 0.25)',
      defaultActive: true,
      targetTab: 'subscription_hub',
      format: 'currency',
      description: 'Total approved company & platform expense vouchers'
    },
    {
      id: 'net_margin',
      label: 'Net Margin',
      category: 'Finance',
      icon: 'TrendingUp',
      color: '#10b981',
      bgLight: 'rgba(16, 185, 129, 0.12)',
      border: 'rgba(16, 185, 129, 0.25)',
      defaultActive: true,
      targetTab: 'subscription_hub',
      format: 'currency',
      description: 'Total Revenue minus Total Expenses'
    },
    {
      id: 'pending_approvals',
      label: 'Pending Approvals',
      category: 'Finance',
      icon: 'Clock',
      color: '#f59e0b',
      bgLight: 'rgba(245, 158, 11, 0.12)',
      border: 'rgba(245, 158, 11, 0.25)',
      defaultActive: true,
      targetTab: 'subscription_hub',
      format: 'number',
      description: 'Client subscription payments awaiting UTR verification'
    },
    {
      id: 'companies',
      label: 'Companies',
      category: 'Tenants',
      icon: 'Briefcase',
      color: '#0284c7',
      bgLight: 'rgba(2, 132, 199, 0.12)',
      border: 'rgba(2, 132, 199, 0.25)',
      defaultActive: true,
      targetTab: 'manage_companies',
      format: 'number',
      description: 'Total registered tenant organizations'
    },
    {
      id: 'total_users',
      label: 'Total Users',
      category: 'Users',
      icon: 'Users',
      color: '#8b5cf6',
      bgLight: 'rgba(139, 92, 246, 0.12)',
      border: 'rgba(139, 92, 246, 0.25)',
      defaultActive: true,
      targetTab: 'system_users',
      format: 'number',
      description: 'Combined system users across all tenant workspaces'
    },
    {
      id: 'paid_subs',
      label: 'Paid Subscriptions',
      category: 'Finance',
      icon: 'ShieldCheck',
      color: '#059669',
      bgLight: 'rgba(5, 150, 105, 0.12)',
      border: 'rgba(5, 150, 105, 0.25)',
      defaultActive: true,
      targetTab: 'subscription_hub',
      format: 'number',
      description: 'Organizations on active paid commercial plans'
    },
    {
      id: 'platform_modules',
      label: 'Platform Modules',
      category: 'Operations',
      icon: 'Layers',
      color: '#0d9488',
      bgLight: 'rgba(13, 148, 136, 0.12)',
      border: 'rgba(13, 148, 136, 0.25)',
      defaultActive: true,
      targetTab: 'module_provisioning',
      format: 'number',
      description: 'Total platform modules in Master Registry'
    },
    {
      id: 'admins',
      label: 'Admins',
      category: 'Users',
      icon: 'Shield',
      color: '#ec4899',
      bgLight: 'rgba(236, 72, 153, 0.12)',
      border: 'rgba(236, 72, 153, 0.25)',
      defaultActive: false,
      targetTab: 'system_users',
      format: 'number',
      description: 'Company administrators and owners'
    },
    {
      id: 'employees',
      label: 'Employees',
      category: 'Users',
      icon: 'UserCheck',
      color: '#6366f1',
      bgLight: 'rgba(99, 102, 241, 0.12)',
      border: 'rgba(99, 102, 241, 0.25)',
      defaultActive: false,
      targetTab: 'system_users',
      format: 'number',
      description: 'Total registered staff & employees'
    },
    {
      id: 'branches',
      label: 'Branches',
      category: 'Tenants',
      icon: 'Globe',
      color: '#06b6d4',
      bgLight: 'rgba(6, 182, 212, 0.12)',
      border: 'rgba(6, 182, 212, 0.25)',
      defaultActive: false,
      targetTab: 'manage_companies',
      format: 'number',
      description: 'Total tenant branch offices registered'
    }
  ],

  // 2. DYNAMIC SUB-TABS REGISTRY
  subTabs: [
    { id: 'system_users', label: 'System Users', icon: 'Users', order: 1 },
    { id: 'manage_companies', label: 'Manage Companies', icon: 'Briefcase', order: 2 },
    { id: 'module_provisioning', label: '🎛️ Module Provisioning', icon: 'Sliders', order: 3 },
    { id: 'model_studio', label: '🎛️ Model Studio', icon: 'Sliders', order: 3.5 },
    { id: 'manage_plans', label: 'Manage Plans', icon: 'Layers', order: 4 },
    { id: 'subscription_hub', label: '💳 Subscription Approvals & Billing', icon: 'CreditCard', order: 5 },
    { id: 'audit_logs', label: 'Audit Logs', icon: 'FileText', order: 6 },
    { id: 'kyc_compliance', label: '📋 KYC & Compliance', icon: 'ShieldCheck', order: 7 },
    { id: 'telephony_pbx', label: '📞 Cloud PBX & Telephony', icon: 'Phone', order: 8 },
    { id: 'feedback_hub', label: '💬 Company & User Feedback', icon: 'MessageSquare', order: 9 },
    { id: 'login_branding', label: '🎨 Login Page Studio', icon: 'Sparkles', order: 10 }
  ]
};

/**
 * Super Admin Internal Domain Models
 * Isolated schemas for Super Admin's exclusive governance and financial telemetry.
 */
export const SUPER_ADMIN_INTERNAL_MODELS = [
  {
    id: 'sa_subscriptions',
    label: 'Subscription & Billing Model',
    category: 'Super Admin Internal',
    description: 'Tenant subscriptions, UTR validations, GST invoice rules & grace periods',
    icon: '💳',
    configurable: true,
    status: 'Configured',
    primaryEntity: 'subscription',
    capabilities: {
      forms: true,
      summary: true,
      searchFilters: true,
      listView: true,
      views: true
    },
    defaultFields: [
      { id: 'company_name', label: 'Company Name', type: 'text', required: true, showOnList: true, systemField: true },
      { id: 'plan_tier', label: 'Subscription Plan', type: 'dropdown', required: true, showOnList: true, options: ['Starter', 'Professional', 'Enterprise', 'Custom Enterprise'] },
      { id: 'billing_cycle', label: 'Billing Cycle', type: 'dropdown', required: true, showOnList: true, options: ['Monthly', 'Quarterly', 'Annual', 'Bi-Annual'] },
      { id: 'amount_paid', label: 'Invoice Amount (INR)', type: 'currency', required: true, showOnList: true },
      { id: 'utr_reference', label: 'UTR / Transaction Ref', type: 'text', required: true, showOnList: true },
      { id: 'payment_status', label: 'Payment Status', type: 'status', required: true, showOnList: true, options: ['Verified', 'Pending', 'Rejected', 'Under Review'] },
      { id: 'valid_until', label: 'Subscription End Date', type: 'date', required: true, showOnList: true },
      { id: 'grace_period_days', label: 'Grace Period (Days)', type: 'number', required: false, showOnList: false }
    ],
    defaultSummaryWidgets: [
      { id: 'sw_total_sub_revenue', label: 'Subscription ARR', type: 'currency', field: 'amount_paid', aggregation: 'sum', enabled: true, color: '#0d9488' },
      { id: 'sw_active_subscriptions', label: 'Active Subscriptions', type: 'count', field: 'payment_status', filterValue: 'Verified', aggregation: 'count', enabled: true, color: '#06b6d4' },
      { id: 'sw_pending_utr', label: 'Pending UTR Verifications', type: 'count', field: 'payment_status', filterValue: 'Pending', aggregation: 'count', enabled: true, color: '#f59e0b' },
      { id: 'sw_expiring_soon', label: 'Expiring In 7 Days', type: 'count', field: 'valid_until', aggregation: 'count', enabled: true, color: '#8b5cf6' }
    ],
    defaultColumns: [
      { id: 'company_name', fieldKey: 'company_name', label: 'Company', visible: true, width: '220px' },
      { id: 'plan_tier', fieldKey: 'plan_tier', label: 'Plan', visible: true, width: '150px' },
      { id: 'amount_paid', fieldKey: 'amount_paid', label: 'Amount', visible: true, width: '140px' },
      { id: 'payment_status', fieldKey: 'payment_status', label: 'Status', visible: true, width: '130px' },
      { id: 'valid_until', fieldKey: 'valid_until', label: 'Expires On', visible: true, width: '140px' }
    ]
  },
  {
    id: 'sa_revenue_telemetry',
    label: 'Revenue & Telemetry Model',
    category: 'Super Admin Internal',
    description: 'System-wide ARR/MRR metrics, expense allocations, and net profit formulas',
    icon: '💰',
    configurable: true,
    status: 'Configured',
    primaryEntity: 'telemetry_metric',
    capabilities: {
      forms: true,
      summary: true,
      searchFilters: true,
      listView: true,
      views: true
    },
    defaultFields: [
      { id: 'expense_title', label: 'Expense Title', type: 'text', required: true, showOnList: true },
      { id: 'expense_category', label: 'Category', type: 'dropdown', required: true, showOnList: true, options: ['Cloud Hosting (AWS/GCP)', 'WhatsApp Gateway / BSP Fees', 'SMS / OTP Gateway', 'Marketing & Sales', 'Salaries & Contractors', 'Office & Legal'] },
      { id: 'expense_amount', label: 'Amount (INR)', type: 'currency', required: true, showOnList: true },
      { id: 'expense_date', label: 'Expense Date', type: 'date', required: true, showOnList: true },
      { id: 'vendor_name', label: 'Vendor / Provider', type: 'text', required: false, showOnList: true },
      { id: 'tax_deductible', label: 'GST Claimable', type: 'toggle', required: false, showOnList: false }
    ],
    defaultSummaryWidgets: [
      { id: 'sw_total_revenue', label: 'Total Revenue', type: 'currency', field: 'revenue', aggregation: 'sum', enabled: true, color: '#0d9488' },
      { id: 'sw_total_expenses', label: 'System Expenses', type: 'currency', field: 'expense_amount', aggregation: 'sum', enabled: true, color: '#ef4444' },
      { id: 'sw_net_profit', label: 'Net Profit Margin', type: 'currency', field: 'margin', aggregation: 'sum', enabled: true, color: '#10b981' }
    ],
    defaultColumns: [
      { id: 'expense_title', fieldKey: 'expense_title', label: 'Title', visible: true, width: '200px' },
      { id: 'expense_category', fieldKey: 'expense_category', label: 'Category', visible: true, width: '180px' },
      { id: 'expense_amount', fieldKey: 'expense_amount', label: 'Amount', visible: true, width: '140px' },
      { id: 'expense_date', fieldKey: 'expense_date', label: 'Date', visible: true, width: '130px' },
      { id: 'vendor_name', fieldKey: 'vendor_name', label: 'Vendor', visible: true, width: '160px' }
    ]
  },
  {
    id: 'sa_plans_pricing',
    label: 'Plans & Pricing Master Model',
    category: 'Super Admin Internal',
    description: 'Subscription tiers, seat quotas, feature bundling & pricing matrices',
    icon: '📊',
    configurable: true,
    status: 'Configured',
    primaryEntity: 'plan',
    capabilities: {
      forms: true,
      summary: true,
      searchFilters: true,
      listView: true,
      views: true
    },
    defaultFields: [
      { id: 'plan_name', label: 'Tier Name', type: 'text', required: true, showOnList: true },
      { id: 'monthly_price', label: 'Monthly Price (INR)', type: 'currency', required: true, showOnList: true },
      { id: 'annual_price', label: 'Annual Price (INR)', type: 'currency', required: true, showOnList: true },
      { id: 'max_users', label: 'User Seat Quota', type: 'number', required: true, showOnList: true },
      { id: 'included_modules_count', label: 'Included Modules Count', type: 'number', required: true, showOnList: true },
      { id: 'ai_credits', label: 'Monthly AI Message Credits', type: 'number', required: false, showOnList: false },
      { id: 'is_featured', label: 'Popular Badge', type: 'toggle', required: false, showOnList: true }
    ],
    defaultSummaryWidgets: [
      { id: 'sw_active_plans', label: 'Active Plan Tiers', type: 'count', field: 'plan_name', aggregation: 'count', enabled: true, color: '#0d9488' },
      { id: 'sw_avg_plan_price', label: 'Avg Tier Price', type: 'currency', field: 'monthly_price', aggregation: 'avg', enabled: true, color: '#3b82f6' }
    ],
    defaultColumns: [
      { id: 'plan_name', fieldKey: 'plan_name', label: 'Plan Name', visible: true, width: '180px' },
      { id: 'monthly_price', fieldKey: 'monthly_price', label: 'Monthly Price', visible: true, width: '140px' },
      { id: 'annual_price', fieldKey: 'annual_price', label: 'Annual Price', visible: true, width: '140px' },
      { id: 'max_users', fieldKey: 'max_users', label: 'Seats', visible: true, width: '100px' }
    ]
  },
  {
    id: 'sa_company_kyc',
    label: 'Company Onboarding & KYC Model',
    category: 'Super Admin Internal',
    description: 'Tenant registration schemas, GST/CIN verification, and compliance tiers',
    icon: '🏢',
    configurable: true,
    status: 'Configured',
    primaryEntity: 'company_profile',
    capabilities: {
      forms: true,
      summary: true,
      searchFilters: true,
      listView: true,
      views: true
    },
    defaultFields: [
      { id: 'legal_name', label: 'Registered Business Name', type: 'text', required: true, showOnList: true },
      { id: 'brand_name', label: 'Trade / Brand Name', type: 'text', required: true, showOnList: true },
      { id: 'gstin', label: 'GSTIN Number', type: 'text', required: false, showOnList: true },
      { id: 'cin_number', label: 'CIN / Registration No', type: 'text', required: false, showOnList: true },
      { id: 'industry_sector', label: 'Industry Sector', type: 'dropdown', required: true, showOnList: true, options: ['Software & IT', 'Retail & Ecommerce', 'Manufacturing', 'Healthcare', 'Finance', 'Logistics', 'Real Estate', 'Other'] },
      { id: 'kyc_status', label: 'KYC Audit Status', type: 'status', required: true, showOnList: true, options: ['Verified', 'Pending Verification', 'Rejected', 'Exempt'] },
      { id: 'primary_email', label: 'Admin Official Email', type: 'email', required: true, showOnList: true }
    ],
    defaultSummaryWidgets: [
      { id: 'sw_total_tenants', label: 'Registered Companies', type: 'count', field: 'legal_name', aggregation: 'count', enabled: true, color: '#06b6d4' },
      { id: 'sw_kyc_verified', label: 'KYC Verified Tenants', type: 'count', field: 'kyc_status', filterValue: 'Verified', aggregation: 'count', enabled: true, color: '#10b981' }
    ],
    defaultColumns: [
      { id: 'legal_name', fieldKey: 'legal_name', label: 'Company', visible: true, width: '220px' },
      { id: 'industry_sector', fieldKey: 'industry_sector', label: 'Industry', visible: true, width: '160px' },
      { id: 'gstin', fieldKey: 'gstin', label: 'GSTIN', visible: true, width: '150px' },
      { id: 'kyc_status', fieldKey: 'kyc_status', label: 'KYC Status', visible: true, width: '140px' }
    ]
  },
  {
    id: 'sa_telephony_gateway',
    label: 'Cloud PBX & Telephony Model',
    category: 'Super Admin Internal',
    description: 'SIP trunks, DID number pools, telephony bridge & audio recording retention',
    icon: '📞',
    configurable: true,
    status: 'Configured',
    primaryEntity: 'telephony_gateway',
    capabilities: {
      forms: true,
      summary: true,
      searchFilters: true,
      listView: true,
      views: true
    },
    defaultFields: [
      { id: 'trunk_name', label: 'SIP Trunk Name', type: 'text', required: true, showOnList: true },
      { id: 'provider_type', label: 'Telephony Provider', type: 'dropdown', required: true, showOnList: true, options: ['Twilio Cloud', 'Exotel Gateway', 'Tata Tele PBX', 'Asterisk / FreePBX', 'Custom SIP'] },
      { id: 'sip_server_host', label: 'SIP Gateway Host', type: 'text', required: true, showOnList: true },
      { id: 'sip_port', label: 'SIP Port', type: 'number', required: true, showOnList: false },
      { id: 'channels_capacity', label: 'Concurrent Channels', type: 'number', required: true, showOnList: true },
      { id: 'recordings_retention_days', label: 'Recording Retention (Days)', type: 'number', required: false, showOnList: false },
      { id: 'gateway_status', label: 'Status', type: 'status', required: true, showOnList: true, options: ['Online', 'Degraded', 'Offline', 'Maintenance'] }
    ],
    defaultSummaryWidgets: [
      { id: 'sw_active_trunks', label: 'Active Trunks', type: 'count', field: 'gateway_status', filterValue: 'Online', aggregation: 'count', enabled: true, color: '#10b981' },
      { id: 'sw_total_channels', label: 'Concurrent Channels', type: 'number', field: 'channels_capacity', aggregation: 'sum', enabled: true, color: '#3b82f6' }
    ],
    defaultColumns: [
      { id: 'trunk_name', fieldKey: 'trunk_name', label: 'Trunk', visible: true, width: '180px' },
      { id: 'provider_type', fieldKey: 'provider_type', label: 'Provider', visible: true, width: '160px' },
      { id: 'channels_capacity', fieldKey: 'channels_capacity', label: 'Channels', visible: true, width: '120px' },
      { id: 'gateway_status', fieldKey: 'gateway_status', label: 'Status', visible: true, width: '120px' }
    ]
  },
  {
    id: 'sa_security_audit',
    label: 'System Audit & Security Model',
    category: 'Super Admin Internal',
    description: 'Platform event tracking, session logs, IP restrictions & anomaly alerts',
    icon: '🛡️',
    configurable: true,
    status: 'Configured',
    primaryEntity: 'audit_event',
    capabilities: {
      forms: true,
      summary: true,
      searchFilters: true,
      listView: true,
      views: true
    },
    defaultFields: [
      { id: 'event_action', label: 'Event Action', type: 'text', required: true, showOnList: true },
      { id: 'actor_email', label: 'Actor User / Superadmin', type: 'email', required: true, showOnList: true },
      { id: 'target_tenant', label: 'Target Company', type: 'text', required: false, showOnList: true },
      { id: 'severity_level', label: 'Severity', type: 'status', required: true, showOnList: true, options: ['Low', 'Medium', 'High', 'Critical'] },
      { id: 'ip_address', label: 'Client IP Address', type: 'text', required: true, showOnList: true },
      { id: 'timestamp', label: 'Timestamp', type: 'datetime', required: true, showOnList: true }
    ],
    defaultSummaryWidgets: [
      { id: 'sw_total_events', label: 'Total Events Logged', type: 'count', field: 'event_action', aggregation: 'count', enabled: true, color: '#6366f1' },
      { id: 'sw_critical_alerts', label: 'Critical Security Alerts', type: 'count', field: 'severity_level', filterValue: 'Critical', aggregation: 'count', enabled: true, color: '#ef4444' }
    ],
    defaultColumns: [
      { id: 'timestamp', fieldKey: 'timestamp', label: 'Timestamp', visible: true, width: '160px' },
      { id: 'event_action', fieldKey: 'event_action', label: 'Action', visible: true, width: '180px' },
      { id: 'actor_email', fieldKey: 'actor_email', label: 'Actor', visible: true, width: '200px' },
      { id: 'severity_level', fieldKey: 'severity_level', label: 'Severity', visible: true, width: '110px' },
      { id: 'ip_address', fieldKey: 'ip_address', label: 'IP Address', visible: true, width: '130px' }
    ]
  }
];

export default SUPER_ADMIN_MANIFEST;

