/**
 * UNIVERSAL DYNAMIC DASHBOARD ENGINE (DUE)
 * Auto-discovering metrics, KPI aggregator, unified activity feed,
 * and category-wise analytics engine for Tenant & SuperAdmin Dashboards.
 */

import { masterModuleRegistry } from '../registry/MasterModuleRegistry';
import { FeatureProvisioningEngine } from './FeatureProvisioningEngine';
import { PermissionEngine } from './PermissionEngine/permissionEngine';
import { LabelEngine } from './LabelEngine';

class DynamicDashboardEngine {
  constructor() {
    this._listeners = new Set();
  }

  /**
   * Auto-discover all active modules for a tenant/user based on Provisioning + RBAC Permissions
   * @param {string|number} companyId 
   * @param {Object} authUser 
   * @returns {Array<Object>} List of authorized and enabled module manifests
   */
  discoverActiveDashboardModules(companyId, authUser) {
    const allManifests = masterModuleRegistry.getAllSystemManifests();
    if (!allManifests || !allManifests.length) return [];

    return allManifests.filter(manifest => {
      if (!manifest || !manifest.moduleId) return false;

      // 1. Check SuperAdmin Feature Provisioning Engine (Global + Tenant Overrides)
      const isProvisioned = FeatureProvisioningEngine.isModuleEnabledForTenant(companyId, manifest.moduleId);
      if (!isProvisioned) return false;

      // 2. Check User Role Permission (View Access)
      if (authUser && authUser.role !== 'superadmin') {
        const canView = PermissionEngine.can(authUser, manifest.moduleId, 'view', companyId);
        if (!canView) return false;
      }

      return true;
    });
  }

  /**
   * Filter records based on selected date range (e.g. today, yesterday, this_week, this_month, all_time)
   * @param {Array<Object>} records 
   * @param {string} timeRange 
   * @param {string} dateField 
   * @returns {Array<Object>} Filtered records
   */
  filterRecordsByTimeRange(records = [], timeRange = 'today', dateField = 'createdAt') {
    if (!Array.isArray(records) || records.length === 0) return [];
    if (timeRange === 'all_time') return records;

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);
    const endOfYesterday = new Date(startOfToday.getTime() - 1);
    const startOfWeek = new Date(startOfToday.getTime() - 6 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    return records.filter(item => {
      if (!item) return false;
      const rawDate = item[dateField] || item.date || item.timestamp || item.created_at || item.createdAt;
      if (!rawDate) return true; // Keep items with no explicit date in count if live

      let itemDate = null;
      if (rawDate?.toDate && typeof rawDate.toDate === 'function') {
        itemDate = rawDate.toDate();
      } else if (rawDate?.seconds) {
        itemDate = new Date(rawDate.seconds * 1000);
      } else {
        itemDate = new Date(rawDate);
      }

      if (isNaN(itemDate.getTime())) return true;

      if (timeRange === 'today') {
        return itemDate >= startOfToday;
      }
      if (timeRange === 'yesterday') {
        return itemDate >= startOfYesterday && itemDate <= endOfYesterday;
      }
      if (timeRange === 'this_week') {
        return itemDate >= startOfWeek;
      }
      if (timeRange === 'this_month') {
        return itemDate >= startOfMonth;
      }
      return true;
    });
  }

