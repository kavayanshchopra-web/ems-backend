/**
 * Base Abstract Calling Provider Interface
 * Standardizes telephony providers (Voxbay, etc.) across EMS.
 */

export class CallingProvider {
  constructor(config = {}) {
    this.config = config;
  }

  /**
   * Initiate an outbound call (Click-to-Call)
   * @param {Object} params
   * @param {string} params.phoneNumber - Destination customer number
   * @param {string} params.agentExtension - Softphone/Agent extension (e.g. '101')
   * @param {string} params.callerId - DID virtual number
   * @param {string} [params.sourceNumber] - Agent mobile number (for mobile-to-mobile mode)
   * @param {Object} [params.customConfig] - Overrides for credentials/mode
   * @returns {Promise<{ success: boolean, providerCallId: string, status: string, rawResponse: any }>}
   */
  async initiateCall(params) {
    throw new Error('initiateCall() must be implemented by concrete CallingProvider');
  }

  /**
   * Hang up an active call
   * @param {Object} params
   * @param {string} params.providerCallId
   * @param {string} [params.agentExtension]
   * @returns {Promise<{ success: boolean, message: string }>}
   */
  async hangupCall(params) {
    throw new Error('hangupCall() must be implemented by concrete CallingProvider');
  }

  /**
   * Normalize provider-specific status to EMS unified status:
   * 'initiated' | 'ringing' | 'answered' | 'completed' | 'busy' | 'no_answer' | 'failed' | 'rejected' | 'cancelled'
   * @param {string} rawStatus
   * @returns {string}
   */
  normalizeStatus(rawStatus) {
    throw new Error('normalizeStatus() must be implemented by concrete CallingProvider');
  }

  /**
   * Parse incoming webhook or CDR payload
   * @param {Object} payload - Body and query parameters
   * @returns {Object} Normalized event object
   */
  handleWebhook(payload) {
    throw new Error('handleWebhook() must be implemented by concrete CallingProvider');
  }

  /**
   * Build complete accessible URL for call audio recording
   * @param {string} recordingRef
   * @returns {string}
   */
  getRecordingUrl(recordingRef) {
    throw new Error('getRecordingUrl() must be implemented by concrete CallingProvider');
  }
}

export default CallingProvider;
