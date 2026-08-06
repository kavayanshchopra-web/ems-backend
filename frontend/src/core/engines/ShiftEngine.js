/**
 * ShiftEngine.js
 * Core Service for Work Shift Roster, Grace Rules & HR Manual Overrides
 * Handles Shift Profiles, 7-Day Rotational Rosters, Attendance Baseline Calculations,
 * HR Manual Status Overrides, Audit Logging, and Local/Cloud Sync.
 */

import TrashVaultEngine from './TrashVaultEngine';
import FirebaseCloudEngine from './FirebaseCloudEngine';

const PROFILES_STORAGE_KEY = 'whatsapp_crm_shift_profiles';
const ROSTER_STORAGE_KEY = 'whatsapp_crm_shift_rosters';
const OVERRIDES_STORAGE_KEY = 'whatsapp_crm_shift_overrides';

const DEFAULT_SHIFT_PROFILES = [
  {
    id: 'shift_general',
    name: 'General Day Shift',
    code: 'GEN-DAY',
    color: '#0d9488',
    bg: '#e6f4f1',
    startTime: '09:30',
    endTime: '18:30',
    graceMins: 15,
    halfDayHours: 4.5,
    otThresholdHours: 9.0,
    isDefault: true,
    description: 'Standard office hours with 15 mins late grace period.'
  },
  {
    id: 'shift_evening',
    name: 'Evening Shift',
    code: 'EVE-SHIFT',
    color: '#d97706',
    bg: '#fef3c7',
    startTime: '14:00',
    endTime: '22:30',
    graceMins: 15,
    halfDayHours: 4.5,
    otThresholdHours: 8.5,
    isDefault: false,
    description: 'Afternoon to late evening operational shift.'
  },
  {
    id: 'shift_night',
    name: 'US / Night Shift',
    code: 'NIGHT-OPS',
    color: '#7c3aed',
    bg: '#f3e8ff',
    startTime: '22:00',
    endTime: '06:30',
    graceMins: 20,
    halfDayHours: 4.5,
    otThresholdHours: 8.5,
    isDefault: false,
    description: 'Night security & international client operations.'
  },
  {
    id: 'shift_off',
    name: 'Weekly Off',
    code: 'OFF-DAY',
    color: '#64748b',
    bg: '#f1f5f9',
    startTime: '00:00',
    endTime: '00:00',
    graceMins: 0,
    halfDayHours: 0,
    otThresholdHours: 0,
    isDefault: false,
    isWeeklyOff: true,
    description: 'Scheduled Rest Day / Weekend Off.'
  }
];

const DEFAULT_SEED_ROSTER = [];

class ShiftEngine {
  /**
   * Get all active Shift Profiles
   */
  static getShiftProfiles() {
    try {
      const saved = localStorage.getItem(PROFILES_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Error fetching shift profiles:', e);
    }
    // Seed default profiles
    localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(DEFAULT_SHIFT_PROFILES));
    return DEFAULT_SHIFT_PROFILES;
  }

