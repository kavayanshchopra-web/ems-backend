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
    if (moduleConfig.entityName) return moduleConfig.entityName;
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
  static getBadgeVariant(stageStatus) {
    if (!stageStatus) return 'neutral';
    const lower = String(stageStatus).toLowerCase();
    if (lower.includes('hire') || lower.includes('won') || lower.includes('approve') || lower.includes('disbursed') || lower.includes('active')) return 'success';
    if (lower.includes('offer') || lower.includes('proposal') || lower.includes('negotiat') || lower.includes('leave')) return 'warning';
    if (lower.includes('interview') || lower.includes('lead') || lower.includes('qualif')) return 'info';
    if (lower.includes('lost') || lower.includes('reject') || lower.includes('terminate')) return 'danger';
    return 'neutral';
  }
}
