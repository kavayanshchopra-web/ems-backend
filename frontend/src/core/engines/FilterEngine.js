/**
 * UNIVERSAL FILTER ENGINE
 * Dynamic Schema-Driven Multi-Field Filter Engine
 * Supports Odoo & GoHighLevel style Conditional Rule Filtering (AND / OR, Field-Type Operators)
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
    if (!moduleConfig) return [];
    const fields = Array.isArray(moduleConfig.fields) 
      ? moduleConfig.fields.filter(f => !f.archived && !f.deleted && (f.filterable === true || (f.filterable !== false && (f.systemField || ['dropdown', 'radio', 'multiselect', 'status', 'tag', 'date'].includes(f.type)))))
      : [];

    const hasCreatedAt = fields.some(f => ['createdAt', 'created_at', 'callTime', 'date', 'creationDate'].includes(f.id));
    if (!hasCreatedAt) {
      return [
        ...fields,
        {
          id: 'createdAt',
          label: 'Created Date',
          type: 'date',
          systemField: true,
          filterable: true,
          sortable: true
        }
      ];
    }
    return fields;
  }

  /**
   * Get all active fields available for the Advanced Condition Builder
   * @param {Object} moduleConfig 
   * @returns {Array<Object>}
   */
  static getAllConditionFields(moduleConfig) {
    if (!moduleConfig) return [];
    const fields = Array.isArray(moduleConfig.fields) 
      ? moduleConfig.fields.filter(f => !f.archived && !f.deleted && f.type !== 'hidden')
      : [];

    const hasCreatedAt = fields.some(f => ['createdAt', 'created_at', 'callTime', 'date', 'creationDate'].includes(f.id));
    if (!hasCreatedAt) {
      return [
        ...fields,
        {
          id: 'createdAt',
          label: 'Created Date',
          type: 'date',
          systemField: true,
          filterable: true,
          sortable: true
        }
      ];
    }
    return fields;
  }

  /**
   * Dynamically return supported filter operators based on field data type (Odoo & GHL style)
   * @param {Object} field 
   * @returns {Array<Object>}
   */
  static getOperatorsForField(field) {
    if (!field) return [];
    const type = String(field.type || 'text').toLowerCase().trim();
    const id = String(field.id || '').toLowerCase().trim();

    // 1. Phone fields
    if (type === 'phone' || id.includes('phone') || id.includes('mobile')) {
      return [
        { id: 'has_value', label: 'Is Available (Not Empty)' },
        { id: 'is_empty', label: 'Is Not Available (Empty)' },
        { id: 'contains', label: 'Contains' },
        { id: 'not_contains', label: 'Does Not Contain' },
        { id: 'starts_with', label: 'Starts With' },
        { id: 'equals', label: 'Equals Exactly' }
      ];
    }

    // 2. Email fields
    if (type === 'email' || id.includes('email')) {
      return [
        { id: 'has_value', label: 'Is Available (Not Empty)' },
        { id: 'is_empty', label: 'Is Not Available (Empty)' },
        { id: 'contains', label: 'Contains' },
        { id: 'not_contains', label: 'Does Not Contain' },
        { id: 'ends_with', label: 'Ends With (e.g. @gmail.com)' },
        { id: 'equals', label: 'Equals Exactly' }
      ];
    }

    // 3. Dropdown / Status / Stage / Select fields
    if (type === 'dropdown' || type === 'select' || type === 'status' || type === 'radio' || field.optionsSource || Array.isArray(field.options)) {
      return [
        { id: 'equals', label: 'Is' },
        { id: 'not_equals', label: 'Is Not' },
        { id: 'in', label: 'Is Any Of' },
        { id: 'has_value', label: 'Is Assigned / Set' },
        { id: 'is_empty', label: 'Is Unassigned / Empty' }
      ];
    }

    // 4. Tags / Multi-Select
    if (type === 'tag' || type === 'tags' || type === 'multiselect' || id === 'tags') {
      return [
        { id: 'has_tag', label: 'Has Tag' },
        { id: 'not_has_tag', label: 'Does Not Have Tag' },
        { id: 'has_value', label: 'Has Any Tag' },
        { id: 'is_empty', label: 'Has No Tags (Empty)' }
      ];
    }

    // 5. Numeric & Currency fields
    if (type === 'number' || type === 'currency' || type === 'integer' || type === 'decimal') {
      return [
        { id: 'equals', label: 'Equals (=)' },
        { id: 'not_equals', label: 'Not Equals (!=)' },
        { id: 'greater_than', label: 'Greater Than (>)' },
        { id: 'less_than', label: 'Less Than (<)' },
        { id: 'has_value', label: 'Has Non-Zero Value' },
        { id: 'is_empty', label: 'Is Zero or Empty' }
      ];
    }

    // 6. Date & Time fields
    if (type === 'date' || type === 'datetime' || id.includes('date') || id.includes('time') || id === 'createdat') {
      return [
        { id: 'today', label: 'Today' },
        { id: 'yesterday', label: 'Yesterday' },
        { id: 'last_7_days', label: 'Last 7 Days' },
        { id: 'this_month', label: 'This Month' },
        { id: 'exact_date', label: 'On Specific Date' },
        { id: 'before', label: 'Before Date' },
        { id: 'after', label: 'After Date' },
        { id: 'has_value', label: 'Date Is Set' },
        { id: 'is_empty', label: 'Date Is Empty' }
      ];
    }

    // 7. Default Text / Textarea
    return [
      { id: 'contains', label: 'Contains' },
      { id: 'not_contains', label: 'Does Not Contain' },
      { id: 'equals', label: 'Equals Exactly' },
      { id: 'not_equals', label: 'Does Not Equal' },
      { id: 'starts_with', label: 'Starts With' },
      { id: 'has_value', label: 'Is Available (Not Empty)' },
      { id: 'is_empty', label: 'Is Empty / Missing' }
    ];
  }

  /**
   * Check if any filter (legacy or advanced condition) is active
   * @param {Object} filterValues 
   * @returns {boolean}
   */
  static isFilterActive(filterValues = {}) {
    if (!filterValues || typeof filterValues !== 'object') return false;

    // Check advanced conditions list
    if (Array.isArray(filterValues._conditions) && filterValues._conditions.length > 0) {
      return true;
    }

    // Check legacy key-value filters
    return Object.entries(filterValues).some(([k, v]) => {
      if (k.startsWith('_')) return false;
      return Boolean(v && String(v).trim() && v !== 'all');
    });
  }

  /**
   * Safely evaluate a single conditional rule on a record
   * @param {Object} record 
   * @param {Object} condition { fieldId, operator, value }
   * @param {Object} fieldDef 
   * @returns {boolean}
   */
  static evaluateCondition(record, condition, fieldDef = {}) {
    if (!record || !condition || !condition.fieldId || !condition.operator) return true;

    const { fieldId, operator, value } = condition;

    // Extract raw record value with defensive aliases
    let rawVal = record[fieldId];
    if (rawVal === undefined && record.customFields && record.customFields[fieldId] !== undefined) {
      rawVal = record.customFields[fieldId];
    }
    if (rawVal === undefined) {
      if (fieldId === 'phone') rawVal = record.phoneNumber || record.mobile || record.rawPhone;
      else if (fieldId === 'email') rawVal = record.emailAddress;
      else if (fieldId === 'status') rawVal = record.stage || record.pipelineStage;
      else if (fieldId === 'assignedTo') rawVal = record.agentName || record.employee || record.assigned_to;
      else if (fieldId === 'createdAt' || fieldId === 'created_at' || fieldId === 'creationDate' || fieldId === 'createdDate') {
        rawVal = record._createdAt || record.createdAt || record.created_at || record.callTime || record.timestamp || record.date;
      }
    }

    const valStr = getValString(rawVal).toLowerCase().trim();
    const condValStr = String(value || '').toLowerCase().trim();

    switch (operator) {
      case 'has_value': {
        if (fieldDef.type === 'phone' || fieldId.includes('phone')) {
          const digits = String(rawVal || '').replace(/\D/g, '');
          return digits.length >= 7;
        }
        if (fieldDef.type === 'number' || fieldDef.type === 'currency') {
          return Number(rawVal) > 0;
        }
        return valStr.length > 0 && valStr !== 'unassigned' && valStr !== 'none' && valStr !== 'null';
      }

      case 'is_empty': {
        if (fieldDef.type === 'phone' || fieldId.includes('phone')) {
          const digits = String(rawVal || '').replace(/\D/g, '');
          return digits.length < 7;
        }
        if (fieldDef.type === 'number' || fieldDef.type === 'currency') {
          return !rawVal || Number(rawVal) === 0;
        }
        return valStr.length === 0 || valStr === 'unassigned' || valStr === 'none' || valStr === 'null';
      }

      case 'contains':
        return valStr.includes(condValStr);

      case 'not_contains':
        return !valStr.includes(condValStr);

      case 'starts_with':
        return valStr.startsWith(condValStr);

      case 'ends_with':
        return valStr.endsWith(condValStr);

      case 'equals':
        return valStr === condValStr;

      case 'not_equals':
        return valStr !== condValStr;

      case 'in': {
        const targets = Array.isArray(value) 
          ? value.map(v => String(v).toLowerCase().trim())
          : String(value || '').split(',').map(s => s.trim().toLowerCase());
        return targets.includes(valStr);
      }

      case 'has_tag': {
        const rawTags = record.tags || record.tag || '';
        const tagsArr = Array.isArray(rawTags) 
          ? rawTags.map(t => getValString(t).toLowerCase().trim())
          : String(rawTags).split(',').map(s => s.trim().toLowerCase());
        return tagsArr.some(t => t.includes(condValStr));
      }

      case 'not_has_tag': {
        const rawTags = record.tags || record.tag || '';
        const tagsArr = Array.isArray(rawTags) 
          ? rawTags.map(t => getValString(t).toLowerCase().trim())
          : String(rawTags).split(',').map(s => s.trim().toLowerCase());
        return !tagsArr.some(t => t.includes(condValStr));
      }

      case 'greater_than':
        return Number(rawVal || 0) > Number(value || 0);

      case 'less_than':
        return Number(rawVal || 0) < Number(value || 0);

      case 'today':
      case 'yesterday':
      case 'last_7_days':
      case 'this_month':
      case 'exact_date':
      case 'before':
      case 'after': {
        let itemTime = 0;
        if (typeof rawVal === 'number' && rawVal > 0) {
          itemTime = rawVal < 1e11 ? rawVal * 1000 : rawVal;
        } else if (rawVal) {
          const parsed = Date.parse(rawVal);
          if (!isNaN(parsed) && parsed > 0) itemTime = parsed;
        }
        if (!itemTime && record._createdAt) {
          const n = Number(record._createdAt);
          itemTime = n < 1e11 ? n * 1000 : n;
        }
        if (!itemTime && record.createdAt) {
          const parsed = Date.parse(record.createdAt);
          if (!isNaN(parsed) && parsed > 0) itemTime = parsed;
        }
        if (!itemTime && record.created_at) {
          const parsed = Date.parse(record.created_at);
          if (!isNaN(parsed) && parsed > 0) itemTime = parsed;
        }
        if (!itemTime && record.callTime) {
          const parsed = Date.parse(record.callTime);
          if (!isNaN(parsed) && parsed > 0) itemTime = parsed;
        }
        if (!itemTime && record.timestamp) {
          const parsed = typeof record.timestamp === 'number' ? (record.timestamp < 1e11 ? record.timestamp * 1000 : record.timestamp) : Date.parse(record.timestamp);
          if (!isNaN(parsed) && parsed > 0) itemTime = parsed;
        }
        if (itemTime <= 0) return false;

        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const startOfYesterday = startOfToday - (24 * 60 * 60 * 1000);
        const sevenDaysAgo = startOfToday - (6 * 24 * 60 * 60 * 1000);
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

        if (operator === 'today') return itemTime >= startOfToday && itemTime < (startOfToday + 86400000);
        if (operator === 'yesterday') return itemTime >= startOfYesterday && itemTime < startOfToday;
        if (operator === 'last_7_days') return itemTime >= sevenDaysAgo;
        if (operator === 'this_month') return itemTime >= startOfMonth;

        if (operator === 'exact_date' && condValStr) {
          const itemDateStr = new Date(itemTime).toISOString().slice(0, 10);
          return itemDateStr === condValStr;
        }
        if (operator === 'before' && condValStr) {
          return itemTime < new Date(condValStr).getTime();
        }
        if (operator === 'after' && condValStr) {
          return itemTime > new Date(condValStr).getTime() + 86400000;
        }
        return true;
      }

      default:
        return valStr.includes(condValStr);
    }
  }

  /**
   * Filter records based on active filter selections, advanced condition rules, and moduleConfig fields
   * @param {Array<Object>} records 
   * @param {Object} filterValues { fieldId: filterValue, _conditions: Array, _combinator: 'AND'|'OR' }
   * @param {Object} moduleConfig 
   * @returns {Array<Object>} Filtered records
   */
  static filterRecords(records = [], filterValues = {}, moduleConfig = {}) {
    if (!Array.isArray(records) || records.length === 0) return [];
    const safeRecords = records.filter(r => !!r);
    if (!this.isFilterActive(filterValues)) return safeRecords;

    const fieldsMap = new Map();
    if (Array.isArray(moduleConfig.fields)) {
      moduleConfig.fields.forEach(f => {
        if (f && f.id) fieldsMap.set(f.id, f);
      });
    }

    const conditions = Array.isArray(filterValues._conditions)
      ? filterValues._conditions.filter(c => c && c.fieldId && c.operator)
      : [];
    const combinator = String(filterValues._combinator || 'AND').toUpperCase();

    const filterableFields = this.getFilterableFields(moduleConfig);

    return safeRecords.filter(record => {
      if (!record) return false;

      // 1. Evaluate Advanced Conditions (Odoo / GHL style)
      if (conditions.length > 0) {
        let conditionMatched;
        if (combinator === 'OR') {
          conditionMatched = conditions.some(cond => {
            const fDef = fieldsMap.get(cond.fieldId) || { id: cond.fieldId, type: 'text' };
            return this.evaluateCondition(record, cond, fDef);
          });
        } else {
          // Default: AND logic (All must match)
          conditionMatched = conditions.every(cond => {
            const fDef = fieldsMap.get(cond.fieldId) || { id: cond.fieldId, type: 'text' };
            return this.evaluateCondition(record, cond, fDef);
          });
        }
        if (!conditionMatched) return false;
      }

      // 2. Evaluate Legacy Quick Filter Key-Values (for complete backward compatibility)
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

        if (field.type === 'date' || field.type === 'datetime' || field.id === 'callTime') {
          const itemTime = Number(record._createdAt || (record.callTime ? new Date(record.callTime).getTime() : 0) || (record.created_at ? new Date(record.created_at).getTime() : 0)) || 0;
          if (itemTime > 0) {
            const now = new Date();
            const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
            const startOfYesterday = startOfToday - (24 * 60 * 60 * 1000);
            const sevenDaysAgo = startOfToday - (6 * 24 * 60 * 60 * 1000);
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

            if (filterValStr === 'today') {
              return itemTime >= startOfToday && itemTime < (startOfToday + 24 * 60 * 60 * 1000);
            }
            if (filterValStr === 'yesterday') {
              return itemTime >= startOfYesterday && itemTime < startOfToday;
            }
            if (filterValStr === 'last 7 days' || filterValStr === 'last_7_days') {
              return itemTime >= sevenDaysAgo;
            }
            if (filterValStr === 'this month' || filterValStr === 'this_month') {
              return itemTime >= startOfMonth;
            }
            const itemDate = new Date(itemTime);
            const y = itemDate.getFullYear();
            const m = String(itemDate.getMonth() + 1).padStart(2, '0');
            const d = String(itemDate.getDate()).padStart(2, '0');
            const itemDateStr = `${y}-${m}-${d}`;
            return itemDateStr === filterValStr || itemDateStr.includes(filterValStr) || filterValStr.includes(itemDateStr);
          }
        }

        if (field.type === 'dropdown' || field.type === 'select' || field.type === 'radio') {
          return recordValStr === filterValStr;
        }

        return recordValStr.includes(filterValStr);
      });
    });
  }
}
