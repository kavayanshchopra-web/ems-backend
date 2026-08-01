/**
 * UNIVERSAL FILTER ENGINE
 * Dynamic Schema-Driven Multi-Field Filter Engine
 */

/**
 * Defensive string extractor helper
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

export class FilterEngine {
  /**
   * Get all filterable field definitions from module configuration
   * @param {Object} moduleConfig 
   * @returns {Array<Object>}
   */
  static getFilterableFields(moduleConfig) {
    if (!moduleConfig || !Array.isArray(moduleConfig.fields)) return [];
    return moduleConfig.fields.filter(f => f.filterable !== false);
  }

  /**
   * Check if any filter is active
   * @param {Object} filterValues 
   * @returns {boolean}
   */
  static isFilterActive(filterValues = {}) {
    if (!filterValues || typeof filterValues !== 'object') return false;
    return Object.values(filterValues).some(v => Boolean(v && String(v).trim() && v !== 'all'));
  }

  /**
   * Filter records based on active filter selections and moduleConfig fields
   * @param {Array<Object>} records 
   * @param {Object} filterValues { fieldId: filterValue }
   * @param {Object} moduleConfig 
   * @returns {Array<Object>} Filtered records
   */
  static filterRecords(records = [], filterValues = {}, moduleConfig = {}) {
    if (!Array.isArray(records) || records.length === 0) return [];
    if (!this.isFilterActive(filterValues)) return records;

    const filterableFields = this.getFilterableFields(moduleConfig);

    return records.filter(record => {
      return filterableFields.every(field => {
        const filterVal = filterValues[field.id];
        if (!filterVal || filterVal === 'all') return true;

        let recordVal = '';
        if (record[field.id] !== undefined && record[field.id] !== null) {
          recordVal = getValString(record[field.id]);
        } else if (record.customFields && record.customFields[field.id] !== undefined) {
          recordVal = getValString(record.customFields[field.id]);
        }

        const filterValStr = String(filterVal).toLowerCase().trim();
        const recordValStr = String(recordVal).toLowerCase().trim();

        if (field.type === 'dropdown' || field.type === 'select' || field.type === 'radio') {
          return recordValStr === filterValStr;
        }

        return recordValStr.includes(filterValStr);
      });
    });
  }
}
