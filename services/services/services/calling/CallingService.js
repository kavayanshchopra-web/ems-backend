import VoxbayProvider from './VoxbayProvider.js';
import { 
  createCallRecord, 
  updateCallRecord, 
  getCallByProviderId, 
  getTenantCalls, 
  getCallingStats,
  getTelephonySettings
} from '../../db.js';

class CallingService {
  constructor() {
    this.providers = new Map();
    this.activeCalls = new Map(); // providerCallId -> call data
    this.io = null;

    // Register default Voxbay provider
    this.registerProvider('voxbay', new VoxbayProvider());
  }

  setSocketIO(ioInstance) {
    this.io = ioInstance;
  }

  registerProvider(name, providerInstance) {
    this.providers.set(name.toLowerCase(), providerInstance);
  }

  getProvider(name = 'voxbay') {
    const provider = this.providers.get((name || 'voxbay').toLowerCase());
    if (!provider) {
      throw new Error(`Calling provider '${name}' is not registered`);
    }
    return provider;
  }

  /**
   * Validate and clean destination phone numbers
   */
  normalizePhoneNumber(phone) {
    if (!phone) return '';
    let cleaned = String(phone).replace(/[^0-9+]/g, '');
    if (cleaned.startsWith('+91')) {
      cleaned = cleaned.substring(3);
    } else if (cleaned.startsWith('91') && cleaned.length === 12) {
      cleaned = cleaned.substring(2);
    } else if (cleaned.startsWith('0') && cleaned.length === 11) {
      cleaned = cleaned.substring(1);
    }
    return cleaned;
  }

  /**
   * Initiate an Outbound Call
   */
  async initiateCall({
    tenantId = 1,
    userId = null,
    contactId = null,
    phoneNumber,
    extension = null,
    providerName = 'voxbay',
    notes = '',
    customConfig = {}
  }) {
    const provider = this.getProvider(providerName);
    const cleanPhone = this.normalizePhoneNumber(phoneNumber);

    if (!cleanPhone || cleanPhone.length < 4) {
      throw new Error('Invalid destination phone number provided');
    }

    // Load active persistent telephony settings from DB
    const telephonySettings = await getTelephonySettings(tenantId);

    const finalConfig = {
      uid: customConfig.uid || telephonySettings?.uid || process.env.VOXBAY_UID || '',
      upin: customConfig.upin || telephonySettings?.upin || process.env.VOXBAY_UPIN || '',
      callerId: customConfig.callerId || telephonySettings?.caller_id || process.env.VOXBAY_CALLER_ID || '91487110000',
      extension: extension || customConfig.extension || telephonySettings?.extension || process.env.VOXBAY_EXTENSION || '101',
      mode: customConfig.mode || telephonySettings?.mode || process.env.VOXBAY_MODE || 'extension_to_mobile',
      sourceNumber: customConfig.sourceNumber || telephonySettings?.source_number || process.env.VOXBAY_SOURCE_MOBILE || '',
      deptId: customConfig.deptId || telephonySettings?.dept_id || process.env.VOXBAY_DEPT_ID || '0'
    };

    const agentExtension = finalConfig.extension;
    const callerId = finalConfig.callerId;

    console.log(`[CallingService] Initiating call to: ${cleanPhone} | Ext: ${agentExtension} | Mode: ${finalConfig.mode} | UID: ${finalConfig.uid}`);

    // Call Provider to start Click-to-Call
    const providerResult = await provider.initiateCall({
      phoneNumber: cleanPhone,
      agentExtension,
      callerId,
      sourceNumber: finalConfig.sourceNumber,
      customConfig: finalConfig,
      io: this.io
    });

    if (!providerResult.success && providerResult.mode !== 'simulator') {
      throw new Error(providerResult.error || providerResult.rawResponse || 'Voxbay call initiation failed');
    }

    const providerCallId = providerResult.providerCallId;

    // Create Call record in DB
    const callRecord = await createCallRecord(tenantId, {
      tenant_id: tenantId,
      user_id: userId,
      contact_id: contactId,
      phone_number: cleanPhone,
      caller_id: callerId,
      agent_extension: agentExtension,
      provider: providerName,
      provider_call_id: providerCallId,
      direction: 'outbound',
      status: 'initiated',
      duration: 0,
      conversation_duration: 0,
      recording_url: '',
      notes: notes || `Outbound call to ${cleanPhone}`,
      metadata: JSON.stringify({ mode: providerResult.mode, raw: providerResult.rawResponse || null })
    });

    const activeCallData = {
      id: callRecord.id,
      tenantId,
      userId,
      contactId,
      providerCallId,
      phoneNumber: cleanPhone,
      callerId,
      agentExtension,
      provider: providerName,
      status: 'initiated',
      startedAt: new Date().toISOString()
    };

    this.activeCalls.set(providerCallId, activeCallData);

    // Emit Realtime Status Event
    if (this.io) {
      this.io.emit('voxbay:call_status', {
        callUUID: providerCallId,
        status: 'RINGING',
        event: 'OUTGOING_CALL_INITIATED',
        data: {
          callId: callRecord.id,
          providerCallId,
          phoneNumber: cleanPhone,
          agentExtension,
          status: 'ringing'
        },
        timestamp: new Date().toISOString()
      });
    }

    // If Simulator mode, run asynchronous realistic progression
    if (providerResult.mode === 'simulator') {
      this.runSimulationFlow(providerCallId, cleanPhone, agentExtension, tenantId);
    }

    return {
      success: true,
      callId: callRecord.id,
      providerCallId,
      status: 'initiated',
      phoneNumber: cleanPhone,
      agentExtension,
      mode: providerResult.mode
    };
  }

