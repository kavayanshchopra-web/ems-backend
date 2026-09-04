/**
 * TIMELINE & MULTI-CHANNEL CONVERSATION MERGE ENGINE
 * Unifies WhatsApp Messages, Telecalling Logs (with audio recordings), and CRM Notes
 */

export class TimelineEngine {
  /**
   * Normalize raw WhatsApp messages into standard timeline events
   * @param {Array<Object>} rawMessages 
   * @returns {Array<Object>}
   */
  static normalizeWhatsAppMessages(rawMessages = []) {
    if (!Array.isArray(rawMessages)) return [];

    return rawMessages.map((m, idx) => {
      let ts = m.timestamp || m.time || m.createdAt || Date.now();
      if (typeof ts === 'number' && ts < 10000000000) {
        ts = ts * 1000; // Convert sec to ms
      } else if (typeof ts === 'string') {
        ts = new Date(ts).getTime() || Date.now();
      }

      return {
        id: m.id || m.key?.id || `wa_msg_${idx}_${ts}`,
        type: 'whatsapp',
        timestamp: ts,
        fromMe: Boolean(m.from_me || m.fromMe || m.key?.fromMe),
        content: m.text_content || m.text || m.body || m.message?.conversation || m.message?.extendedTextMessage?.text || '',
        mediaUrl: m.media_url || m.mediaUrl || m.attachmentUrl || null,
        mediaType: m.media_type || m.mediaType || null,
        status: m.status || (m.is_read ? 'read' : 'delivered'),
        channel: 'WHATSAPP',
        raw: m
      };
    });
  }

  /**
   * Normalize and filter call logs matching a specific contact
   * @param {Array<Object>} rawCallLogs 
   * @param {string} targetPhone 
   * @param {string} [targetName]
   * @returns {Array<Object>}
   */
  static normalizeCallLogsForContact(rawCallLogs = [], targetPhone = '', targetName = '') {
    if (!Array.isArray(rawCallLogs)) return [];

    const cleanTargetDigits = String(targetPhone || '').replace(/\D/g, '');
    const normTarget10 = cleanTargetDigits.length >= 7 ? cleanTargetDigits.slice(-10) : '';
    const normTargetName = String(targetName || '').trim().toLowerCase();

    return rawCallLogs.filter(call => {
      if (!call) return false;
      const callPhone = String(call.customerPhone || call.customer_phone || call.phoneNumber || call.phone || call.number || '').replace(/\D/g, '');
      const callNorm10 = callPhone.length >= 7 ? callPhone.slice(-10) : '';
      
      const phoneMatched = normTarget10 && callNorm10 && normTarget10 === callNorm10;
      const nameMatched = normTargetName && call.customerName && String(call.customerName).trim().toLowerCase() === normTargetName;

      return phoneMatched || nameMatched;
    }).map((c, idx) => {
      let ts = c._createdAt || c.createdAt || c.timestamp || c.callTime || c.time || Date.now();
      if (typeof ts === 'number' && ts < 10000000000) {
        ts = ts * 1000;
      } else if (typeof ts === 'string') {
        ts = new Date(ts).getTime() || Date.now();
      }

      const rawType = String(c.type || c.callType || c.call_type || 'OUTGOING').toUpperCase();
      let callType = 'OUTGOING';
      if (rawType.includes('IN') || rawType === 'INBOUND') callType = 'INCOMING';
      else if (rawType.includes('MISS')) callType = 'MISSED';
      else if (rawType.includes('REJ')) callType = 'REJECTED';

      const durationSec = Number(c.duration || c.durationSeconds || c.duration_seconds || 0);
      const recording = c.recordingUrl || c.recording || c.audioUrl || c.recording_url || c.fileUrl || null;

      return {
        id: c.id || `call_log_${idx}_${ts}`,
        type: 'call',
        timestamp: ts,
        fromMe: callType === 'OUTGOING',
        callType,
        durationSeconds: durationSec,
        recordingUrl: recording,
        agentName: c.agentName || c.employeeName || c.staffName || c.agent || 'Agent',
        channel: c.channel || (String(c.id).startsWith('vox_') ? 'VOXBAY' : 'SIM'),
        disposition: c.disposition || c.status || (durationSec > 0 ? 'Connected' : 'No Answer'),
        notes: c.notes || c.remark || '',
        raw: c
      };
    });
  }

  /**
   * Merge WhatsApp messages and Call recordings into a single chronological stream
   * @param {Array<Object>} messages 
   * @param {Array<Object>} callLogs 
   * @param {Array<Object>} [notes]
   * @returns {{ timeline: Array<Object>, stats: Object }}
   */
  static mergeAndSortTimeline(messages = [], callLogs = [], notes = []) {
    const combined = [
      ...this.normalizeWhatsAppMessages(messages),
      ...callLogs,
      ...(Array.isArray(notes) ? notes : [])
    ];

    // Deduplicate by ID
    const dedupMap = new Map();
    combined.forEach(item => {
      if (item && item.id) {
        dedupMap.set(String(item.id), item);
      }
    });

    // Sort ascending by timestamp (oldest first for natural chat reading flow)
    const timeline = Array.from(dedupMap.values()).sort((a, b) => a.timestamp - b.timestamp);

    // Compute rollup analytics
    const waMessages = timeline.filter(t => t.type === 'whatsapp');
    const calls = timeline.filter(t => t.type === 'call');
    const totalCallSeconds = calls.reduce((acc, c) => acc + (c.durationSeconds || 0), 0);

    const stats = {
      totalEvents: timeline.length,
      totalMessages: waMessages.length,
      totalCalls: calls.length,
      inboundCalls: calls.filter(c => c.callType === 'INCOMING').length,
      outboundCalls: calls.filter(c => c.callType === 'OUTGOING').length,
      missedCalls: calls.filter(c => c.callType === 'MISSED' || c.callType === 'REJECTED').length,
      totalDurationSeconds: totalCallSeconds,
      hasRecordings: calls.filter(c => Boolean(c.recordingUrl)).length,
      lastInteraction: timeline.length > 0 ? timeline[timeline.length - 1] : null
    };

    return { timeline, stats };
  }

  /**
   * Formats duration in seconds to "MM:SS" or "Xm Ys"
   */
  static formatDuration(seconds = 0) {
    const s = Math.round(Number(seconds) || 0);
    if (s <= 0) return '0s';
    const mins = Math.floor(s / 60);
    const remainingSecs = s % 60;
    if (mins === 0) return `${remainingSecs}s`;
    return `${mins}m ${remainingSecs}s`;
  }
}
