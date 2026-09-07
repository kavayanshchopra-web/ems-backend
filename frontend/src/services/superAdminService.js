import { SUPER_ADMIN_MANIFEST } from '../core/registry/manifests/superAdmin.manifest';

const STORAGE_KEY_ACTIVE_CARDS = 'omnilflow_superadmin_active_cards';
const STORAGE_KEY_CUSTOM_CARDS = 'omnilflow_superadmin_custom_cards';

export const superAdminService = {
  /**
   * Get all registered system cards from manifest + custom user-created cards
   */
  getAllAvailableCards() {
    let customCards = [];
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CUSTOM_CARDS);
      if (saved) customCards = JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to parse custom superadmin cards:', e);
    }

    const systemCards = SUPER_ADMIN_MANIFEST.kpiCards || [];
    return [...systemCards, ...customCards];
  },

  /**
   * Get IDs of currently enabled cards
   */
  getActiveCardIds() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ACTIVE_CARDS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Failed to parse active cards:', e);
    }

    // Default active cards from manifest
    return (SUPER_ADMIN_MANIFEST.kpiCards || [])
      .filter(c => c.defaultActive !== false)
      .map(c => c.id);
  },

  /**
   * Save user's enabled cards
   */
  setActiveCardIds(ids) {
    try {
      localStorage.setItem(STORAGE_KEY_ACTIVE_CARDS, JSON.stringify(ids));
      window.dispatchEvent(new CustomEvent('omnilflow_superadmin_cards_updated', { detail: ids }));
    } catch (e) {
      console.error('Failed to save active cards:', e);
    }
  },

  /**
   * Add a new dynamic custom metric card
   */
  addCustomCard(card) {
    try {
      const allCustom = this.getCustomCards();
      const newCard = {
        id: `custom_${Date.now()}`,
        label: card.label || 'Custom Metric',
        category: 'Custom',
        icon: card.icon || 'Sparkles',
        color: card.color || '#0d9488',
        bgLight: card.bgLight || 'rgba(13, 148, 136, 0.12)',
        border: card.border || 'rgba(13, 148, 136, 0.25)',
        format: card.format || 'text',
        customValue: card.customValue || '0',
        targetTab: card.targetTab || 'system_users',
        isCustom: true,
        description: card.description || 'Custom Super Admin Metric'
      };

      const updated = [...allCustom, newCard];
      localStorage.setItem(STORAGE_KEY_CUSTOM_CARDS, JSON.stringify(updated));

      // Also enable it in active list
      const activeIds = this.getActiveCardIds();
      this.setActiveCardIds([...activeIds, newCard.id]);
      return newCard;
    } catch (e) {
      console.error('Failed to add custom card:', e);
      return null;
    }
  },

  /**
   * Get all custom cards
   */
  getCustomCards() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CUSTOM_CARDS);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  },

  /**
   * Delete custom card
   */
  deleteCustomCard(cardId) {
    try {
      const allCustom = this.getCustomCards().filter(c => c.id !== cardId);
      localStorage.setItem(STORAGE_KEY_CUSTOM_CARDS, JSON.stringify(allCustom));
      const activeIds = this.getActiveCardIds().filter(id => id !== cardId);
      this.setActiveCardIds(activeIds);
    } catch (e) {
      console.error('Failed to delete custom card:', e);
    }
  },

  /**
   * Reset cards to factory defaults
   */
  resetToDefaults() {
    try {
      localStorage.removeItem(STORAGE_KEY_ACTIVE_CARDS);
      const defaultIds = (SUPER_ADMIN_MANIFEST.kpiCards || [])
        .filter(c => c.defaultActive !== false)
        .map(c => c.id);
      this.setActiveCardIds(defaultIds);
      return defaultIds;
    } catch (e) {
      return [];
    }
  },

  /**
   * Compute live value for a given card using telemetry data
   */
  computeCardValue(card, telemetry) {
    if (card.isCustom) {
      return card.customValue || '0';
    }

    const formatINR = (val) => {
      const num = Number(val) || 0;
      return '₹' + num.toLocaleString('en-IN');
    };

    switch (card.id) {
      case 'revenue':
        return formatINR(telemetry.totalRevenue || 0);

      case 'expenses':
        return formatINR(telemetry.totalExpenses || 0);

      case 'net_margin': {
        const rev = Number(telemetry.totalRevenue) || 0;
        const exp = Number(telemetry.totalExpenses) || 0;
        const margin = rev - exp;
        return formatINR(margin);
      }

      case 'pending_approvals':
        return String(telemetry.pendingApprovalsCount ?? 0);

      case 'companies':
        return String(telemetry.companiesCount ?? 0);

      case 'total_users':
        return String(telemetry.totalUsersCount ?? 0);

      case 'paid_subs':
        return String(telemetry.paidSubsCount ?? 0);

      case 'platform_modules':
        return String(telemetry.modulesCount ?? 22);

      case 'admins':
        return String(telemetry.adminsCount ?? 0);

      case 'employees':
        return String(telemetry.employeesCount ?? 0);

      case 'branches':
        return String(telemetry.branchesCount ?? 0);

      default:
        return '0';
    }
  }
};

export default superAdminService;