  /**
   * Compute dynamic metrics for a single module
   * @param {Object} manifest 
   * @param {Array<Object>} rawRecords 
   * @param {string} timeRange 
   * @param {string} activeCurrency 
   * @returns {Object} Metric bundle with total count, widgets, stage breakdown, and monetary sum
   */
  computeModuleMetrics(manifest, rawRecords = [], timeRange = 'today', activeCurrency = 'INR') {
    if (!manifest) return null;

    const moduleName = String(manifest.name || manifest.label || manifest.title || manifest.moduleId || 'Module');
    const moduleIcon = manifest.icon || '📊';
    const accentColor = manifest.accentColor || '#0d9488';

    const records = Array.isArray(rawRecords) ? rawRecords : [];
    const filteredRecords = this.filterRecordsByTimeRange(records, timeRange);
    const totalCount = records.length;
    const periodCount = filteredRecords.length;

    // Detect monetary fields (e.g. amount, salary, value, price, total)
    let totalMonetaryValue = 0;
    let hasMonetaryField = false;

    records.forEach(item => {
      if (!item || typeof item !== 'object') return;
      const monetaryVal = item?.amount ?? item?.deal_value ?? item?.dealValue ?? item?.baseSalary ?? item?.salary ?? item?.value ?? item?.cost ?? null;
      if (monetaryVal !== null && !isNaN(Number(monetaryVal))) {
        totalMonetaryValue += Number(monetaryVal);
        hasMonetaryField = true;
      }
    });

    // Compute Stage Breakdown
    const stageCounts = {};
    const stages = Array.isArray(manifest.defaultStages) ? manifest.defaultStages : [];
    stages.forEach(stg => {
      if (typeof stg === 'string') {
        stageCounts[stg.toUpperCase()] = 0;
      } else if (stg && typeof stg === 'object') {
        const key = String(stg.key || stg.id || stg.name || '').toUpperCase();
        if (key) stageCounts[key] = 0;
      }
    });

    records.forEach(item => {
      if (!item || typeof item !== 'object') return;
      const stgKey = String(item.status || item.stage || '').toUpperCase();
      if (stgKey && stageCounts[stgKey] !== undefined) {
        stageCounts[stgKey]++;
      } else if (stages.length > 0) {
        const found = stages.find(s => {
          if (!s) return false;
          if (typeof s === 'string') return s.toUpperCase() === stgKey;
          const sid = String(s.id || '').toUpperCase();
          const sKey = String(s.key || '').toUpperCase();
          const sem = String(s.semanticType || '').toUpperCase();
          return (sid && sid === stgKey) || (sKey && sKey === stgKey) || (sem && sem === stgKey);
        });
        if (found) {
          const foundKey = typeof found === 'string' ? found.toUpperCase() : String(found.key || found.id || found.name || '').toUpperCase();
          if (foundKey && stageCounts[foundKey] !== undefined) {
            stageCounts[foundKey]++;
          }
        }
      }
    });

    // Compute widgets from manifest or auto-generate fallback widgets
    let widgets = [];
    if (Array.isArray(manifest.defaultSummaryWidgets) && manifest.defaultSummaryWidgets.length > 0) {
      widgets = manifest.defaultSummaryWidgets.map((widget, idx) => {
        if (!widget || typeof widget !== 'object') return null;
        let val = 0;
        let trend = 'Live Sync';

        const widgetId = String(widget.id || `widget_${idx}`);
        const metricType = String(widget.metricType || '').toUpperCase();
        if (metricType === 'TOTAL' || widgetId.toLowerCase().startsWith('total')) {
          val = totalCount;
          trend = periodCount > 0 ? `+${periodCount} in ${timeRange}` : 'Updated';
        } else {
          const key = String(widget.semanticGroup || widget.id || '').toUpperCase();
          val = (key && stageCounts[key] !== undefined) ? stageCounts[key] : 0;
        }

        return {
          id: widgetId,
          title: String(widget.label || widget.title || moduleName),
          value: val,
          subtitle: moduleName,
          icon: widget.icon || moduleIcon,
          color: widget.color || accentColor,
          bg: widget.bg || 'rgba(13, 148, 136, 0.1)',
          trend,
          trendDirection: val > 0 ? 'up' : 'neutral',
          moduleId: manifest.moduleId,
          order: widget.order || (idx + 1)
        };
      }).filter(Boolean);
    }

    if (widgets.length === 0) {
      // Auto fallback widget
      widgets.push({
        id: `${manifest.moduleId}_total`,
        title: `TOTAL ${moduleName.toUpperCase()}`,
        value: totalCount,
        subtitle: `${totalCount} Registered Records`,
        icon: moduleIcon,
        color: accentColor,
        bg: 'rgba(13, 148, 136, 0.1)',
        trend: periodCount > 0 ? `+${periodCount} in ${timeRange}` : 'Live Roster',
        trendDirection: totalCount > 0 ? 'up' : 'neutral',
        moduleId: manifest.moduleId,
        order: 1
      });
    }

    return {
      moduleId: manifest.moduleId,
      name: moduleName,
      icon: moduleIcon,
      category: manifest.category || 'General',
      accentColor: accentColor,
      totalCount,
      periodCount,
      hasMonetaryField,
      totalMonetaryValue,
      formattedMonetaryValue: hasMonetaryField ? LabelEngine.formatCurrencyVal(totalMonetaryValue, activeCurrency) : null,
      stageCounts,
      stages,
      widgets,
      sampleRecords: records.slice(0, 5)
    };
  }

