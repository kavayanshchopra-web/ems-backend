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

    // 1. TOTAL COUNT
    if (widget.metricType === 'TOTAL') {
      return records.length;
    }

    // 2. SEMANTIC METRIC (e.g. INTERVIEW, OFFER, HIRED, WON, LOST)
    if (widget.metricType === 'SEMANTIC' && widget.semanticGroup) {
      const targetSemantic = String(widget.semanticGroup).toLowerCase();

      return records.filter(r => {
        const recStatus = getValString(r.status || r.stage).toLowerCase();

        return activePipelineStages.some(s => {
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

    // 3. STAGE COUNT BY NAME
    if (widget.metricType === 'STAGE_COUNT' && widget.stageName) {
      const targetStage = String(widget.stageName).toLowerCase();
      return records.filter(r => {
        const recStatus = getValString(r.status || r.stage).toLowerCase();
        return recStatus === targetStage;
      }).length;
    }

    return records.length;
  }
}
