import PlivoProvider from './PlivoProvider.js';
import VoxbayProvider from './VoxbayProvider.js';
import { createCallLog, updateCallRecord, getTelephonySettings } from '../../db.js';

class CallingService {
  constructor() {
    this.providers = new Map();
    this.activeCalls = new Map();

    // Register Default Universal Cloud Providers (Plivo is Primary)
    this.registerProvider(new PlivoProvider());
    this.registerProvider(new VoxbayProvider());
  }

  registerProvider(provider) {
    this.providers.set(provider.name.toLowerCase(), provider);
    console.log(`[CallingService] Registered calling provider: ${provider.name}`);
  }

  getProvider(name = 'plivo') {
    const p = this.providers.get(name.toLowerCase());
    if (!p) throw new Error(`Calling provider '${name}' not found.`);
    return p;
  }

  async initiateCall({
    tenantId = 1,
    phoneNumber,
    destination,
    contactId = null,
    contactName = 'Customer',
    staffId = '1',
    staffName = 'Agent',
    providerName = 'plivo',
    callingMode = 'browser_webrtc',
    io = null
  }) {
    const rawTarget = phoneNumber || destination;
    const cleanDestination = String(rawTarget).replace(/\D/g, '');

    if (!cleanDestination) {
      throw new Error('Destination phone number is required.');
    }

    const provider = this.getProvider(providerName || 'plivo');
    const settings = await getTelephonySettings(tenantId).catch(() => ({}));
    const callerId = settings?.caller_id || provider.defaultCallerId || '918031496345';

    let result = { success: true, providerCallId: `call_${Date.now()}` };

    if (provider.name === 'plivo') {
      result = await provider.initiateCall({
        destination: cleanDestination,
        fromNumber: callerId,
        tenantId
      });
    } else {
      result = await provider.initiateCall({
        destination: cleanDestination,
        fromNumber: callerId,
        contactName
      });
    }

    // Save call record to DB
    const internalCallId = `call_${Date.now()}`;
    const callRecord = {
      tenantId,
      staffId,
      staffName,
      customerName: contactName,
      customerPhone: cleanDestination,
      channel: 'PLIVO_WEBRTC',
      type: 'OUTGOING',
      callUUID: result.callUuid || result.providerCallId || internalCallId,
      status: 'RINGING',
      disposition: 'Dialing',
      durationSeconds: 0,
      createdAt: new Date().toISOString()
    };

    try {
      const saved = await createCallLog(tenantId, callRecord);
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
      providerCallId: result.callUuid || result.providerCallId,
      destination: cleanDestination,
      callingMode,
      message: result.message || 'Call initiated successfully via Plivo Cloud WebRTC.'
    };
  }

  async endCall({ callId, callUuid, io = null }) {
    console.log(`[CallingService] Ending active call ${callId || callUuid || ''}...`);
    const provider = this.getProvider('plivo');
    await provider.endCall({ callUuid: callUuid || callId });

    if (io) {
      io.emit('telecalling:status_update', { callId: callId || callUuid, status: 'COMPLETED' });
    }

    return { success: true, message: 'Call hangup signal dispatched.' };
  }

  async handleWebhook(payload, io = null) {
    const provider = this.getProvider('plivo');
    const normalized = provider.processWebhook(payload);

    if (normalized && normalized.callUuid) {
      try {
        await updateCallRecord(normalized.callUuid, {
          callStatus: normalized.status,
          totalDuration: `${normalized.durationSeconds}s`,
          conversationDuration: `${normalized.durationSeconds}s`,
          recordingUrl: normalized.recordingUrl
        });
      } catch (dbErr) {
        console.warn('[CallingService] Webhook DB sync notice:', dbErr.message);
      }

      if (io) {
        io.emit('telecalling:cdr_received', normalized);
        io.emit('telecalling:status_update', {
          callUUID: normalized.callUuid,
          status: normalized.status
        });
      }
      return normalized;
    }
    return null;
  }
}

export default new CallingService();