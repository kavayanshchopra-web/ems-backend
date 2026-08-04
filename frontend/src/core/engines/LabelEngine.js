/**
 * UNIVERSAL LABEL ENGINE
 * Dynamic Title, Header, Badge, Section & Localization Generator for EMS Modules
 */

export class LabelEngine {
  /**
   * Get formatted module title
   * @param {Object} moduleConfig 
   * @returns {string}
   */
  static getModuleTitle(moduleConfig) {
    if (!moduleConfig) return 'Module Roster';
    return moduleConfig.moduleTitle || moduleConfig.name || 'EMS Roster';
  }

  /**
   * Get formatted module subtitle / description
   * @param {Object} moduleConfig 
   * @returns {string}
   */
  static getModuleSubtitle(moduleConfig) {
    if (!moduleConfig) return 'Manage module records and pipeline stages.';
    return moduleConfig.moduleSubtitle || moduleConfig.description || 'Record management & workflow roster.';
  }

  /**
   * Get singular entity name (e.g., "Candidate", "Deal", "Employee", "Invoice")
   * @param {Object} moduleConfig 
   * @returns {string}
   */
  static getEntityName(moduleConfig) {
    if (!moduleConfig) return 'Record';
    if (moduleConfig.entityName) {
      return moduleConfig.entityName.replace(/ Directory$/i, '').trim();
    }
    const title = this.getModuleTitle(moduleConfig);
    return title.replace(/ Directory$/i, '').replace(/s$/i, '').replace(/ATS$/i, 'Candidate').trim();
  }

  /**
   * Get plural entity name (e.g., "Candidates", "Deals", "Employees", "Invoices")
   * @param {Object} moduleConfig 
   * @returns {string}
   */
  static getEntityNamePlural(moduleConfig) {
    if (!moduleConfig) return 'Records';
    if (moduleConfig.entityNamePlural) return moduleConfig.entityNamePlural;
    const singular = this.getEntityName(moduleConfig);
    return `${singular}s`;
  }

  /**
   * Get count badge string (e.g., "42 Candidates", "15 Deals")
   * @param {Object} moduleConfig 
   * @param {number} count 
   * @returns {string}
   */
  static getEntityCountBadge(moduleConfig, count = 0) {
    const entityName = count === 1 ? this.getEntityName(moduleConfig) : this.getEntityNamePlural(moduleConfig);
    return `${count} ${entityName}`;
  }

  /**
   * Get action modal title (e.g., "Add New Candidate", "Edit Deal Profile")
   * @param {Object} moduleConfig 
   * @param {string} actionType 'create' | 'edit' | 'archive' | 'view'
   * @param {string} recordName Optional target record display name
   * @returns {string}
   */
  static getModalTitle(moduleConfig, actionType = 'create', recordName = '') {
    const entityName = this.getEntityName(moduleConfig);
    switch (actionType) {
      case 'create':
        return `Add New ${entityName}`;
      case 'edit':
        return recordName ? `Edit ${entityName}: ${recordName}` : `Edit ${entityName} Profile`;
      case 'archive':
        return `Archived ${this.getEntityNamePlural(moduleConfig)}`;
      case 'view':
      default:
        return recordName ? `${entityName} Details: ${recordName}` : `${entityName} Profile`;
    }
  }

  /**
   * Get action modal subtitle
   * @param {Object} moduleConfig 
   * @param {string} actionType 
   * @returns {string}
   */
  static getModalSubtitle(moduleConfig, actionType = 'create') {
    const entityName = this.getEntityName(moduleConfig);
    const plural = this.getEntityNamePlural(moduleConfig);
    switch (actionType) {
      case 'create':
        return `Register a new ${entityName.toLowerCase()} record into the pipeline.`;
      case 'edit':
        return `Update profile details and properties for this ${entityName.toLowerCase()}.`;
      case 'archive':
        return `View soft-deleted ${plural.toLowerCase()} records in the Recycle Bin.`;
      case 'view':
      default:
        return `Detailed application record and properties for this ${entityName.toLowerCase()}.`;
    }
  }

