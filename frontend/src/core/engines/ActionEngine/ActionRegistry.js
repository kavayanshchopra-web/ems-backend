/**
 * UNIVERSAL ACTION REGISTRY
 * Registry for Built-in & Extension Actions
 */

class ActionRegistry {
  constructor() {
    this._actions = new Map();
    this._initDefaultActions();
  }

  _initDefaultActions() {
    this.registerAction('CREATE', {
      key: 'CREATE',
      label: 'Add Record',
      icon: 'Plus',
      requiresConfirmation: false
    });

    this.registerAction('EDIT', {
      key: 'EDIT',
      label: 'Edit Record',
      icon: 'Edit2',
      requiresConfirmation: false
    });

    this.registerAction('ARCHIVE', {
      key: 'ARCHIVE',
      label: 'Archive Record',
      icon: 'Archive',
      requiresConfirmation: true,
      confirmMessage: 'Archive this record? It will be moved to the Recycle Bin.'
    });

    this.registerAction('RESTORE', {
      key: 'RESTORE',
      label: 'Restore Record',
      icon: 'RotateCcw',
      requiresConfirmation: false
    });

    this.registerAction('DELETE', {
      key: 'DELETE',
      label: 'Permanently Delete',
      icon: 'Trash2',
      requiresConfirmation: true,
      confirmMessage: 'PERMANENTLY DELETE this record? This action cannot be undone.'
    });

    this.registerAction('VIEW', {
      key: 'VIEW',
      label: 'View Profile',
      icon: 'Eye',
      requiresConfirmation: false
    });
  }

  registerAction(key, actionDef) {
    if (!key || !actionDef) return;
    this._actions.set(key, Object.freeze({ ...actionDef }));
  }

  getAction(key) {
    return this._actions.get(key) || null;
  }
}

export const actionRegistry = new ActionRegistry();