  /**
   * Run realistic test call simulation for sandbox/testing
   */
  runSimulationFlow(providerCallId, destination, extension, tenantId) {
    if (!this.io) return;

    // 1. Ringing
    setTimeout(async () => {
      if (!this.activeCalls.has(providerCallId)) return;
      await updateCallRecord(providerCallId, { status: 'ringing' });
      this.io.emit('voxbay:call_status', {
        callUUID: providerCallId,
        status: 'RINGING',
        message: `Ringing destination ${destination}...`,
        timestamp: new Date().toISOString()
      });
    }, 1500);

    // 2. Answered
    setTimeout(async () => {
      if (!this.activeCalls.has(providerCallId)) return;
      await updateCallRecord(providerCallId, { 
        status: 'answered',
        answered_at: new Date().toISOString()
      });
      const active = this.activeCalls.get(providerCallId);
      if (active) active.status = 'answered';

      this.io.emit('voxbay:call_status', {
        callUUID: providerCallId,
        status: 'ANSWERED',
        message: `Call answered by ${destination}. Audio bridge active on extension ${extension}.`,
        timestamp: new Date().toISOString()
      });
    }, 3500);

    // 3. Completed & CDR Push
    setTimeout(async () => {
      if (!this.activeCalls.has(providerCallId)) return;
      const durationSeconds = Math.floor(15 + Math.random() * 25);
      const conversationDuration = Math.max(0, durationSeconds - 3);
      const recFilename = `rec-${Date.now()}.wav`;
      const recUrl = `https://x.voxbay.com:81/callcenter/${recFilename}`;

      await updateCallRecord(providerCallId, {
        status: 'completed',
        duration: durationSeconds,
        conversation_duration: conversationDuration,
        recording_url: recUrl,
        ended_at: new Date().toISOString()
      });

      this.activeCalls.delete(providerCallId);

      this.io.emit('voxbay:call_status', {
        callUUID: providerCallId,
        status: 'COMPLETED',
        event: 'OUTGOING_CDR_PUSH',
        data: {
          providerCallId,
          phoneNumber: destination,
          duration: durationSeconds,
          conversationDuration,
          recordingUrl: recUrl,
          status: 'completed'
        },
        timestamp: new Date().toISOString()
      });
    }, 14000);
  }

