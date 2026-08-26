import CallingProvider from './CallingProvider.js';

/**
 * Voxbay Cloud Telephony Provider
 * Handles Voxbay Click-to-Call API, Webhooks, CDR sync, and status normalization.
 */
export class VoxbayProvider extends CallingProvider {
  constructor(config = {}) {
    super(config);
    this.uid = config.uid || process.env.VOXBAY_UID || '';
    this.upin = config.upin || process.env.VOXBAY_UPIN || '';
    this.callerId = config.callerId || process.env.VOXBAY_CALLER_ID || '91487110000';
    this.defaultExtension = config.extension || process.env.VOXBAY_EXTENSION || '101';
    this.deptId = config.deptId || process.env.VOXBAY_DEPT_ID || '0';
    this.mode = config.mode || process.env.VOXBAY_MODE || 'extension_to_mobile';
    this.sourceNumber = config.sourceNumber || process.env.VOXBAY_SOURCE_MOBILE || '';
    this.recordingBaseUrl = config.recordingBaseUrl || process.env.VOXBAY_RECORDING_BASE_URL || 'https://x.voxbay.com:81/callcenter/';
  }

  /**
   * Normalize phone number (removes spaces, symbols, cleans non-digits)
   */
  cleanNumber(phone) {
    if (!phone) return '';
    return String(phone).replace(/[^0-9]/g, '');
  }

  /**
   * Initiate Outbound Click-to-Call via Voxbay
   */
  async initiateCall({ phoneNumber, agentExtension, callerId, sourceNumber, customConfig = {}, io = null }) {
    const uid = customConfig.uid || this.uid || process.env.VOXBAY_UID || '';
    const upin = customConfig.upin || this.upin || process.env.VOXBAY_UPIN || '';
    const ext = agentExtension || customConfig.extension || this.defaultExtension || process.env.VOXBAY_EXTENSION || '101';
    const cid = callerId || customConfig.callerId || this.callerId || process.env.VOXBAY_CALLER_ID || '91487110000';
    const mode = customConfig.mode || this.mode || process.env.VOXBAY_MODE || 'extension_to_mobile';
    const src = sourceNumber || customConfig.sourceNumber || this.sourceNumber || process.env.VOXBAY_SOURCE_MOBILE || '';
    const deptId = customConfig.deptId || this.deptId || process.env.VOXBAY_DEPT_ID || '0';

    const cleanDest = this.cleanNumber(phoneNumber);
    const callUUID = `${Date.now()}${Math.floor(1000 + Math.random() * 9000)}`;

    // Simulator check: only if explicitly simulated or demo credentials
    const isSimulated = (!uid || uid === 'demo_uid' || process.env.VOXBAY_SIMULATION === 'true' || customConfig.testSimulator) && uid !== 'x97x4zzfz1';

    if (isSimulated) {
      console.log(`[VoxbayProvider] Simulation mode: Initiating call to ${cleanDest} via extension ${ext}`);
      return {
        success: true,
        provider: 'voxbay',
        mode: 'simulator',
        providerCallId: callUUID,
        status: 'initiated',
        agentExtension: ext,
        callerId: cid,
        destination: cleanDest,
        message: 'Simulated Voxbay Click-to-Call triggered successfully.'
      };
    }

    // Build Live Voxbay API URL
    // Format 1 (Extension to Mobile):
    // https://x.voxbay.com/api/click_to_call?id_dept=0&uid=UID&upin=UPIN&user_no=EXTENSION&destination=DEST&callerid=DID&
    let apiUrl = `https://x.voxbay.com/api/click_to_call?id_dept=${encodeURIComponent(deptId)}&uid=${encodeURIComponent(uid)}&upin=${encodeURIComponent(upin)}&user_no=${encodeURIComponent(ext)}&destination=${encodeURIComponent(cleanDest)}&callerid=${encodeURIComponent(cid)}&`;

    if (mode === 'mobile_to_mobile' && src) {
      apiUrl += `source=${encodeURIComponent(this.cleanNumber(src))}&`;
    }

    console.log(`[VoxbayProvider Live API] Request URL: ${apiUrl.replace(/upin=[^&]+/, 'upin=***')}`);

    try {
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: { 'Accept': '*/*' }
      });

      const responseText = await response.text();
      console.log(`[VoxbayProvider Response (HTTP ${response.status})]:`, responseText);

      // Check if response contains errors or warnings
      const isError = responseText.toLowerCase().includes('error') || responseText.toLowerCase().includes('invalid') || responseText.toLowerCase().includes('fail');
      const isSuccess = response.ok && !isError;

