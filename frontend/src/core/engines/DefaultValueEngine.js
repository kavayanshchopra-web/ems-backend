/**
 * DEFAULT VALUE ENGINE
 * Universal Initializer for Schema-Driven Fields
 */

export class DefaultValueEngine {
  /**
   * Get initial value for a given field schema
   * @param {Object} field 
   * @returns {any}
   */
  static getDefaultValue(field) {
    if (!field) return '';

    if (field.defaultValue !== undefined && field.defaultValue !== null) {
      return field.defaultValue;
    }

    switch (field.type) {
      case 'checkbox':
      case 'boolean':
        return false;
      case 'number':
      case 'currency':
        return '';
      case 'multiselect':
      case 'relation':
        return [];
      case 'dropdown':
      case 'select':
      case 'radio':
      case 'text':
      case 'textarea':
      case 'email':
      case 'phone':
      case 'date':
      case 'datetime':
      case 'file':
      case 'image':
      case 'user_ref':
      default:
        return '';
    }
  }

  /**
   * Initialize candidate form state for an array of field schemas
   * @param {Array<Object>} fields 
   * @param {Object} existingData 
   * @returns {Object}
   */
  static initializeFormState(fields = [], existingData = {}) {
    const initialState = { ...(existingData || {}) };
    (fields || []).forEach(field => {
      if (!field) return;
      if (existingData[field.id] !== undefined && existingData[field.id] !== null) {
        initialState[field.id] = existingData[field.id];
      } else if (field.key && existingData[field.key] !== undefined && existingData[field.key] !== null) {
        initialState[field.id] = existingData[field.key];
      } else if (existingData.customFields && existingData.customFields[field.id] !== undefined) {
        initialState[field.id] = existingData.customFields[field.id];
      } else if (field.key && existingData.customFields && existingData.customFields[field.key] !== undefined) {
        initialState[field.id] = existingData.customFields[field.key];
      } else {
        initialState[field.id] = this.getDefaultValue(field);
      }
    });
    return initialState;
  }
}