  /**
   * Hang up an active call
   */
  async hangupCall({ providerCallId, tenantId = 1 }) {
    console.log(`[CallingService] Hangup requested for ${providerCallId}`);
    const provider = this.getProvider('voxbay');
    
    // Call provider hangup
    await provider.hangupCall({ providerCallId });

    // Update DB record
    await updateCallRecord(providerCallId, {
      status: 'completed',
      ended_at: new Date().toISOString()
    });

    this.activeCalls.delete(providerCallId);

    // Emit Realtime status update
    if (this.io) {
      this.io.emit('voxbay:call_status', {
        callUUID: providerCallId,
        status: 'COMPLETED',
        event: 'CALL_DISCONNECTED',
        timestamp: new Date().toISOString()
      });
    }

    return {
      success: true,
      providerCallId,
      status: 'completed',
      message: 'Call hung up successfully.'
    };
  }

  /**
   * Process Webhook and CDR pushed from Voxbay
   */
  async handleWebhook(payload, query, providerName = 'voxbay') {
    const provider = this.getProvider(providerName);
    const parsed = provider.handleWebhook(payload, query);

    console.log(`[CallingService] Webhook received: [${parsed.eventType}] CallUUID: ${parsed.callUUID} Status: ${parsed.status}`);

    const callUUID = parsed.callUUID || `${Date.now()}`;

    // Prepare DB updates
    const updates = {
      status: parsed.status,
      duration: parsed.duration,
      conversation_duration: parsed.conversationDuration,
      recording_url: parsed.recordingUrl,
      dtmf: parsed.dtmf || ''
    };

    if (parsed.status === 'answered') {
      updates.answered_at = new Date().toISOString();
    } else if (parsed.status === 'completed' || parsed.status === 'no_answer' || parsed.status === 'busy' || parsed.status === 'failed') {
      updates.ended_at = new Date().toISOString();
      this.activeCalls.delete(callUUID);
    }

    // Try to update existing record, or create inbound call record
    let updatedRecord = await updateCallRecord(callUUID, updates);

    if (!updatedRecord && (parsed.direction === 'inbound' || parsed.phoneNumber)) {
      // Inbound call landed or new record
      updatedRecord = await createCallRecord(1, {
        tenant_id: 1,
        phone_number: parsed.phoneNumber,
        caller_id: parsed.callerId,
        agent_extension: parsed.agentExtension,
        provider: providerName,
        provider_call_id: callUUID,
        direction: parsed.direction || 'inbound',
        status: parsed.status,
        duration: parsed.duration,
        conversation_duration: parsed.conversationDuration,
        recording_url: parsed.recordingUrl,
        notes: `Inbound Voxbay Call from ${parsed.phoneNumber}`,
        metadata: JSON.stringify(parsed.rawPayload)
      });
    }

    // Emit Realtime Status to UI via Socket.io
    if (this.io) {
      this.io.emit('voxbay:call_status', {
        callUUID,
        status: parsed.rawStatus || parsed.status,
        event: parsed.eventType,
        data: {
          callUUID,
          ...updates,
          phoneNumber: parsed.phoneNumber,
          agentExtension: parsed.agentExtension
        },
        timestamp: new Date().toISOString()
      });

      // Also emit to general telecalling log stream if completed
      if (parsed.status === 'completed' && updatedRecord) {
        this.io.emit('telecalling:new_log', {
          id: updatedRecord.id,
          customer_phone: updatedRecord.phone_number,
          agent_name: `Extension ${updatedRecord.agent_extension || '101'}`,
          duration_seconds: updatedRecord.duration,
          recording_url: updatedRecord.recording_url,
          disposition: updatedRecord.status,
          created_at: updatedRecord.created_at
        });
      }
    }

    return 'success';
  }
}

export const callingService = new CallingService();
export default callingService;
