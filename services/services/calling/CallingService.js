import VoxbayProvider from './VoxbayProvider.js';
import desktopBridge from './desktopBridge.js';
import { createCallLog, updateCallRecord, getTelephonySettings } from '../../db.js';

class CallingService {
  constructor() {
    this.providers = new Map();
    this.activeCalls = new Map();

    // Register Default Voxbay Provider
    this.registerProvider(new VoxbayProvider());
  }

  registerProvider(provider) {
    this.providers.set(provider.name.toLowerCase(), provider);
    console.log(`[CallingService] Registered calling provider: ${provider.name}`);
  }

  getProvider(name = 'voxbay') {
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
    agentExtension = '2MaqwezO',
    agentMobile = '6283513686',
    callingMode = 'extension_to_mobile',
    customUid,
    customUpin,
    customDid,
    io = null
  }) {
    const rawTarget = phoneNumber || destination;
    const cleanDestination = String(rawTarget).replace(/\D/g, '');

    if (!cleanDestination) {
      throw new Error('Destination phone number is required.');
    }

    // 1. Direct native dial on Windows Voxbay Phone client if in extension mode
    if (callingMode === 'extension_to_mobile') {
      desktopBridge.dialNumber(cleanDestination);
    }

    // 2. Resolve settings or use verified production defaults
    const settings = await getTelephonySettings(tenantId).catch(() => ({}));
    const uid = customUid || settings?.voxbay_uid || 'x97x4zzfz1';
    const upin = customUpin || settings?.voxbay_upin || '8uqctamkgf';
    const did = customDid || settings?.voxbay_did || '918031496345';
    const ext = agentExtension || settings?.voxbay_agent_extension || '2MaqwezO';
    const mobile = agentMobile || settings?.voxbay_agent_mobile || '6283513686';

    const provider = this.getProvider('voxbay');

    // 3. Initiate Cloud Telephony Request
    const result = await provider.initiateCall({
      destination: cleanDestination,
      fromNumber: did,
      extension: ext,
      agentMobile: mobile,
      mode: callingMode,
      contactName,
      credentials: {
        uid,
        upin,
        callerid: did,
        deptId: '0'
      }
    });

    // 4. Save call record to DB
    const internalCallId = `call_${Date.now()}`;
    const callRecord = {
      tenantId,
      staffId,
      staffName,
      customerName: contactName,
      customerPhone: cleanDestination,
      channel: 'VOXBAY',
      type: 'OUTGOING',
      callUUID: result.providerCallId || `vox_${Date.now()}`,
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
      providerCallId: result.providerCallId,
      destination: cleanDestination,
      callingMode,
      message: result.message || 'Voxbay call dispatched successfully.'
    };
  }

  async endCall({ callId, callUuid, io = null }) {
    console.log(`[CallingService] Ending active call ${callId || callUuid || ''}...`);

    // Terminate call in Windows desktop softphone
    desktopBridge.hangupCall();

    if (io) {
      io.emit('telecalling:status_update', { callId: callId || callUuid, status: 'COMPLETED' });
    }

    return { success: true, message: 'Call hangup signal dispatched.' };
  }

  async handleWebhook(payload, io = null) {
    const provider = this.getProvider('voxbay');
    const normalized = provider.processWebhook(payload);

    if (normalized && normalized.callUUID) {
      try {
        await updateCallRecord(normalized.callUUID, {
          callStatus: normalized.callStatus,
          totalDuration: normalized.totalCallDuration,
          conversationDuration: normalized.conversationDuration,
          recordingUrl: normalized.recording_URL
        });
      } catch (dbErr) {
        console.warn('[CallingService] Webhook DB sync notice:', dbErr.message);
      }

      if (io) {
        io.emit('telecalling:cdr_received', normalized);
        io.emit('telecalling:status_update', {
          callUUID: normalized.callUUID,
          status: normalized.callStatus
        });
      }
      return normalized;
    }
    return null;
  }
}

export default new CallingService();