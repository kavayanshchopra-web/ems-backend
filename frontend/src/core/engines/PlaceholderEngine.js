/**
 * UNIVERSAL PLACEHOLDER ENGINE
 * Dynamic Placeholder & Search Prompt Generator for EMS Modules
 */

import { LabelEngine } from './LabelEngine';

export class PlaceholderEngine {
  /**
   * Get contextual input placeholder for a field schema
   * @param {Object} field 
   * @returns {string}
   */
  static getFieldPlaceholder(field) {
    if (!field) return '';
    if (field.placeholder) return field.placeholder;

    const label = field.label || 'Value';

    switch (field.type) {
      case 'email':
        return `e.g. user@example.com`;
      case 'phone':
        return `e.g. +91 9876543210`;
      case 'currency':
        return `e.g. 50000`;
      case 'number':
        return `0.00`;
      case 'date':
        return `Select date...`;
      case 'datetime':
        return `Select date & time...`;
      case 'dropdown':
      case 'select':
        return `Select ${label}...`;
      case 'file':
      case 'image':
        return `Upload ${label} or enter URL...`;
      case 'textarea':
        return `Enter detailed ${label.toLowerCase()} description...`;
      case 'text':
      default:
        return `Enter ${label.toLowerCase()}...`;
    }
  }

  /**
   * Get main search input placeholder (e.g., "Search candidates...", "Search deals...", "Search employees...")
   * @param {Object} moduleConfig 
   * @returns {string}
   */
  static getSearchPlaceholder(moduleConfig) {
    const plural = LabelEngine.getEntityNamePlural(moduleConfig);
    return `Search ${plural.toLowerCase()}...`;
  }

  /**
   * Get filter input placeholder (e.g., "Filter by Department...")
   * @param {Object} field 
   * @returns {string}
   */
  static getFilterPlaceholder(field) {
    const label = field?.label || 'field';
    return `Filter by ${label}...`;
  }

  /**
   * Get filter option default string (e.g., "All Stages", "All Positions", "All Departments")
   * @param {Object} field 
   * @returns {string}
   */
  static getFilterAllOptionLabel(field) {
    const label = field?.label || 'Option';
    return `All ${label}s`;
  }
}
