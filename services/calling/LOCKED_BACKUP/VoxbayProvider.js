import CallingProvider from './CallingProvider.js';

/**
 * Official Voxbay Cloud Telephony Provider Implementation (ESM)
 * Adheres strictly to official Voxbay API documentation specifications & RS Dialer v1.1 Master Code.
 */
export default class VoxbayProvider extends CallingProvider {
  constructor() {
    super('voxbay');
    this.apiBaseUrl = process.env.VOXBAY_API_BASE_URL || 'https://x.voxbay.com/api/click_to_call';
    this.recordingBaseUrl = process.env.VOXBAY_RECORDING_BASE_URL || 'https://x.voxbay.com:81/callcenter/';
  }

  /**
   * Initiate Click-to-Call via official Voxbay HTTP GET endpoint
   * 
   * Format 1: Extension to Mobile
   *   https://x.voxbay.com/api/click_to_call?id_dept=0&uid=UID&upin=UPIN&user_no=EXT&destination=DEST&callerid=DID&
   * 
   * Format 2: Mobile to Mobile
   *   https://x.voxbay.com/api/click_to_call?id_dept=0&uid=UID&upin=UPIN&user_no=EXT&destination=DEST&callerid=DID&source=AGENT_MOBILE&
   */
  async initiateCall({
    fromNumber,
    toNumber,
    destination,
    callerid,
    extension,
    agentExtension,
    agentMobile,
    mode = 'mobile_to_mobile',
    credentials
  }) {
    const creds = credentials || {};
    const uid = creds.uid || process.env.VOXBAY_UID || 'x97x4zzfz1';
    const upin = creds.upin || process.env.VOXBAY_UPIN || '8uqctamkgf';
    const callerId = fromNumber || callerid || creds.callerid || process.env.VOXBAY_DID || '918031496345';
    const deptId = creds.deptId || '0';

    const targetDest = destination || toNumber;
    if (!targetDest) {
      throw new Error('Destination phone number is required.');
    }

    // Clean numbers (digits only)
    const cleanDestination = String(targetDest).replace(/\D/g, '');
    const cleanCallerId = String(callerId).replace(/\D/g, '');
    const cleanExtension = String(extension || agentExtension || '111').trim();

    const queryParams = {
      id_dept: deptId,
      uid: uid,
      upin: upin,
      user_no: cleanExtension,
      destination: cleanDestination,
      callerid: cleanCallerId
    };

    const activeMode = mode || (agentMobile ? 'mobile_to_mobile' : 'extension_to_mobile');

    if (activeMode === 'mobile_to_mobile' && agentMobile) {
      queryParams.source = String(agentMobile).replace(/\D/g, '');
    }

    const queryString = new URLSearchParams(queryParams).toString() + '&';
    const targetUrl = `${this.apiBaseUrl}?${queryString}`;

    console.log(`[VoxbayProvider] Initiating Call: ${targetUrl.replace(/upin=[^&]+/, 'upin=******')}`);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(targetUrl, {
        method: 'GET',
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const responseData = await response.text();
      console.log(`[VoxbayProvider] API Response Status: ${response.status}`, responseData);

      const providerCallId = `vox_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;

      return {
        success: true,
        callId: `call_${Date.now()}`,
        providerCallId,
        destination: cleanDestination,
        callingMode: activeMode,
        rawResponse: responseData,
        message: (activeMode === 'mobile_to_mobile' && queryParams.source)
          ? `Click-to-Call dispatched! Ringing Agent Mobile (${queryParams.source})...`
          : `Click-to-Call dispatched! Ringing Softphone Ext (${cleanExtension})...`
      };
    } catch (error) {
      console.error(`[VoxbayProvider] Request Failed:`, error.message);
      throw new Error(`Voxbay Telephony Error: ${error.message}`);
    }
  }

  handleWebhook(payload = {}) {
    const callUUID = payload.CallUUID || payload.callUUID || payload.callUuid;
    const calledNumber = payload.calledNumber || payload.destination || '';
    const callerNumber = payload.callerNumber || payload.callerid || payload.source || '';
    const agentNumber = payload.AgentNumber || payload.agentNumber || payload.extension || '';
    const rawStatus = payload.callStatus || payload.status || '';
    const totalDuration = parseInt(payload.totalCallDuration || payload.duration || 0, 10) || 0;
    const convDuration = parseInt(payload.conversationDuration || 0, 10) || 0;
    const recordingFile = payload.recording_URL || payload.recordingUrl || '';
    const callDate = payload.callDate || payload.date || new Date().toISOString();
    const dtmf = payload.dtmf || '';
    const transferred = payload.transferredNumber || '';

    let eventType = 'CALL_STATUS_UPDATE';
    let normalizedStatus = this.normalizeStatus(rawStatus);

    if (payload.calledNumber && payload.callerNumber && !payload.AgentNumber && !payload.totalCallDuration && !payload.duration) {
      eventType = 'INCOMING_LANDED';
      normalizedStatus = 'ringing';
    } else if (payload.AgentNumber && payload.callerNumber && !payload.totalCallDuration && !payload.duration) {
      eventType = 'INCOMING_ANSWERED';
      normalizedStatus = 'answered';
    } else if (payload.AgentNumber && !payload.callerNumber && !payload.totalCallDuration && !payload.duration && !payload.calledNumber) {
      eventType = 'CALL_DISCONNECTED';
      normalizedStatus = 'completed';
    } else if (payload.totalCallDuration || payload.duration || payload.recording_URL) {
      eventType = 'CDR_PUSH';
      normalizedStatus = rawStatus ? this.normalizeStatus(rawStatus) : 'completed';
    }

    const recordingUrl = recordingFile ? this.getCallRecording(recordingFile) : null;

    return {
      provider: 'voxbay',
      providerCallId: callUUID,
      eventType,
      status: normalizedStatus,
      rawStatus,
      calledNumber,
      callerNumber,
      agentNumber,
      totalDuration,
      conversationDuration: convDuration,
      recordingFile,
      recordingUrl,
      callDate,
      dtmf,
      transferredNumber: transferred,
      rawPayload: payload
    };
  }

  getCallRecording(recordingKey) {
    if (!recordingKey) return null;
    if (recordingKey.startsWith('http')) return recordingKey;
    const base = this.recordingBaseUrl.replace(/\/?$/, '/');
    return `${base}${recordingKey}`;
  }

  normalizeStatus(rawStatus) {
    if (!rawStatus) return 'in_progress';
    const s = String(rawStatus).toUpperCase().trim();
    switch (s) {
      case 'ANSWERED':
      case 'CONNECTED':
        return 'answered';
      case 'BUSY':
        return 'busy';
      case 'NOANSWER':
        return 'no_answer';
      case 'CONGESTION':
      case 'CHANUNAVAIL':
        return 'failed';
      case 'CANCEL':
      case 'CANCELLED':
        return 'cancelled';
      case 'INITIATED':
        return 'initiated';
      case 'RINGING':
        return 'ringing';
      case 'COMPLETED':
      case 'DISCONNECTED':
        return 'completed';
      default:
        return 'completed';
    }
  }
}