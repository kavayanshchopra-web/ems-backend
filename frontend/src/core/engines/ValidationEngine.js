/**
 * VALIDATION ENGINE
 * Universal Validator for Schema-Driven Fields
 */

export class ValidationEngine {
  /**
   * Validate a single field value against its schema metadata rules
   * @param {Object} field 
   * @param {any} value 
   * @returns {string|null} Error message or null
   */
  static validateField(field, value) {
    if (!field || field.hidden || field.archived || field.deleted) return null;

    const valStr = value !== null && value !== undefined ? String(value).trim() : '';

    // 1. Required Check
    if (field.required) {
      if (field.type === 'checkbox' || field.type === 'boolean' || field.type === 'toggle') {
        if (!value) return `${field.label || 'Field'} is required`;
      } else if (field.type === 'multiselect' || Array.isArray(value)) {
        if (!Array.isArray(value) || value.length === 0) return `${field.label || 'Field'} is required`;
      } else if (!valStr) {
        return `${field.label || 'Field'} is required`;
      }
    }

    if (!valStr && !Array.isArray(value)) return null;

    // 2. Minimum Length & Maximum Length Validation
    const minLen = field.minLength || field.minLen;
    const maxLen = field.maxLength || field.maxLen;

    if (minLen !== undefined && minLen !== null && valStr.length < Number(minLen)) {
      return `${field.label} must be at least ${minLen} characters`;
    }

    if (maxLen !== undefined && maxLen !== null && valStr.length > Number(maxLen)) {
      return `${field.label} cannot exceed ${maxLen} characters`;
    }

    // 3. Number / Currency Min & Max
    if (field.type === 'number' || field.type === 'currency' || field.type === 'rating') {
      if (isNaN(Number(valStr))) {
        return `${field.label} must be a valid number`;
      }
      const numVal = Number(valStr);
      if (field.min !== undefined && field.min !== null && numVal < Number(field.min)) {
        return `${field.label} minimum value is ${field.min}`;
      }
      if (field.max !== undefined && field.max !== null && numVal > Number(field.max)) {
        return `${field.label} maximum value is ${field.max}`;
      }
    }

    // 4. Type-specific Format Validation
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

    if (field.type === 'url') {
      const urlRegex = /^(https?:\/\/)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/;
      if (!urlRegex.test(valStr)) {
        return 'Enter a valid URL address';
      }
    }

    // 5. Custom Regex Pattern
    const pattern = field.pattern || field.regex;
    if (pattern) {
      try {
        const reg = new RegExp(pattern);
        if (!reg.test(valStr)) {
          return field.customErrorMessage || `${field.label} format is invalid`;
        }
      } catch (e) {
        // Invalid regex string in metadata
      }
    }

    // 6. File Allowed Extensions Check
    if ((field.type === 'file' || field.type === 'image') && field.allowedExtensions && valStr) {
      const ext = valStr.split('.').pop()?.toLowerCase();
      const allowed = field.allowedExtensions.split(',').map(s => s.trim().toLowerCase().replace(/^\./, ''));
      if (ext && allowed.length > 0 && !allowed.includes(ext)) {
        return `File type .${ext} is not allowed. Supported: ${allowed.join(', ')}`;
      }
    }

    // 7. Custom Schema Validation Array
    if (Array.isArray(field.validations)) {
      for (const rule of field.validations) {
        if (rule.ruleType === 'regex' && rule.params) {
          try {
            const reg = new RegExp(rule.params);
            if (!reg.test(valStr)) {
              return rule.errorMessage || `${field.label} is invalid`;
            }
          } catch (e) {}
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
