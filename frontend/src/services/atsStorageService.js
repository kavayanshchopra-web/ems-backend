/**
 * Global EMS Storage Abstraction Service — Recruitment ATS Module
 * Decouples React UI components from direct window.localStorage calls.
 * Easily swappable to Firestore / Firebase Adapter in future backend phase.
 */

import { loadAtsModuleConfig, saveAtsModuleConfig } from '../config/atsModuleConfig';

const POSITIONS_STORAGE_KEY_PREFIX = 'omnilflow_recruitment_positions_';
const CANDIDATES_STORAGE_KEY_PREFIX = 'omnilflow_recruitment_candidates_';

export const DEFAULT_RECRUITMENT_POSITIONS = [];

export const DEFAULT_RECRUITMENT_CANDIDATES = [];

export function formatCustomSequencePattern(pattern = 'ATS-001', seqNumber = 1) {
  if (!pattern || !pattern.trim()) return `ATS-${String(seqNumber).padStart(3, '0')}`;
  
  const str = pattern.trim();
  const match = str.match(/^(.*?)(\d+)$/);
  if (match) {
    const prefixPart = match[1];
    const numPart = match[2];
    const padding = numPart.length;
    const baseVal = parseInt(numPart, 10);
    const currentVal = baseVal + (seqNumber - 1);
    const formattedNum = String(currentVal).padStart(padding, '0');
    return `${prefixPart}${formattedNum}`;
  }

  return `${str}-${String(seqNumber).padStart(3, '0')}`;
}

export function formatCandidateId(id, idx = 0, moduleConfig = null) {
  const idCfg = moduleConfig?.idConfig || {
    prefix: 'ATS',
    pattern: 'ATS-001',
    nextSeq: 1
  };

  const pattern = idCfg.pattern || `${idCfg.prefix || 'ATS'}-001`;

  if (!id) return formatCustomSequencePattern(pattern, idx + 1);
  const strId = String(id).trim();

  // Preserve existing formatted string IDs (e.g. ATS-001, CAND/2026/001)
  if (strId.startsWith('ATS') || strId.startsWith('CAND') || strId.includes('/') || strId.includes('.')) {
    return strId;
  }

  // Normalize raw numeric/timestamp IDs into custom pattern
  const digits = strId.replace(/[^0-9]/g, '');
  if (digits) {
    const num = parseInt(digits.slice(-3), 10) || (idx + 1);
    return formatCustomSequencePattern(pattern, num);
  }
  return formatCustomSequencePattern(pattern, idx + 1);
}

export function getCategoryPrefix(categoryName, customPrefixes = null) {
  if (customPrefixes && customPrefixes[categoryName]) {
    return String(customPrefixes[categoryName]).toUpperCase().trim();
  }
  if (!categoryName) return 'LAP';
  const catLower = String(categoryName).toLowerCase();
  if (catLower.includes('laptop')) return 'LAP';
  if (catLower.includes('mobile') || catLower.includes('phone')) return 'MOB';
  if (catLower.includes('monitor') || catLower.includes('screen')) return 'MON';
  if (catLower.includes('peripheral') || catLower.includes('mouse') || catLower.includes('keyboard')) return 'PER';
  if (catLower.includes('office') || catLower.includes('equipment')) return 'OFF';
  if (catLower.includes('vehicle') || catLower.includes('car')) return 'VEH';
  return String(categoryName).slice(0, 3).toUpperCase();
}

export function getNextCategoryAssetTag(categoryName, existingRecords = [], customPrefixes = null) {
  const catPrefix = getCategoryPrefix(categoryName, customPrefixes);
  const targetPrefix = `AST-${catPrefix}-`;
  
  let maxSeq = 0;
  if (Array.isArray(existingRecords)) {
    existingRecords.forEach(rec => {
      const tagStr = String(rec.tag || rec.id || '');
      if (tagStr.startsWith(targetPrefix)) {
        const parts = tagStr.split('-');
        const seqNum = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(seqNum) && seqNum > maxSeq) {
          maxSeq = seqNum;
        }
      }
    });
  }

  const nextSeq = maxSeq + 1;
  return `AST-${catPrefix}-${String(nextSeq).padStart(3, '0')}`;
}

