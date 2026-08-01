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
    id: 'ATS-005',
    name: 'Kavayansh Chopra',
    position: 'Sales Representative',
    status: 'Applied',
    stage: 'Applied',
    email: 'kavayanshchopra@gmail.com',
    phone: '8566883642',
    resume: 'Resume.pdf',
    createdAt: new Date().toISOString()
  },
  {
    id: 'ATS-004',
    name: 'Kavayansh Chopra',
    position: 'Software Engineer',
    status: 'Applied',
    stage: 'Applied',
    email: 'kavayanshchopra@gmail.com',
    phone: '8566883642',
    resume: 'Resume.pdf',
    createdAt: new Date().toISOString()
  },
  {
    id: 'ATS-003',
    name: 'Kavayansh Chopra',
    position: 'Sales Representative',
    status: 'Applied',
    stage: 'Applied',
    email: 'kavayanshchopra@gmail.com',
    phone: '8566883642',
    resume: 'Resume.pdf',
    createdAt: new Date().toISOString()
  },
  {
    id: 'ATS-002',
    name: 'Kavayansh Chopra',
    position: 'Software Engineer',
    status: 'Applied',
    stage: 'Applied',
    email: 'kavayanshchopra@gmail.com',
    phone: '8566883642',
    resume: 'Resume.pdf',
    createdAt: new Date().toISOString()
  },
  {
    id: 'ATS-001',
    name: 'Kavayansh Chopra',
    position: 'Sales Representative',
    status: 'Applied',
    stage: 'Applied',
    email: 'kavayanshchopra@gmail.com',
    phone: '8566883642',
    resume: 'Resume.pdf',
    createdAt: new Date().toISOString()
  }
];

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

export function getNextSequentialId(companyId, moduleId = 'recruitment_ats', moduleConfig = null) {
  const tenantKey = companyId ? String(companyId).replace(/[^a-zA-Z0-9_-]/g, '_') : 'default';
  
  const idCfg = moduleConfig?.idConfig || loadAtsModuleConfig(companyId)?.idConfig || {
    prefix: 'ATS',
    pattern: 'ATS-001',
    nextSeq: 1
  };

  const pattern = idCfg.pattern || `${idCfg.prefix || 'ATS'}-001`;
  const storageKey = `omnilflow_seq_${tenantKey}_${moduleId}`;

  try {
    const currentSeq = parseInt(localStorage.getItem(storageKey) || String(idCfg.nextSeq || 1), 10);
    const nextSeq = currentSeq + 1;
    localStorage.setItem(storageKey, String(nextSeq));
    return formatCustomSequencePattern(pattern, currentSeq);
  } catch (e) {
    return formatCustomSequencePattern(pattern, idCfg.nextSeq || 1);
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
