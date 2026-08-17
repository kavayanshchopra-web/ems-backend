/**
 * UNIVERSAL VIEW REGISTRY
 * Registry for Supported View Modes & Custom View Extensions
 */

import { LayoutGrid, List, Calendar, Clock, Image, GitFork, BarChartHorizontal, MapPin } from 'lucide-react';

class ViewRegistry {
  constructor() {
    this._views = new Map();
    this._initDefaultViews();
  }

  _initDefaultViews() {
    this.registerView('list', {
      key: 'list',
      label: 'List',
      icon: List,
      order: 1
    });

    this.registerView('kanban', {
      key: 'kanban',
      label: 'Kanban',
      icon: LayoutGrid,
      order: 2
    });

    this.registerView('calendar', {
      key: 'calendar',
      label: 'Calendar',
      icon: Calendar,
      order: 3
    });

    this.registerView('timeline', {
      key: 'timeline',
      label: 'Timeline',
      icon: Clock,
      order: 4
    });

    this.registerView('gallery', {
      key: 'gallery',
      label: 'Gallery',
      icon: Image,
      order: 5
    });

    this.registerView('tree', {
      key: 'tree',
      label: 'Tree / Org',
      icon: GitFork,
      order: 6
    });

    this.registerView('gantt', {
      key: 'gantt',
      label: 'Gantt',
      icon: BarChartHorizontal,
      order: 7
    });

    this.registerView('map', {
      key: 'map',
      label: 'Map',
      icon: MapPin,
      order: 8
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
