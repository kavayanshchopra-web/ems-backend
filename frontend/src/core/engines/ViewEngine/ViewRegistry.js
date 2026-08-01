/**
 * UNIVERSAL VIEW REGISTRY
 * Registry for Supported View Modes & Custom View Extensions
 */

import { LayoutGrid, List, Calendar, Clock, Grid } from 'lucide-react';

class ViewRegistry {
  constructor() {
    this._views = new Map();
    this._initDefaultViews();
  }

  _initDefaultViews() {
    this.registerView('kanban', {
      key: 'kanban',
      label: 'Kanban',
      icon: LayoutGrid,
      order: 1
    });

    this.registerView('list', {
      key: 'list',
      label: 'List',
      icon: List,
      order: 2
    });

    this.registerView('grid', {
      key: 'grid',
      label: 'Grid Cards',
      icon: Grid,
      order: 3
    });

    this.registerView('calendar', {
      key: 'calendar',
      label: 'Calendar',
      icon: Calendar,
      order: 4
    });

    this.registerView('timeline', {
      key: 'timeline',
      label: 'Timeline',
      icon: Clock,
      order: 5
    });
  }

  registerView(key, viewDef) {
    if (!key || !viewDef) return;
    this._views.set(key, Object.freeze({ ...viewDef }));
  }

  getView(key) {
    return this._views.get(key) || null;
  }

  getAllViews() {
    return Array.from(this._views.values()).sort((a, b) => (a.order || 0) - (b.order || 0));
  }
}

export const viewRegistry = new ViewRegistry();
