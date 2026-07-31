/**
 * Global EMS Storage Abstraction Service — Recruitment ATS Module
 * Decouples React UI components from direct window.localStorage calls.
 * Easily swappable to Firestore / Firebase Adapter in future backend phase.
 */

import { loadAtsModuleConfig, saveAtsModuleConfig } from '../config/atsModuleConfig';

const POSITIONS_STORAGE_KEY_PREFIX = 'omnilflow_recruitment_positions_';

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
  }
};
