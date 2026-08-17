/**
 * UNIVERSAL WIDGET REGISTRY
 * Registry for Built-in & Custom Plugin Metric Widgets
 */

class WidgetRegistry {
  constructor() {
    this._widgets = new Map();
    this._initDefaultWidgets();
  }

  _initDefaultWidgets() {
    this.registerWidget('TOTAL', {
      key: 'TOTAL',
      label: 'Total Count',
      icon: '📊',
      defaultBg: 'rgba(13, 148, 136, 0.1)',
      defaultColor: '#0d9488'
    });

    this.registerWidget('SEMANTIC', {
      key: 'SEMANTIC',
      label: 'Semantic Metric',
      icon: '🎯',
      defaultBg: 'rgba(37, 99, 235, 0.1)',
      defaultColor: '#2563eb'
    });

    this.registerWidget('STAGE_COUNT', {
      key: 'STAGE_COUNT',
      label: 'Stage Count',
      icon: '📋',
      defaultBg: 'rgba(217, 119, 6, 0.1)',
      defaultColor: '#d97706'
    });
  }

  registerWidget(key, widgetDef) {
    if (!key || !widgetDef) return;
    this._widgets.set(key, Object.freeze({ ...widgetDef }));
  }

  getWidget(key) {
    return this._widgets.get(key) || null;
  }
}

export const widgetRegistry = new WidgetRegistry();
