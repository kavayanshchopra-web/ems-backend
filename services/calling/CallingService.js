import { createCallRecord, updateCallRecord, getTelephonySettings } from '../../db.js';

class CallingService {
  constructor() {
    this.providers = new Map();
    this.activeCalls = new Map();
  }

  registerProvider(provider) {
    if (!provider || !provider.name) return;
    this.providers.set(provider.name.toLowerCase(), provider);
    console.log(`[CallingService] Registered calling provider: ${provider.name}`);
  }

  getProvider(name = 'sim_runo') {
    const p = this.providers.get(name.toLowerCase());
    return p || null;
  }

  async initiateCall({
    tenantId = 1,
    phoneNumber,
    destination,
    contactId = null,
    contactName = 'Customer',
    staffId = '1',
    staffName = 'Agent',
    providerName = 'sim_runo',
    callingMode = 'mobile_to_mobile',
    io = null
  }) {
    const rawTarget = phoneNumber || destination;
    const cleanDestination = String(rawTarget).replace(/\D/g, '');

    if (!cleanDestination) {
      throw new Error('Destination phone number is required.');
    }

    const settings = await getTelephonySettings(tenantId).catch(() => ({}));
    const callerId = settings?.caller_id || '918031496345';
    const internalCallId = `call_${Date.now()}`;
    const providerCallId = `sim_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // Save call record to DB
    const callRecord = {
      tenantId,
      staffId,
      staffName,
      customerName: contactName,
      customerPhone: cleanDestination,
      channel: 'SIM_COMPANION',
      type: 'OUTGOING',
      callUUID: providerCallId,
      status: 'RINGING',
      disposition: 'Dialing',
      durationSeconds: 0,
      createdAt: new Date().toISOString()
    };

    try {
      const saved = await createCallRecord(tenantId, {
        user_id: staffId,
        contact_id: contactId,
        phone_number: cleanDestination,
        caller_id: callerId,
        agent_extension: '101',
        provider: 'sim_runo',
        provider_call_id: providerCallId,
        direction: 'outbound',
        status: 'initiated',
        notes: `Call initiated via SIM Companion to ${contactName}`
      });
      if (saved) callRecord.id = saved.id;
    } catch (e) {
      console.warn('[CallingService] Log creation note:', e.message);
    }

    this.activeCalls.set(internalCallId, callRecord);

    if (io) {
      io.emit('telecalling:call_initiated', callRecord);
      io.emit('telecalling:status_update', { callId: internalCallId, status: 'RINGING' });
    }

    return {
      success: true,
      callId: internalCallId,
      providerCallId,
      destination: cleanDestination,
      callingMode,
      message: 'Call initiated successfully via SIM Companion.'
    };
  }

  async endCall({ callId, callUuid, io = null }) {
    console.log(`[CallingService] Ending active call ${callId || callUuid || ''}...`);
    const targetId = callId || callUuid;
    if (targetId && this.activeCalls.has(targetId)) {
      const call = this.activeCalls.get(targetId);
      call.status = 'COMPLETED';
      this.activeCalls.delete(targetId);
    }

    if (io) {
      io.emit('telecalling:status_update', { callId: targetId, status: 'COMPLETED' });
    }

    return { success: true, message: 'Call hangup signal dispatched.' };
  }

  async handleWebhook(payload, io = null) {
    if (!payload) return null;
    const callUuid = payload.callUuid || payload.call_uuid || payload.CallUUID;
    const status = payload.status || payload.CallStatus || 'completed';
    const duration = parseInt(payload.duration || payload.Duration || '0', 10);
    const recordingUrl = payload.recordingUrl || payload.RecordingUrl || '';

    if (callUuid) {
      try {
        await updateCallRecord(callUuid, {
          callStatus: status,
          totalDuration: `${duration}s`,
          conversationDuration: `${duration}s`,
          recordingUrl
        });
      } catch (dbErr) {
        console.warn('[CallingService] Webhook DB sync notice:', dbErr.message);
      }

      if (io) {
        io.emit('telecalling:status_update', {
          callUUID: callUuid,
          status
        });
      }
      return { callUuid, status, duration, recordingUrl };
    }
    return null;
  }
}

export default new CallingService();