  /**
   * Get empty state title & description
   * @param {Object} moduleConfig 
   * @param {boolean} isFilterActive 
   * @param {string} searchQuery 
   * @returns {{ title: string, description: string }}
   */
  static getEmptyStateText(moduleConfig, isFilterActive = false, searchQuery = '') {
    const entityName = this.getEntityName(moduleConfig);
    const plural = this.getEntityNamePlural(moduleConfig);

    if (searchQuery.trim()) {
      return {
        title: `No ${plural.toLowerCase()} match search`,
        description: `No ${plural.toLowerCase()} record matches "${searchQuery.trim()}".`
      };
    }

    if (isFilterActive) {
      return {
        title: `No ${plural.toLowerCase()} match filter`,
        description: `No ${plural.toLowerCase()} records match active filter selection.`
      };
    }

    return {
      title: `No ${plural.toLowerCase()} in roster`,
      description: `Click "+ Add ${entityName}" to register a new record.`
    };
  }

  /**
   * Get badge color variant for stage status
   * @param {string} stageStatus 
   * @returns {'success' | 'warning' | 'info' | 'neutral' | 'danger'}
   */
  /**
   * Get dynamic color style for any dropdown value (role, status, department, designation, custom dropdown)
   * @param {string} val 
   * @param {Object} moduleConfig 
   * @returns {{ bg: string, color: string, border: string }}
   */
  static getOptionStyle(val, moduleConfig = null) {
    if (!val) return { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' };
    const str = String(val).trim();
    const lower = str.toLowerCase();

    // Custom tenant option colors
    if (moduleConfig?.lookupColors?.[str]) {
      const hex = moduleConfig.lookupColors[str];
      return { bg: `${hex}1f`, color: hex, border: `${hex}4d` };
    }

    // Color maps for common enterprise roles, departments, statuses
    if (lower.includes('admin') || lower.includes('owner') || lower.includes('super')) {
      return { bg: 'rgba(139, 92, 246, 0.12)', color: '#7c3aed', border: 'rgba(139, 92, 246, 0.3)' };
    }
    if (lower.includes('manager') || lower.includes('lead') || lower.includes('head')) {
      return { bg: 'rgba(59, 130, 246, 0.12)', color: '#2563eb', border: 'rgba(59, 130, 246, 0.3)' };
    }
    if (lower.includes('sales') || lower.includes('agent') || lower.includes('executive')) {
      return { bg: 'rgba(14, 165, 233, 0.12)', color: '#0284c7', border: 'rgba(14, 165, 233, 0.3)' };
    }
    if (lower.includes('engineer') || lower.includes('developer') || lower.includes('tech') || lower.includes('software')) {
      return { bg: 'rgba(99, 102, 241, 0.12)', color: '#4f46e5', border: 'rgba(99, 102, 241, 0.3)' };
    }
    if (lower.includes('hr') || lower.includes('recruiter') || lower.includes('people')) {
      return { bg: 'rgba(236, 72, 153, 0.12)', color: '#db2777', border: 'rgba(236, 72, 153, 0.3)' };
    }
    if (lower.includes('marketing')) {
      return { bg: 'rgba(244, 63, 94, 0.12)', color: '#e11d48', border: 'rgba(244, 63, 94, 0.3)' };
    }
    if (lower.includes('active') || lower.includes('hired') || lower.includes('won') || lower.includes('approve') || lower.includes('full-time')) {
      return { bg: 'rgba(16, 185, 129, 0.12)', color: '#059669', border: 'rgba(16, 185, 129, 0.3)' };
    }
    if (lower.includes('leave') || lower.includes('probation') || lower.includes('pending') || lower.includes('hold') || lower.includes('part-time')) {
      return { bg: 'rgba(245, 158, 11, 0.12)', color: '#d97706', border: 'rgba(245, 158, 11, 0.3)' };
    }
    if (lower.includes('terminate') || lower.includes('lost') || lower.includes('reject') || lower.includes('suspend')) {
      return { bg: 'rgba(239, 68, 68, 0.12)', color: '#dc2626', border: 'rgba(239, 68, 68, 0.3)' };
    }

    // Dynamic hash color generator for custom options
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash) % 360;
    return {
      bg: `hsla(${hue}, 75%, 94%, 1)`,
      color: `hsla(${hue}, 85%, 28%, 1)`,
      border: `hsla(${hue}, 65%, 75%, 1)`
    };
  }
}