  /**
   * Generate Full Executive Dashboard Bundle for Tenant Company
   * @param {string|number} companyId 
   * @param {Object} authUser 
   * @param {Object} dataMap Map of moduleId -> records array
   * @param {string} timeRange 
   * @param {string} activeCurrency 
   * @returns {Object} Complete structured dashboard data
   */
  getTenantDashboardOverview(companyId, authUser, dataMap = {}, timeRange = 'today', activeCurrency = 'INR') {
    const activeManifests = this.discoverActiveDashboardModules(companyId, authUser);
    
    const moduleMetricMap = {};
    const allWidgets = [];
    const categoryGroups = {
      hr_people: { title: '👥 People & HR Management', icon: 'Users', color: '#0d9488', modules: [], totalRecords: 0 },
      finance_payroll: { title: '💰 Finance & Payroll', icon: 'CreditCard', color: '#059669', modules: [], totalRecords: 0 },
      crm_sales: { title: '💬 Sales & Communications', icon: 'MessageSquare', color: '#2563eb', modules: [], totalRecords: 0 },
      operations: { title: '📋 Operations & Facilities', icon: 'Briefcase', color: '#d97706', modules: [], totalRecords: 0 },
      settings_general: { title: '⚙️ Workspace & Settings', icon: 'Settings', color: '#64748b', modules: [], totalRecords: 0 }
    };

    activeManifests.forEach(manifest => {
      if (!manifest || !manifest.moduleId) return;
      const records = dataMap[manifest.moduleId] || [];
      const computed = this.computeModuleMetrics(manifest, records, timeRange, activeCurrency);
      if (!computed) return;

      moduleMetricMap[manifest.moduleId] = computed;
      allWidgets.push(...computed.widgets);

      // Assign to category
      const catKey = String(manifest.category || '').toLowerCase();
      if (catKey.includes('hr') || catKey.includes('people') || catKey.includes('recruitment') || catKey.includes('employee') || catKey.includes('attendance') || catKey.includes('shift') || catKey.includes('leave')) {
        categoryGroups.hr_people.modules.push(computed);
        categoryGroups.hr_people.totalRecords += computed.totalCount;
      } else if (catKey.includes('payroll') || catKey.includes('finance') || catKey.includes('expense') || catKey.includes('tax') || catKey.includes('loan') || catKey.includes('billing')) {
        categoryGroups.finance_payroll.modules.push(computed);
        categoryGroups.finance_payroll.totalRecords += computed.totalCount;
      } else if (catKey.includes('crm') || catKey.includes('sales') || catKey.includes('deal') || catKey.includes('chat') || catKey.includes('telecalling') || catKey.includes('whatsapp')) {
        categoryGroups.crm_sales.modules.push(computed);
        categoryGroups.crm_sales.totalRecords += computed.totalCount;
      } else if (catKey.includes('operation') || catKey.includes('task') || catKey.includes('asset') || catKey.includes('kiosk') || catKey.includes('notice') || catKey.includes('holiday')) {
        categoryGroups.operations.modules.push(computed);
        categoryGroups.operations.totalRecords += computed.totalCount;
      } else {
        categoryGroups.settings_general.modules.push(computed);
        categoryGroups.settings_general.totalRecords += computed.totalCount;
      }
    });

    // Generate Unified Recent Activity Stream
    const recentActivityStream = this.getUnifiedActivityStream(activeManifests, dataMap);

    return {
      activeModuleCount: activeManifests.length,
      allWidgets,
      categoryGroups,
      moduleMetricMap,
      recentActivityStream
    };
  }

