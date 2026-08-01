/**
 * Global EMS Storage Abstraction Service — Recruitment ATS Module
 * Decouples React UI components from direct window.localStorage calls.
 * Easily swappable to Firestore / Firebase Adapter in future backend phase.
 */

import { loadAtsModuleConfig, saveAtsModuleConfig } from '../config/atsModuleConfig';

const POSITIONS_STORAGE_KEY_PREFIX = 'omnilflow_recruitment_positions_';
const CANDIDATES_STORAGE_KEY_PREFIX = 'omnilflow_recruitment_candidates_';

export const DEFAULT_RECRUITMENT_POSITIONS = [
  {
    id: 'pos_101',
    title: 'Senior React Developer — Chandigarh',
    designation: 'Software Engineer',
    department: 'IT & Engineering',
    location: 'Chandigarh',
    employmentType: 'Full-time',
    openings: 2,
    status: 'Open',
    description: 'Looking for a Senior React.js developer to build enterprise SaaS tools.',
    createdAt: new Date().toISOString()
  },
  {
    id: 'pos_102',
    title: 'Sales Account Manager — Delhi',
    designation: 'Sales Representative',
    department: 'Sales & Marketing',
    location: 'Delhi NCR',
    employmentType: 'Full-time',
    openings: 3,
    status: 'Open',
    description: 'Corporate sales account executive for North India market.',
    createdAt: new Date().toISOString()
  }
];

export const DEFAULT_RECRUITMENT_CANDIDATES = [
  {
    id: 'ATS-001',
    name: 'Kavay Sharma',
    position: 'Senior React Developer — Chandigarh',
    status: 'Applied',
    stage: 'Applied',
    email: 'kavay@example.com',
    phone: '+91 9876543210',
    resume: 'Kavay_CV.pdf',
    createdAt: new Date().toISOString()
  }
];

export function formatCandidateId(id, idx = 0, moduleConfig = null) {
  const idCfg = moduleConfig?.idConfig || {
    prefix: 'ATS',
    separator: '-',
    includeYear: false,
    padding: 3
  };

  const prefix = (idCfg.prefix || 'ATS').toUpperCase();
  const sep = idCfg.separator !== undefined ? idCfg.separator : '-';
  const padding = idCfg.padding || 3;

  if (!id) return `${prefix}${sep}${String(idx + 1).padStart(padding, '0')}`;
  const strId = String(id).trim();

  // Preserve existing formatted string IDs (e.g. ATS-001, CAND/2026/001)
  if (strId.includes(prefix) || strId.startsWith('ATS') || strId.startsWith('CAND') || strId.includes('/') || strId.includes('.')) {
    return strId;
  }

  // Normalize raw numeric/timestamp IDs
  const digits = strId.replace(/[^0-9]/g, '');
  if (digits) {
    const num = parseInt(digits.slice(-padding), 10) || (idx + 1);
    return `${prefix}${sep}${String(num).padStart(padding, '0')}`;
  }
  return `${prefix}${sep}${String(idx + 1).padStart(padding, '0')}`;
}

export function getNextSequentialId(companyId, moduleId = 'recruitment_ats', moduleConfig = null) {
  const tenantKey = companyId ? String(companyId).replace(/[^a-zA-Z0-9_-]/g, '_') : 'default';
  
  const idCfg = moduleConfig?.idConfig || loadAtsModuleConfig(companyId)?.idConfig || {
    generationMode: 'auto',
    prefix: 'ATS',
    separator: '-',
    includeYear: false,
    nextSeq: 1,
    padding: 3
  };

  const prefix = (idCfg.prefix || 'ATS').toUpperCase();
  const sep = idCfg.separator !== undefined ? idCfg.separator : '-';
  const padding = idCfg.padding || 3;
  const includeYear = !!idCfg.includeYear;
  const yearStr = new Date().getFullYear();

  const storageKey = `omnilflow_seq_${tenantKey}_${moduleId}`;

  try {
    const currentSeq = parseInt(localStorage.getItem(storageKey) || String(idCfg.nextSeq || 1), 10);
    const nextSeq = currentSeq + 1;
    localStorage.setItem(storageKey, String(nextSeq));
    const numStr = String(currentSeq).padStart(padding, '0');

    if (includeYear) {
      return `${prefix}${sep}${yearStr}${sep}${numStr}`;
    }
    return `${prefix}${sep}${numStr}`;
  } catch (e) {
    const numStr = String(idCfg.nextSeq || 1).padStart(padding, '0');
    return includeYear ? `${prefix}${sep}${yearStr}${sep}${numStr}` : `${prefix}${sep}${numStr}`;
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
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error('Error reading recruitment positions:', e);
    }
    return DEFAULT_RECRUITMENT_POSITIONS;
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

  // Candidate Data Entity Storage (Local Storage Persistence)
  getCandidates(companyId) {
    const tenantKey = companyId ? String(companyId).replace(/[^a-zA-Z0-9_-]/g, '_') : 'default';
    const key = `${CANDIDATES_STORAGE_KEY_PREFIX}${tenantKey}`;
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((c, idx) => ({
            ...c,
            id: formatCandidateId(c.id, idx)
          }));
        }
      }
    } catch (e) {
      console.error('Error reading candidates:', e);
    }
    return DEFAULT_RECRUITMENT_CANDIDATES;
  },

  saveCandidates(companyId, candidates) {
    const tenantKey = companyId ? String(companyId).replace(/[^a-zA-Z0-9_-]/g, '_') : 'default';
    const key = `${CANDIDATES_STORAGE_KEY_PREFIX}${tenantKey}`;
    try {
      localStorage.setItem(key, JSON.stringify(candidates));
    } catch (e) {
      console.error('Error saving candidates:', e);
    }
  }
};