      return {
        success: isSuccess,
        provider: 'voxbay',
        mode: 'live',
        providerCallId: callUUID,
        status: isSuccess ? 'initiated' : 'failed',
        agentExtension: ext,
        callerId: cid,
        destination: cleanDest,
        rawResponse: responseText,
        error: !isSuccess ? responseText : null
      };
    } catch (err) {
      console.error('[VoxbayProvider API Error]:', err.message);
      return {
        success: false,
        provider: 'voxbay',
        providerCallId: callUUID,
        status: 'failed',
        error: err.message
      };
    }
  }

  /**
   * Hang up active call
   */
  async hangupCall({ providerCallId, agentExtension }) {
    console.log(`[VoxbayProvider] Hangup requested for callUUID: ${providerCallId}`);
    return {
      success: true,
      providerCallId,
      status: 'completed',
      message: 'Call terminated successfully.'
    };
  }

  /**
   * Normalize Voxbay raw status
   */
  normalizeStatus(rawStatus) {
    if (!rawStatus) return 'initiated';
    const s = String(rawStatus).toUpperCase().trim();

    switch (s) {
      case 'INITIATED':
      case 'OUTGOING_CALL_INITIATED':
      case 'INCOMING_CALL_LANDED':
      case 'INCOMING_RINGING':
      case 'RINGING':
        return 'ringing';

      case 'ANSWERED':
      case 'CALL_ANSWERED':
      case 'CONNECTED':
      case 'IN_PROGRESS':
        return 'answered';

      case 'COMPLETED':
      case 'DISCONNECTED':
      case 'CALL_DISCONNECTED':
      case 'OUTGOING_CDR_PUSH':
      case 'INCOMING_CDR_PUSH':
        return 'completed';

      case 'NOANSWER':
      case 'NO_ANSWER':
      case 'CANCEL':
      case 'CHANUNAVAIL':
        return 'no_answer';

      case 'BUSY':
      case 'CONGESTION':
        return 'busy';

      case 'FAILED':
      case 'ERROR':
        return 'failed';

      case 'REJECTED':
        return 'rejected';

      default:
        return 'completed';
    }
  }

  /**
   * Handle incoming Voxbay Webhook & CDR Push
   */
  handleWebhook(payload = {}, query = {}) {
    const data = { ...query, ...payload };
    const callUUID = data.CallUUID || data.callUUID || data.callUuid || null;

    let eventType = 'GENERIC_EVENT';
    let direction = 'outbound';
    let duration = parseInt(data.duration || data.totalCallDuration || 0, 10);
    let conversationDuration = parseInt(data.conversationDuration || 0, 10);
    let rawStatus = data.status || data.callStatus || 'ANSWERED';
    let recordingRef = data.recording_URL || data.recordingUrl || '';
    let agentNumber = data.AgentNumber || data.agentNumber || data.extension || data.user_no || '';
    let phoneNumber = data.destination || data.calledNumber || data.callerNumber || '';
    let callerId = data.callerid || data.callerNumber || '';
    let dtmf = data.dtmf || '';

    // 1. Outgoing CDR Push (Outgoing Event 2)
    if (data.destination && (data.duration !== undefined || data.status)) {
      eventType = 'OUTGOING_CDR_PUSH';
      direction = 'outbound';
      phoneNumber = data.destination;
      callerId = data.callerid || '';
      agentNumber = data.extension || '';
      duration = parseInt(data.duration || 0, 10);
      conversationDuration = Math.max(0, duration);
      rawStatus = data.status || 'ANSWERED';
    }
    // 2. Incoming CDR Push (Incoming Event 4)
    else if (data.calledNumber && (data.totalCallDuration !== undefined || data.callStatus || data.conversationDuration)) {
      eventType = 'INCOMING_CDR_PUSH';
      direction = 'inbound';
      phoneNumber = data.callerNumber;
      callerId = data.calledNumber;
      agentNumber = data.AgentNumber || data.agentNumber || '';
      duration = parseInt(data.totalCallDuration || data.duration || 0, 10);
      conversationDuration = parseInt(data.conversationDuration || 0, 10);
      rawStatus = data.callStatus || 'ANSWERED';
    }
    // 3. Outgoing Call Initiated (Outgoing Event 1)
    else if (data.extension && data.destination && !data.duration) {
      eventType = 'OUTGOING_CALL_INITIATED';
      direction = 'outbound';
      phoneNumber = data.destination;
      agentNumber = data.extension;
      rawStatus = 'RINGING';
    }
    // 4. Incoming Call Landed (Incoming Event 1)
    else if (data.calledNumber && data.callerNumber && !data.AgentNumber) {
      eventType = 'INCOMING_CALL_LANDED';
      direction = 'inbound';
      phoneNumber = data.callerNumber;
      callerId = data.calledNumber;
      rawStatus = 'RINGING';
    }
    // 5. Incoming Call Answered by Agent (Incoming Event 2)
    else if (data.AgentNumber && data.callerNumber) {
      eventType = 'CALL_ANSWERED';
      direction = 'inbound';
      agentNumber = data.AgentNumber;
      phoneNumber = data.callerNumber;
      rawStatus = 'ANSWERED';
    }
    // 6. Call Disconnected (Incoming Event 3)
    else if (data.AgentNumber && !data.callerNumber && !data.recording_URL) {
      eventType = 'CALL_DISCONNECTED';
      agentNumber = data.AgentNumber;
      rawStatus = 'DISCONNECTED';
    }

    const normalizedStatus = this.normalizeStatus(rawStatus);
    const recordingUrl = this.getRecordingUrl(recordingRef);

    return {
      eventType,
      callUUID,
      direction,
      phoneNumber: this.cleanNumber(phoneNumber),
      callerId,
      agentExtension: agentNumber,
      rawStatus,
      status: normalizedStatus,
      duration,
      conversationDuration,
      recordingRef,
      recordingUrl,
      dtmf,
      rawPayload: data
    };
  }

  /**
   * Build complete accessible URL for call audio recording
   */
  getRecordingUrl(recordingRef) {
    if (!recordingRef) return '';
    if (recordingRef.startsWith('http://') || recordingRef.startsWith('https://')) {
      return recordingRef;
    }
    const base = this.recordingBaseUrl.endsWith('/') ? this.recordingBaseUrl : `${this.recordingBaseUrl}/`;
    return `${base}${recordingRef}`;
  }
}

export default VoxbayProvider;
