/**
 * UNIVERSAL METADATA-DRIVEN GROUP ENGINE SERVICE
 * Grouping Service & Data Transformation Pipeline for EMS Modules
 */

const getValString = (val, fallback = '') => {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'string' || typeof val === 'number') return String(val);
  if (typeof val === 'object') {
    if (typeof val.name === 'string') return val.name;
    if (typeof val.title === 'string') return val.title;
    if (typeof val.label === 'string') return val.label;
    if (typeof val.value === 'string') return val.value;
  }
  return fallback;
};

export class GroupEngine {
  /**
   * Resolve all groupable fields from moduleConfig
   */
  static getGroupableFields(moduleConfig = {}) {
    if (!moduleConfig || !Array.isArray(moduleConfig.fields)) return [];
    return moduleConfig.fields.filter(
      f => !f.archived && !f.deleted && (f.groupable === true || (f.groupable !== false && (['dropdown', 'select', 'radio', 'stage', 'status', 'lookup', 'date'].includes(f.type) || f.systemField)))
    );
  }

  /**
   * Safely extract human-readable group value for a given field
   */
  static getRecordGroupValue(record = {}, fieldId = '', moduleConfig = {}) {
    if (!record || !fieldId) return 'Unassigned';

    let rawVal = record[fieldId];
    if (rawVal === undefined || rawVal === null || rawVal === '') {
      if (record.customFields && record.customFields[fieldId] !== undefined) {
        rawVal = record.customFields[fieldId];
      }
    }

    if (rawVal === undefined || rawVal === null || rawVal === '') {
      return 'Unassigned / Not Specified';
    }

    const fieldDef = (moduleConfig.fields || []).find(f => f.id === fieldId || f.key === fieldId);
    
    // Date Field Formatting (e.g. Month Year: "August 2026")
    if (fieldDef && (fieldDef.type === 'date' || fieldId.toLowerCase().includes('date') || fieldId === 'createdAt')) {
      try {
        const d = new Date(rawVal);
        if (!isNaN(d.getTime())) {
          return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        }
      } catch (e) {
        // Fallback to string representation
      }
    }

    const strVal = getValString(rawVal).trim();
    return strVal || 'Unassigned / Not Specified';
  }

  /**
   * Group records array by groupByFieldId
   * Returns array of group objects: [{ groupId, groupTitle, count, records }]
   */
  static groupRecords(records = [], groupByFieldId = '', moduleConfig = {}, options = {}) {
    if (!Array.isArray(records) || records.length === 0) return [];
    if (!groupByFieldId) {
      return [{
        groupId: 'all',
        groupTitle: 'All Records',
        count: records.length,
        records: records
      }];
    }

    const groupsMap = new Map();
    const groupSortDir = options.groupSortDir || 'asc'; // 'asc' | 'desc' | 'count_desc'

    records.forEach(record => {
      const groupTitle = this.getRecordGroupValue(record, groupByFieldId, moduleConfig);
      const groupId = groupTitle.toLowerCase().replace(/\s+/g, '_');

      if (!groupsMap.has(groupId)) {
        groupsMap.set(groupId, {
          groupId,
          groupTitle,
          count: 0,
          records: []
        });
      }

      const grp = groupsMap.get(groupId);
      grp.records.push(record);
      grp.count += 1;
    });

    const groupsArray = Array.from(groupsMap.values());

    // Sort Groups
    groupsArray.sort((a, b) => {
      // Always put "Unassigned" at the very end
      const isAUnassigned = a.groupTitle.startsWith('Unassigned');
      const isBUnassigned = b.groupTitle.startsWith('Unassigned');
      if (isAUnassigned && !isBUnassigned) return 1;
      if (!isAUnassigned && isBUnassigned) return -1;

      if (groupSortDir === 'count_desc') {
        return b.count - a.count;
      }

      if (groupSortDir === 'desc') {
        return b.groupTitle.localeCompare(a.groupTitle);
      }

      return a.groupTitle.localeCompare(b.groupTitle);
    });

    return groupsArray;
  }
}