  /**
   * Unified Activity Stream across all active modules
   * @param {Array<Object>} manifests 
   * @param {Object} dataMap 
   * @returns {Array<Object>} Chronological activity events
   */
  getUnifiedActivityStream(manifests = [], dataMap = {}) {
    const events = [];

    manifests.forEach(manifest => {
      if (!manifest || !manifest.moduleId) return;
      const records = dataMap[manifest.moduleId] || [];
      if (!Array.isArray(records)) return;

      const moduleName = String(manifest.name || manifest.label || manifest.title || manifest.moduleId || 'Module');
      const moduleIcon = manifest.icon || '📌';
      const accentColor = manifest.accentColor || '#0d9488';

      records.slice(0, 10).forEach((item, idx) => {
        if (!item || typeof item !== 'object') return;

        const title = item.name || item.title || item.subject || item.candidateName || item.employeeName || item.dealName || `${moduleName} #${idx + 1}`;
        const subtitle = item.status || item.stage || item.department || item.designation || item.description || 'Record active';
        const timestamp = item.createdAt || item.updatedAt || item.date || item.timestamp || null;

        events.push({
          id: `${manifest.moduleId}_${item.id || idx}`,
          moduleId: manifest.moduleId,
          moduleName: moduleName,
          icon: moduleIcon,
          accentColor: accentColor,
          title: String(title),
          subtitle: String(subtitle),
          status: String(item.status || item.stage || 'Active'),
          timestamp
        });
      });
    });

    return events.slice(0, 15);
  }

  /**
   * SuperAdmin Global Cross-Tenant Module Adoption Analytics
   * @param {Array<Object>} companies 
   * @param {Array<Object>} users 
   * @param {Object} tenantDataMap 
   * @returns {Object} Global adoption metrics
   */
  getSuperAdminDashboardMetrics(companies = [], users = [], tenantDataMap = {}) {
    const allManifests = masterModuleRegistry.getAllSystemManifests();
    const totalCompanies = Array.isArray(companies) ? companies.length : 0;
    const totalUsers = Array.isArray(users) ? users.length : 0;

    const moduleAdoption = (Array.isArray(allManifests) ? allManifests : []).map(manifest => {
      if (!manifest) return null;
      const moduleId = manifest.moduleId || 'unknown';
      const isGloballyDisabled = FeatureProvisioningEngine?.isModuleGloballyDisabled ? FeatureProvisioningEngine.isModuleGloballyDisabled(moduleId) : false;
      const moduleName = String(manifest.name || manifest.label || manifest.title || moduleId);
      
      // Count companies using this module
      let activeCompaniesCount = 0;
      if (Array.isArray(companies)) {
        companies.forEach(comp => {
          if (!comp) return;
          const compId = comp.id || comp.tenant_id;
          if (FeatureProvisioningEngine?.isModuleEnabledForTenant ? FeatureProvisioningEngine.isModuleEnabledForTenant(compId, moduleId) : true) {
            activeCompaniesCount++;
          }
        });
      }

      return {
        moduleId: moduleId,
        name: moduleName,
        icon: manifest.icon || '📦',
        category: manifest.category || 'General',
        accentColor: manifest.accentColor || '#0d9488',
        isGloballyDisabled,
        activeCompaniesCount,
        totalCompanies,
        adoptionPercentage: totalCompanies > 0 ? Math.round((activeCompaniesCount / totalCompanies) * 100) : 100
      };
    }).filter(Boolean);

    return {
      totalCompanies,
      totalUsers,
      totalModules: allManifests.length,
      moduleAdoption
    };
  }
}

export const dynamicDashboardEngine = new DynamicDashboardEngine();
export default dynamicDashboardEngine;
