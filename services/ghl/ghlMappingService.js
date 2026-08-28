/**
 * GHL Entity Mapping Service
 * Handles tenant-scoped bidirectional mapping between EMS IDs and GHL IDs
 */

import { 
  setGhlEntityMapping, 
  getGhlMappingByEmsId, 
  getGhlMappingByGhlId, 
  deleteGhlEntityMapping, 
  getAllGhlMappings 
} from '../../db.js';

class GhlMappingService {
  /**
   * Set or update an entity mapping
   */
  async setMapping(tenantId, { entityType, emsId, ghlId, locationId, syncHash = null, metadata = {} }) {
    if (!tenantId) throw new Error('Tenant ID is required for entity mapping');
    if (!entityType || !emsId || !ghlId || !locationId) {
      throw new Error('entityType, emsId, ghlId, and locationId are required');
    }
    return await setGhlEntityMapping(tenantId, {
      entityType,
      emsId: String(emsId),
      ghlId: String(ghlId),
      locationId: String(locationId),
      syncHash,
      metadata
    });
  }

  /**
   * Resolve EMS ID from GHL ID
   */
  async getEmsId(tenantId, entityType, ghlId) {
    if (!tenantId || !ghlId) return null;
    const mapping = await getGhlMappingByGhlId(tenantId, entityType, String(ghlId));
    return mapping ? mapping.ems_id : null;
  }

  /**
   * Resolve GHL ID from EMS ID
   */
  async getGhlId(tenantId, entityType, emsId) {
    if (!tenantId || !emsId) return null;
    const mapping = await getGhlMappingByEmsId(tenantId, entityType, String(emsId));
    return mapping ? mapping.ghl_id : null;
  }

  /**
   * Get full mapping by EMS ID
   */
  async getMappingByEmsId(tenantId, entityType, emsId) {
    if (!tenantId || !emsId) return null;
    return await getGhlMappingByEmsId(tenantId, entityType, String(emsId));
  }

  /**
   * Get full mapping by GHL ID
   */
  async getMappingByGhlId(tenantId, entityType, ghlId) {
    if (!tenantId || !ghlId) return null;
    return await getGhlMappingByGhlId(tenantId, entityType, String(ghlId));
  }

  /**
   * Delete mapping
   */
  async deleteMapping(tenantId, entityType, emsId) {
    if (!tenantId || !emsId) return;
    await deleteGhlEntityMapping(tenantId, entityType, String(emsId));
  }

  /**
   * List mappings for a tenant
   */
  async listMappings(tenantId, entityType = null) {
    return await getAllGhlMappings(tenantId, entityType);
  }
}

export default new GhlMappingService();