  /**
   * Save / Update a Shift Profile
   */
  static saveShiftProfile(profileData) {
    const profiles = this.getShiftProfiles();
    let updated;
    if (profileData.id) {
      updated = profiles.map(p => p.id === profileData.id ? { ...p, ...profileData } : p);
    } else {
      const newProfile = {
        ...profileData,
        id: `shift_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        color: profileData.color || '#0d9488',
        bg: profileData.bg || '#e6f4f1'
      };
      updated = [...profiles, newProfile];
    }
    localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(updated));
    FirebaseCloudEngine.saveRecord('shift_profiles', profileData, profileData.tenantId || 'acme_corp');
    return updated;
  }

  /**
   * Soft Delete Shift Profile (moves to TrashVaultEngine)
   */
  static deleteShiftProfile(profileId, actorEmail = 'admin@company.com', tenantId = 'acme_corp') {
    const profiles = this.getShiftProfiles();
    const target = profiles.find(p => p.id === profileId);
    if (!target) return profiles;

    // Archive via TrashVaultEngine
    TrashVaultEngine.moveToTrash({
      originalId: profileId,
      name: `Shift Profile: "${target.name}" (${target.startTime} - ${target.endTime})`,
      category: 'Shift Profile',
      entityData: target,
      links: 'Attendance Grace Calculator & Monthly Roster Rules',
      deletedBy: 'HR Manager',
      deletedByEmail: actorEmail,
      tenantId
    });

    const updated = profiles.filter(p => p.id !== profileId);
    localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  }

  /**
   * Get 7-Day Weekly Roster Matrix
   */
  static getWeeklyRoster(employeesList = []) {
    try {
      const saved = localStorage.getItem(ROSTER_STORAGE_KEY);
      if (saved) {
        let rosterMap = JSON.parse(saved);
        if (Array.isArray(rosterMap) && rosterMap.length > 0) {
          return rosterMap;
        }
      }
    } catch (e) {
      console.error('Error fetching roster:', e);
    }

    // Merge employees list into roster baseline
    let roster = [...DEFAULT_SEED_ROSTER];
    if (Array.isArray(employeesList) && employeesList.length > 0) {
      employeesList.forEach(emp => {
        if (!roster.some(r => r.empId === emp.id)) {
          const empName = `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || emp.name || `Employee #${emp.id}`;
          roster.push({
            empId: emp.id,
            empName,
            role: emp.role || 'Staff Member',
            department: emp.department || 'General Operations',
            schedule: {
              mon: 'shift_general',
              tue: 'shift_general',
              wed: 'shift_general',
              thu: 'shift_general',
              fri: 'shift_general',
              sat: 'shift_off',
              sun: 'shift_off'
            }
          });
        }
      });
    }

    localStorage.setItem(ROSTER_STORAGE_KEY, JSON.stringify(roster));
    return roster;
  }

  /**
   * Assign / Update Employee Shift for specific days or bulk
   */
  static updateEmployeeRoster(empId, dayKey, shiftId) {
    const roster = this.getWeeklyRoster();
    const updated = roster.map(item => {
      if (item.empId === empId) {
        return {
          ...item,
          schedule: {
            ...item.schedule,
            [dayKey]: shiftId
          }
        };
      }
      return item;
    });
    localStorage.setItem(ROSTER_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  }

  /**
   * Bulk Assign Shift to multiple employees
   */
  static bulkAssignShift(empIds = [], shiftId, days = ['mon', 'tue', 'wed', 'thu', 'fri']) {
    const roster = this.getWeeklyRoster();
    const updated = roster.map(item => {
      if (empIds.includes(item.empId)) {
        const newSched = { ...item.schedule };
        days.forEach(d => { newSched[d] = shiftId; });
        return { ...item, schedule: newSched };
      }
      return item;
    });
    localStorage.setItem(ROSTER_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  }

  /**
   * Calculate Attendance Status based on Check-in/out vs Assigned Shift
   */
  static calculateAttendanceStatus(checkInTimeStr, checkOutTimeStr, shiftProfile) {
    if (!checkInTimeStr || !shiftProfile || shiftProfile.isWeeklyOff) {
      return { status: 'ON_TIME', isLate: false, isHalfDay: false, overtimeHours: 0, label: 'Normal' };
    }

    const [inHours, inMins] = checkInTimeStr.split(':').map(Number);
    const [shiftInHours, shiftInMins] = shiftProfile.startTime.split(':').map(Number);

    const checkInTotalMins = inHours * 60 + inMins;
    const shiftInTotalMins = shiftInHours * 60 + shiftInMins;
    const graceCutoffMins = shiftInTotalMins + (shiftProfile.graceMins || 15);

    const isLate = checkInTotalMins > graceCutoffMins;

    let workedHours = 0;
    if (checkOutTimeStr) {
      const [outHours, outMins] = checkOutTimeStr.split(':').map(Number);
      const checkOutTotalMins = outHours * 60 + outMins;
      workedHours = Math.max(0, (checkOutTotalMins - checkInTotalMins) / 60);
    }

    const isHalfDay = workedHours > 0 && workedHours < (shiftProfile.halfDayHours || 4.5);
    const otThreshold = shiftProfile.otThresholdHours || 9.0;
    const overtimeHours = workedHours > otThreshold ? parseFloat((workedHours - otThreshold).toFixed(1)) : 0;

    let status = 'ON_TIME';
    if (isLate) status = 'LATE';
    if (isHalfDay) status = 'HALF_DAY';

    return {
      status,
      isLate,
      isHalfDay,
      workedHours: parseFloat(workedHours.toFixed(1)),
      overtimeHours,
      label: isLate ? `Late by ${checkInTotalMins - shiftInTotalMins}m` : 'On Time'
    };
  }

  /**
   * HR Manual Status Override
   */
  static logHROverride(overrideData) {
    try {
      const saved = localStorage.getItem(OVERRIDES_STORAGE_KEY);
      const list = saved ? JSON.parse(saved) : [];
      const entry = {
        id: `override_${Date.now()}`,
        timestamp: new Date().toLocaleString(),
        actorName: overrideData.actorName || 'HR Admin',
        empId: overrideData.empId,
        empName: overrideData.empName,
        date: overrideData.date || new Date().toLocaleDateString('en-GB'),
        previousStatus: overrideData.previousStatus,
        newStatus: overrideData.newStatus,
        reason: overrideData.reason || 'HR Discretionary Correction',
        waiveLatePenalty: Boolean(overrideData.waiveLatePenalty),
        manualOTHours: overrideData.manualOTHours || 0
      };
      list.unshift(entry);
      localStorage.setItem(OVERRIDES_STORAGE_KEY, JSON.stringify(list));
      FirebaseCloudEngine.saveRecord('hr_overrides', entry, overrideData.tenantId || 'acme_corp');
      return entry;
    } catch (e) {
      console.error('Error logging HR override:', e);
      return null;
    }
  }

  /**
   * Get HR Override Logs
   */
  static getHROverrideLogs() {
    try {
      const saved = localStorage.getItem(OVERRIDES_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  }
}

export default ShiftEngine;
