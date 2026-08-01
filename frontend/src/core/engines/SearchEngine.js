/**
 * UNIVERSAL SEARCH ENGINE
 * Enterprise Multi-Field Search, Ranking, Matcher & Highlighting Engine
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
  static getSearchableFields(moduleConfig) {
    if (!moduleConfig || !Array.isArray(moduleConfig.fields)) return [];
    return moduleConfig.fields.filter(f => f.searchable !== false);
  }

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

      // Check Candidate ID directly (e.g. ATS-001)
      const recIdStr = getValString(record.id).toLowerCase();
      if (recIdStr && recIdStr.includes(q)) {
        maxScore = 100;
        matchedFieldIds.push('id');
      }

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
          matches = valLower.includes(q);
          if (matches) {
            score = 50;
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

    scoredResults.sort((a, b) => b.score - a.score);

    return scoredResults.map(res => res.record);
  }

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
