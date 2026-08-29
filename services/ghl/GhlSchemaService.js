import ghlApiClient from './GhlApiClient.js';
import { 
  saveGhlFieldMapping, 
  getGhlFieldMappings 
} from '../../db.js';

/**
 * GHL Dynamic Schema & Field Discovery Service (Backend Foundation)
 * Manages two-way schema discovery, custom field mapping dictionary, and automated field provisioning.
 */
export class GhlSchemaService {
  /**
   * Discovers custom fields in GHL sub-account and compares with EMS Manifest fields.
   * 
   * TODO (Phase 7): Implement automatic schema synchronization and diff detector
   * 
   * @param {number} tenantId
   * @param {string} locationId
   * @param {string} emsModuleId - e.g. 'contacts', 'employees'
   */
  async discoverAndMapSchema(tenantId, locationId, emsModuleId = 'contacts') {
    if (!tenantId || !locationId) {
      throw new Error('[GhlSchemaService] tenantId and locationId are required');
    }

    // Retrieve existing mappings from SQLite
    const existingMappings = await getGhlFieldMappings(tenantId, locationId, emsModuleId);

    return {
      status: 'foundation_ready',
      locationId,
      emsModuleId,
      mappedFieldsCount: existingMappings.length,
      mappings: existingMappings
    };
  }

  /**
   * Translates an EMS record payload with custom fields into a GHL API v2 payload.
   * @param {Object} params
   * @param {number} params.tenantId
   * @param {string} params.locationId
   * @param {string} params.emsModuleId
   * @param {Object} params.emsRecordData
   * @returns {Promise<Object>} GHL-formatted contact payload
   */
  async transformEmsToGhlPayload({ tenantId, locationId, emsModuleId = 'contacts', emsRecordData = {} }) {
    const mappings = await getGhlFieldMappings(tenantId, locationId, emsModuleId);
    const customFields = [];

    // Map custom fields based on dictionary
    for (const mapping of mappings) {
      const emsVal = emsRecordData[mapping.ems_field_key];
      if (emsVal !== undefined && emsVal !== null && emsVal !== '') {
        customFields.push({
          id: mapping.ghl_field_id,
          value: emsVal
        });
      }
    }

    return {
      name: emsRecordData.name || `${emsRecordData.first_name || ''} ${emsRecordData.last_name || ''}`.trim(),
      email: emsRecordData.email || '',
      phone: emsRecordData.phone || '',
      customFields
    };
  }
}

export default new GhlSchemaService();
