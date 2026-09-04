/**
 * UNIVERSAL SUMMARY ENGINE
 * Dynamic KPI Metric Aggregator & Aggregation Engine
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

export class SummaryEngine {
  /**
   * Compute aggregate count value for a widget definition
   * @param {Object} widget 
   * @param {Array<Object>} records 
   * @param {Array<Object>} activePipelineStages 
   * @returns {number}
   */
  static computeWidgetValue(widget, records = [], activePipelineStages = []) {
    if (!widget || !Array.isArray(records)) return 0;
    const safeRecords = records.filter(r => !!r);

    // 1. TOTAL COUNT
    if (widget.metricType === 'TOTAL') {
      return safeRecords.length;
    }

    // 2. FILTER COUNT BY FIELD / VALUE (e.g. ghlContactId, source: 'WhatsApp Inbound')
    if (widget.metricType === 'FILTER_COUNT') {
      if (widget.filterValue) {
        const targetVal = String(widget.filterValue).toLowerCase();
        return safeRecords.filter(r => {
          if (!r) return false;
          const fieldVal = String(r[widget.filterField] || '').toLowerCase();
          return fieldVal === targetVal || fieldVal.includes(targetVal);
        }).length;
      } else if (widget.filterField) {
        return safeRecords.filter(r => {
          if (!r) return false;
          return Boolean(r[widget.filterField]);
        }).length;
      }
    }

    // 3. SEMANTIC METRIC (e.g. INTERVIEW, OFFER, HIRED, WON, LOST)
    if (widget.metricType === 'SEMANTIC' && widget.semanticGroup) {
      const targetSemantic = String(widget.semanticGroup).toLowerCase();

      return safeRecords.filter(r => {
        if (!r) return false;
        const recStatus = getValString(r.status || r.stage).toLowerCase();

        return (activePipelineStages || []).filter(s => !!s).some(s => {
          const sName = getValString(s.name).toLowerCase();
          const sType = getValString(s.semanticType).toLowerCase();
          const sId = getValString(s.id).toLowerCase();

          return (
            (sType === targetSemantic || sId === targetSemantic) &&
            (recStatus === sName || recStatus === sId || recStatus === targetSemantic)
          );
        });
      }).length;
    }

    // 4. STAGE COUNT BY NAME
    if (widget.metricType === 'STAGE_COUNT' && widget.stageName) {
      const targetStage = String(widget.stageName).toLowerCase();
      return safeRecords.filter(r => {
        if (!r) return false;
        const recStatus = getValString(r.status || r.stage).toLowerCase();
        return recStatus === targetStage || recStatus.includes(targetStage) || targetStage.includes(recStatus);
      }).length;
    }

    return safeRecords.length;
  }
}
