/**
 * UNIVERSAL SEARCH ENGINE
 * Enterprise Multi-Field Search, Ranking, Matcher & Highlighting Engine
 */

/**
 * Defensive string extractor helper
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

export class SearchEngine {
  /**
   * Get all searchable field definitions from module configuration
   * @param {Object} moduleConfig 
   * @returns {Array<Object>}
   */
  static getSearchableFields(moduleConfig) {
    if (!moduleConfig || !Array.isArray(moduleConfig.fields)) return [];
    return moduleConfig.fields.filter(f => f.searchable !== false);
  }

  /**
   * Filter records based on searchQuery and moduleConfig searchable fields
   * @param {Array<Object>} records 
   * @param {string} searchQuery 
   * @param {Object} moduleConfig 
   * @param {Object} options { matchMode: 'CONTAINS' | 'EXACT' | 'STARTS_WITH', minChars: 1 }
   * @returns {Array<Object>} Filtered and relevance-ranked records
   */
  static search(records = [], searchQuery = '', moduleConfig = {}, options = {}) {
    if (!Array.isArray(records) || records.length === 0) return [];
    
    const q = searchQuery ? String(searchQuery).toLowerCase().trim() : '';
    const minChars = options.minChars || moduleConfig.searchConfig?.minChars || 1;

    if (!q || q.length < minChars) return records;

    const searchableFields = this.getSearchableFields(moduleConfig);
    const matchMode = options.matchMode || moduleConfig.searchConfig?.matchMode || 'CONTAINS';

    const scoredResults = [];

    records.forEach(record => {
      let maxScore = 0;
      const matchedFieldIds = [];

      searchableFields.forEach(field => {
        let rawFieldValue = '';

        if (record[field.id] !== undefined && record[field.id] !== null) {
          rawFieldValue = getValString(record[field.id]);
        } else if (record.customFields && record.customFields[field.id] !== undefined) {
          rawFieldValue = getValString(record.customFields[field.id]);
        }

        if (!rawFieldValue) return;

        const valLower = rawFieldValue.toLowerCase();
        let matches = false;
        let score = 0;

        if (matchMode === 'EXACT') {
          matches = valLower === q;
          score = matches ? 100 : 0;
        } else if (matchMode === 'STARTS_WITH') {
          matches = valLower.startsWith(q);
          score = matches ? 80 : 0;
        } else {
          // CONTAINS / FUZZY
          matches = valLower.includes(q);
          if (matches) {
            score = 50;
            // Primary field bonus (name, title, displayField)
            if (field.id === 'name' || field.id === 'title' || field.id === moduleConfig.displayField) {
              score += 30;
            }
            if (valLower.startsWith(q)) {
              score += 15;
            }
          }
        }

        if (matches) {
          matchedFieldIds.push(field.id);
          if (score > maxScore) maxScore = score;
        }
      });

      if (maxScore > 0) {
        scoredResults.push({
          record,
          score: maxScore,
          matchedFieldIds
        });
      }
    });

    // Sort by relevance score descending
    scoredResults.sort((a, b) => b.score - a.score);

    return scoredResults.map(res => res.record);
  }

  /**
   * Highlight search query within a text string
   * @param {string} text 
   * @param {string} query 
   * @returns {{ before: string, match: string, after: string } | string}
   */
  static getHighlightSnippet(text, query) {
    const str = getValString(text);
    if (!str || !query) return str;

    const lowerStr = str.toLowerCase();
    const lowerQ = String(query).toLowerCase().trim();
    const idx = lowerStr.indexOf(lowerQ);

    if (idx === -1) return str;

    return {
      before: str.substring(0, idx),
      match: str.substring(idx, idx + lowerQ.length),
      after: str.substring(idx + lowerQ.length)
    };
  }
}
