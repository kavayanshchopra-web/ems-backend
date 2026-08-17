/**
 * GLOBAL SCHEMA & MANIFEST VALIDATOR
 * Enterprise Integrity Validator for EMS Module Schemas
 */

export class GlobalSchemaValidator {
  /**
   * Validate a complete module manifest
   * @param {Object} manifest 
   * @returns {{ valid: boolean, errors: Array<string> }}
   */
  static validateManifest(manifest) {
    const errors = [];

    if (!manifest) {
      return { valid: false, errors: ['Manifest object is null or undefined.'] };
    }

    if (!manifest.moduleId || typeof manifest.moduleId !== 'string') {
      errors.push('Manifest must contain a valid string "moduleId".');
    } else if (!/^[a-z0-9_]+$/.test(manifest.moduleId)) {
      errors.push('moduleId must contain only lowercase letters, numbers, and underscores.');
    }

    if (!manifest.name) errors.push('Manifest must specify a module "name".');
    if (!manifest.version) errors.push('Manifest must specify a "version".');

    if (!Array.isArray(manifest.defaultFields)) {
      errors.push('Manifest defaultFields must be an array.');
    } else {
      manifest.defaultFields.forEach((field, idx) => {
        const fieldRes = this.validateField(field);
        if (!fieldRes.valid) {
          fieldRes.errors.forEach(err => errors.push(`Field[${idx} "${field.id || 'unknown'}"]: ${err}`));
        }
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate a single Field Definition
   * @param {Object} field 
   * @returns {{ valid: boolean, errors: Array<string> }}
   */
  static validateField(field) {
    const errors = [];

    if (!field || typeof field !== 'object') {
      return { valid: false, errors: ['Field configuration is invalid.'] };
    }

    if (!field.id || typeof field.id !== 'string') {
      errors.push('Field must possess a string "id".');
    }

    if (!field.label || typeof field.label !== 'string') {
      errors.push('Field must possess a string "label".');
    }

    const validTypes = ['text', 'number', 'email', 'phone', 'date', 'dropdown', 'radio', 'checkbox', 'textarea', 'file', 'currency', 'user_ref', 'relation'];
    if (!field.type || !validTypes.includes(field.type)) {
      errors.push(`Field type "${field.type}" is not supported. Supported: ${validTypes.join(', ')}.`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}