export function getNextSequentialId(companyId, moduleId = 'recruitment_ats', moduleConfig = null, existingRecords = []) {
  const tenantKey = companyId ? String(companyId).replace(/[^a-zA-Z0-9_-]/g, '_') : 'default';
  
  const idCfg = moduleConfig?.idConfig || loadAtsModuleConfig(companyId)?.idConfig || {
    prefix: moduleId === 'employees' ? 'EMP' : (moduleId === 'crm_leads' ? 'LEAD' : 'ATS'),
    pattern: moduleId === 'employees' ? 'EMP-0001' : (moduleId === 'crm_leads' ? 'LEAD-0001' : 'ATS-001'),
    nextSeq: 1
  };

  const pattern = idCfg.pattern || `${idCfg.prefix || 'ID'}-0001`;
  const storageKey = `omnilflow_seq_${tenantKey}_${moduleId}`;

  let maxSeq = parseInt(localStorage.getItem(storageKey) || '0', 10);

  if (Array.isArray(existingRecords) && existingRecords.length > 0) {
    existingRecords.forEach(r => {
      if (r && r.id) {
        const match = String(r.id).match(/\d+/);
        if (match) {
          const num = parseInt(match[0], 10);
          if (num > maxSeq) maxSeq = num;
        }
      }
    });
  }

  const nextSeq = maxSeq + 1;
  try {
    localStorage.setItem(storageKey, String(nextSeq));
    return formatCustomSequencePattern(pattern, nextSeq);
  } catch (e) {
    return formatCustomSequencePattern(pattern, nextSeq);
  }
}

export const atsStorageService = {
  // Module Configuration
  getModuleConfig(companyId) {
    return loadAtsModuleConfig(companyId);
  },

  saveModuleConfig(companyId, config) {
    saveAtsModuleConfig(companyId, config);
  },

  // Recruitment Positions Entity Storage
  getRecruitmentPositions(companyId) {
    const tenantKey = companyId ? String(companyId).replace(/[^a-zA-Z0-9_-]/g, '_') : 'default';
    const key = `${POSITIONS_STORAGE_KEY_PREFIX}${tenantKey}`;
    try {
      const saved = localStorage.getItem(key);
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error('Error reading recruitment positions:', e);
    }
    return [];
  },

  saveRecruitmentPositions(companyId, positions) {
    const tenantKey = companyId ? String(companyId).replace(/[^a-zA-Z0-9_-]/g, '_') : 'default';
    const key = `${POSITIONS_STORAGE_KEY_PREFIX}${tenantKey}`;
    try {
      localStorage.setItem(key, JSON.stringify(positions));
    } catch (e) {
      console.error('Error saving recruitment positions:', e);
    }
  },

  // Candidate Data Entity Storage (Tenant-Isolated Persistence)
  getCandidates(companyId) {
    const tenantKey = companyId && companyId !== 'default_tenant' ? String(companyId).replace(/[^a-zA-Z0-9_-]/g, '_') : 'org_default';
    const key = `${CANDIDATES_STORAGE_KEY_PREFIX}${tenantKey}`;
    try {
      const saved = localStorage.getItem(key);
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error('Error reading candidates:', e);
    }
    return [];
  },

  saveCandidates(companyId, candidates) {
    const tenantKey = companyId && companyId !== 'default_tenant' ? String(companyId).replace(/[^a-zA-Z0-9_-]/g, '_') : 'org_default';
    const key = `${CANDIDATES_STORAGE_KEY_PREFIX}${tenantKey}`;
    try {
      localStorage.setItem(key, JSON.stringify(candidates));
    } catch (e) {
      console.error('Error saving candidates:', e);
    }
  }
};
