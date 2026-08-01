/**
 * VALIDATION ENGINE
 * Universal Validator for Schema-Driven Fields
 */

export class ValidationEngine {
  /**
   * Validate a single field value against its schema rules
   * @param {Object} field 
   * @param {any} value 
   * @returns {string|null} Error message or null
   */
  static validateField(field, value) {
    if (!field) return null;

    const valStr = value !== null && value !== undefined ? String(value).trim() : '';

    // 1. Required Check
    if (field.required) {
      if (field.type === 'checkbox' || field.type === 'boolean') {
        if (!value) return `${field.label || 'Field'} is required`;
      } else if (!valStr) {
        return `${field.label || 'Field'} is required`;
      }
    }

    if (!valStr) return null;

    // 2. Type-specific Validation
    if (field.type === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(valStr)) {
        return 'Enter a valid email address';
      }
    }

    if (field.type === 'phone') {
      const phoneRegex = /^[+]*[(]?[0-9]{1,4}[)]?[-\s./0-9]*$/;
      if (valStr.length < 6 || !phoneRegex.test(valStr)) {
        return 'Enter a valid phone number';
      }
    }

    if (field.type === 'number' || field.type === 'currency') {
      if (isNaN(Number(valStr))) {
        return `${field.label} must be a valid number`;
      }
    }

    // 3. Custom Schema Validation Rules
    if (Array.isArray(field.validations)) {
      for (const rule of field.validations) {
        if (rule.ruleType === 'regex' && rule.params) {
          const reg = new RegExp(rule.params);
          if (!reg.test(valStr)) {
            return rule.errorMessage || `${field.label} is invalid`;
          }
        }
      }
    }

    return null;
  }

  /**
   * Validate an entire form data object against an array of field schemas
   * @param {Array<Object>} fields 
   * @param {Object} formData 
   * @returns {{ valid: boolean, errors: Object }}
   */
  static validateForm(fields = [], formData = {}) {
    const errors = {};
    fields.forEach(field => {
      const err = this.validateField(field, formData[field.id]);
      if (err) {
        errors[field.id] = err;
      }
    });

    return {
      valid: Object.keys(errors).length === 0,
      errors
    };
  }
}
