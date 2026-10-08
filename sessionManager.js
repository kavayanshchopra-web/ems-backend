import makeWASocket, { 
  useMultiFileAuthState, 
  DisconnectReason,
  downloadMediaMessage,
  fetchLatestWaWebVersion,
  Browsers
} from '@whiskeysockets/baileys';
import path from 'path';
import fs from 'fs';
import QRCode from 'qrcode';
import pino from 'pino';
import { fileURLToPath } from 'url';
import { 
  updateSessionStatus, 
  saveContact, 
  saveMessage, 
  getSession, 
  deleteSession as dbDeleteSession,
  getAllSessions,
  saveLidMapping,
  getPnFromLid,
  updateContactProfilePic,
  updateMessageMediaUrl,
  getDb,
  updateMessageStatus,
  getChatbotRules,
  getPendingScheduledMessages,
  updateScheduledMessageStatus,
  getTenantPlanDetails,
  updateMessageReaction,
  deleteMessageRecord
} from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sessionsDir = path.join(__dirname, 'auth_info_baileys');
const mediaStorePath = path.join(__dirname, 'media_store');

// Ensure sessions and media_store directories exist
if (!fs.existsSync(sessionsDir)) {
  fs.mkdirSync(sessionsDir, { recursive: true });
}
if (!fs.existsSync(mediaStorePath)) {
  fs.mkdirSync(mediaStorePath, { recursive: true });
}

// Helper to download and decrypt WhatsApp media attachments
async function handleDownloadMedia(msg, mediaType) {
  try {
    const messageContent = msg.message;
    if (!messageContent) return null;

    let ext = '';
    if (mediaType === 'image') ext = '.jpg';
    else if (mediaType === 'video') ext = '.mp4';
    else if (mediaType === 'audio') ext = '.ogg';
    else ext = '.bin';

    if (msg.message?.documentMessage) {
      const fileName = msg.message.documentMessage.fileName || '';
      ext = path.extname(fileName) || '.bin';
    }

    const logger = pino({ level: 'silent' });
    const buffer = await downloadMediaMessage(
      msg,
      'buffer',
      {},
      {
        logger,
        rekey: false
      }
    );

    if (buffer) {
      const fileName = `media_${msg.key.id}_${Date.now()}${ext}`;
      const filePath = path.join(mediaStorePath, fileName);
      fs.writeFileSync(filePath, buffer);
      return `/media/${fileName}`;
    }
  } catch (err) {
    console.error(`[Media Download] Failed for message ${msg.key?.id}:`, err.message);
  }
  return null;
}

// Trigger media download asynchronously in the background so it doesn't block Express or the main socket
function triggerDownloadMediaBackground(msg, mediaType, io, tenantId) {
  if (mediaType === 'text') return;
  const msgId = msg.key.id;

  handleDownloadMedia(msg, mediaType)
    .then(async (mediaUrl) => {
      if (mediaUrl) {
        await updateMessageMediaUrl(msgId, mediaUrl);
        // Broadcast media downloaded update event to client in tenant room
        if (tenantId) {
          io.to(`tenant_${tenantId}`).emit('media_downloaded', { id: msgId, mediaUrl, media_url: mediaUrl });
        } else {
          io.emit('media_downloaded', { id: msgId, mediaUrl, media_url: mediaUrl });
        }
      }
    })
    .catch((err) => {
      console.error(`[Media Sync] Background download failed for ${msgId}:`, err.message);
    });
}

// Map to hold active sockets
const activeSockets = new Map();
// Map to hold debounced reconnect timers to prevent tight loop flapping
const reconnectTimers = new Map();

// In-memory cache for WA Web Version to prevent 3s network stalls on reconnects
let cachedWaWebVersion = null;

// Global promise chain to serialize database transactions during history sync
let dbSyncQueue = Promise.resolve();

// Initialize all saved sessions from DB on startup
export async function initAllSessions(io) {
  try {
    const sessions = await getAllSessions();
    console.log(`Checking ${sessions.length} saved sessions...`);
    for (const session of sessions) {
      // ONLY auto-reconnect if it was previously connected, NOT unlinked/stale sessions
      if (session.status === 'connected') {
        console.log(`Auto-reconnecting session: ${session.phone_name} (${session.id})`);
        startSession(session.id, io).catch(err => {
          console.error(`Failed to auto-start session ${session.id}:`, err);
        });
      }
    }
    
    // Start scheduled messages worker
    startScheduledMessagesWorker(io);
  } catch (err) {
    console.error('Error during initAllSessions:', err);
  }
}

// Start a single WhatsApp session
export async function startSession(id, io) {
  // Cancel any pending reconnect timer for this session
  if (reconnectTimers.has(id)) {
    clearTimeout(reconnectTimers.get(id));
    reconnectTimers.delete(id);
  }

  if (activeSockets.has(id)) {
    const existingSock = activeSockets.get(id);
    if (existingSock?.user?.id) {
      console.log(`Session ${id} is already connected.`);
      return existingSock;
    }
    try {
      existingSock.ev?.removeAllListeners();
      existingSock.end(new Error('Resetting socket for fresh QR'));
    } catch (e) {}
    activeSockets.delete(id);
  }

  const session = await getSession(id);
  const tenantId = session?.tenant_id || 1;
  const tenantRoom = `tenant_${tenantId}`;
  const emitToTenant = (event, data) => {
    try {
      io.to(tenantRoom).emit(event, data);
      if (String(tenantId) === '1' || tenantId === 1) {
        io.to('tenant_default').emit(event, data);
      }
      io.emit(event, { ...data, tenantId });
    } catch {
      try {
        io.emit(event, { ...data, tenantId });
      } catch {}
    }
  };

  const sessionPath = path.join(sessionsDir, id);

  // If credentials exist but are unlinked/corrupted (no registered user), clean them so a fresh cryptographic keypair is generated
  if (fs.existsSync(sessionPath)) {
    try {
      const credsPath = path.join(sessionPath, 'creds.json');
      if (fs.existsSync(credsPath)) {
        const credsRaw = fs.readFileSync(credsPath, 'utf8');
        const creds = JSON.parse(credsRaw);
        if (!creds?.me?.id && !creds?.registered) {
          console.log(`[Session ${id}] Cleaning unlinked auth folder for fresh QR keys...`);
          fs.rmSync(sessionPath, { recursive: true, force: true });
        }
      }
    } catch (e) {
      console.warn(`[Session ${id}] Creds validation warning:`, e.message);
    }
  }

  const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

  // Set up low-verbosity logger for Baileys
  const logger = pino({ level: 'silent' });

  // Fast WA Web version resolution (cached in-memory, or 1.5s fast timeout)
  let version = cachedWaWebVersion;
  if (!version) {
    try {
      const versionPromise = fetchLatestWaWebVersion();
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Version fetch timeout')), 1500));
      const res = await Promise.race([versionPromise, timeoutPromise]);
      if (res && res.version && Array.isArray(res.version)) {
        version = res.version;
        cachedWaWebVersion = version;
        console.log(`[Session ${id}] Using live WAWeb version: ${version.join('.')}`);
      }
    } catch (vErr) {
      console.log(`[Session ${id}] Using Baileys internal tested version default`);
    }
  }

  const socketOptions = {
    auth: state,
    logger,
    printQRInTerminal: false,
    browser: Browsers.macOS('Chrome'), // Legitimate desktop user agent to prevent 428 / "Could not link device" anti-bot flags
    connectTimeoutMs: 60000,
    defaultQueryTimeoutMs: 60000,
    keepAliveIntervalMs: 25000,
    syncFullHistory: true, // Allow history sync messages to be received from phone
    shouldSyncHistoryMessage: () => true, // Ensure history sync messages are processed
    markOnlineOnConnect: false,
    retryRequestDelayMs: 250,
    generateHighQualityLinkPreview: false
  };

  if (version) {
    socketOptions.version = version;
  }

  const sock = makeWASocket(socketOptions);

  activeSockets.set(id, sock);

  // Connection Updates
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log(`[Session ${id}] QR code received.`);
      try {
        const qrDataUrl = await QRCode.toDataURL(qr, { scale: 8, margin: 2 });
        await updateSessionStatus(id, 'qr_ready', qrDataUrl, null);
        emitToTenant('session_update', { id, status: 'qr_ready', qr: qrDataUrl, qr_code: qrDataUrl });
      } catch (err) {
        console.error('Error generating QR data URL:', err);
      }
    } else if (connection === 'connecting') {
      console.log(`[Session ${id}] Connecting...`);
      await updateSessionStatus(id, 'connecting', null, null);
      emitToTenant('session_update', { id, status: 'connecting' });
    }

    if (connection === 'open') {
      const rawUser = sock.user.id;
      const phoneNumber = rawUser.split(':')[0];
      console.log(`[Session ${id}] Connected successfully as ${phoneNumber}`);
      
      let profilePicUrl = null;
      try {
        profilePicUrl = await sock.profilePictureUrl(phoneNumber + '@s.whatsapp.net', 'image');
      } catch (err) {
        // Ignore if no profile picture exists or restricted
      }
      
      await updateSessionStatus(id, 'connected', null, phoneNumber, profilePicUrl);
      emitToTenant('session_update', { id, status: 'connected', phoneNumber, profilePicUrl });
    }

    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log(`[Session ${id}] Connection closed. Reason:`, lastDisconnect?.error?.message, `Reconnecting: ${shouldReconnect}`);
      if (lastDisconnect?.error) {
        console.error(`[Session ${id}] Connection error object:`, JSON.stringify(lastDisconnect.error, null, 2) || lastDisconnect.error);
      }

      activeSockets.delete(id);

      if (shouldReconnect) {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const isRestartRequired = statusCode === DisconnectReason.restartRequired; // Code 515 handshake restart
        const delayMs = isRestartRequired ? 200 : 2500; // Immediate reconnect on Code 515 for fast linking!

        if (reconnectTimers.has(id)) {
          clearTimeout(reconnectTimers.get(id));
        }
        console.log(`[Session ${id}] Scheduling safe backoff reconnect in ${delayMs}ms (status code: ${statusCode || 'unknown'})...`);
        const timer = setTimeout(() => {
          reconnectTimers.delete(id);
          startSession(id, io).catch(err => {
            console.error(`[Session ${id}] Reconnect failed:`, err.message);
          });
        }, delayMs);
        reconnectTimers.set(id, timer);
      } else {
        // Logged out: clean credentials folder and delete session socket
        console.log(`[Session ${id}] Logged out. Cleaning files...`);
        if (reconnectTimers.has(id)) {
          clearTimeout(reconnectTimers.get(id));
          reconnectTimers.delete(id);
        }
        await updateSessionStatus(id, 'disconnected', null, null);
        
        if (fs.existsSync(sessionPath)) {
          fs.rmSync(sessionPath, { recursive: true, force: true });
        }
        
        emitToTenant('session_update', { id, status: 'disconnected' });
      }
    }
  });

  // Save auth credentials whenever updated
  sock.ev.on('creds.update', saveCreds);

  // Handle WhatsApp History Sync (Sync chats, contacts, and messages from phone inside transactions)
  sock.ev.on('messaging-history.set', (history) => {
    dbSyncQueue = dbSyncQueue.then(async () => {
      const { chats, contacts, messages } = history;
      console.log(`[Session ${id}] Received history sync. Chats: ${chats?.length || 0}, Contacts: ${contacts?.length || 0}, Messages: ${messages?.length || 0}`);
      
      const db = getDb();

      // 0. Sync chats inside a transaction
      if (chats && chats.length > 0) {
        await db.run('BEGIN TRANSACTION');
        try {
          for (const chat of chats) {
            const jid = chat.id;
            if (!jid || jid === 'status@broadcast' || jid.endsWith('@broadcast') || jid.endsWith('@newsletter')) continue;
            const name = chat.name || null;
            await db.run(
              `INSERT OR IGNORE INTO contacts (id, name, pipeline_stage, labels, tenant_id) VALUES (?, ?, 'new', '[]', ?)`,
              [jid, name, tenantId]
            );
            if (name) {
              await db.run(
                `UPDATE contacts SET name = ? WHERE id = ? AND tenant_id = ? AND (name IS NULL OR name = '')`,
                [name, jid, tenantId]
              );
            }
          }
          await db.run('COMMIT');
          console.log(`[Session ${id}] Transaction: Successfully synced ${chats.length} history chats.`);
        } catch (err) {
          await db.run('ROLLBACK');
          console.error(`[History Sync] Failed to sync chats:`, err.message);
        }
      }
      
      // 1. Sync contacts inside a transaction
      if (contacts && contacts.length > 0) {
        await db.run('BEGIN TRANSACTION');
        try {
          for (const contact of contacts) {
            const jid = contact.id;
            if (!jid || jid === 'status@broadcast') continue;
            const name = contact.name || contact.verifiedName || contact.notify || null;
            
            await db.run(
              `INSERT OR IGNORE INTO contacts (id, name, pipeline_stage, labels, tenant_id) VALUES (?, ?, 'new', '[]', ?)`,
              [jid, name, tenantId]
            );
            if (name) {
              await db.run(
                `UPDATE contacts SET name = ? WHERE id = ? AND tenant_id = ? AND (name IS NULL OR name = '')`,
                [name, jid, tenantId]
              );
            }
          }
          await db.run('COMMIT');
          console.log(`[Session ${id}] Transaction: Successfully synced ${contacts.length} history contacts.`);
        } catch (err) {
          await db.run('ROLLBACK');
          console.error(`[History Sync] Failed to sync contacts:`, err.message);
        }
      }

      // 2. Sync messages inside an ultra-fast batched transaction
      if (messages && messages.length > 0) {
        // Collect newly discovered LID mappings
        const newLidMappings = [];
        const inMemoryLidMap = new Map();

        // Load existing LID mappings into memory in a SINGLE query (<1ms)
        try {
          const existingLids = await db.all(`SELECT lid, pn FROM lid_mappings`);
          (existingLids || []).forEach(row => {
            if (row.lid && row.pn) inMemoryLidMap.set(row.lid, row.pn);
          });
        } catch (e) {}

        const messagesByJid = {};
        for (const msg of messages) {
          let jid = msg.key?.remoteJid;
          if (!jid || jid === 'status@broadcast') continue;

          // Map LID to real Phone JID
          const lid = jid;
          const pn = msg.key?.remoteJidAlt;
          let resolvedJid = jid;
          if (pn && pn.endsWith('@s.whatsapp.net')) {
            newLidMappings.push([lid, pn]);
            inMemoryLidMap.set(lid, pn);
            resolvedJid = pn;
          } else if (lid.endsWith('@lid')) {
            if (inMemoryLidMap.has(lid)) {
              resolvedJid = inMemoryLidMap.get(lid);
            }
          }

          if (!messagesByJid[resolvedJid]) {
            messagesByJid[resolvedJid] = [];
          }
          messagesByJid[resolvedJid].push({ msg, resolvedJid });
        }

        // For each contact, sort messages by timestamp descending (newest first) and keep only latest 50
        const messagesToInsert = [];
        for (const jid in messagesByJid) {
          const list = messagesByJid[jid];
          list.sort((a, b) => {
            const tsA = typeof a.msg.messageTimestamp === 'object' && a.msg.messageTimestamp !== null
              ? a.msg.messageTimestamp.low || a.msg.messageTimestamp.toNumber?.() || 0
              : a.msg.messageTimestamp || 0;
            const tsB = typeof b.msg.messageTimestamp === 'object' && b.msg.messageTimestamp !== null
              ? b.msg.messageTimestamp.low || b.msg.messageTimestamp.toNumber?.() || 0
              : b.msg.messageTimestamp || 0;
            return tsB - tsA; // Descending (newest first)
          });
          
          messagesToInsert.push(...list.slice(0, 50));
        }

        await db.run('BEGIN TRANSACTION');
        try {
          // A. Batch insert new LID mappings inside transaction
          for (const [lid, pn] of newLidMappings) {
            await db.run(
              `INSERT OR REPLACE INTO lid_mappings (lid, pn) VALUES (?, ?)`,
              [lid, pn]
            );
          }

          // B. Deduplicate contacts in memory so each contact is upserted only once
          const distinctContacts = new Map();
          for (const item of messagesToInsert) {
            const { msg, resolvedJid: jid } = item;
            const contactName = msg.key?.fromMe ? null : msg.pushName;
            if (jid && !distinctContacts.has(jid)) {
              distinctContacts.set(jid, contactName);
            } else if (contactName && !distinctContacts.get(jid)) {
              distinctContacts.set(jid, contactName);
            }
          }

          for (const [jid, contactName] of distinctContacts.entries()) {
            await db.run(
              `INSERT OR IGNORE INTO contacts (id, name, pipeline_stage, labels, tenant_id) VALUES (?, ?, 'new', '[]', ?)`,
              [jid, contactName, tenantId]
            );
            if (contactName) {
              await db.run(
                `UPDATE contacts SET name = ? WHERE id = ? AND tenant_id = ? AND (name IS NULL OR name = '')`,
                [contactName, jid, tenantId]
              );
            }
          }

          // C. Insert history messages
          for (const item of messagesToInsert) {
            const { msg, resolvedJid: jid } = item;
            const textContent = getMessageText(msg.message);

            let mediaType = 'text';
            if (msg.message?.imageMessage) mediaType = 'image';
            else if (msg.message?.documentMessage) mediaType = 'document';
            else if (msg.message?.audioMessage) mediaType = 'audio';
            else if (msg.message?.videoMessage) mediaType = 'video';

            if (!textContent && mediaType === 'text') continue;

            const timestamp = typeof msg.messageTimestamp === 'object' && msg.messageTimestamp !== null
              ? msg.messageTimestamp.low || msg.messageTimestamp.toNumber?.() || Math.floor(Date.now() / 1000)
              : msg.messageTimestamp || Math.floor(Date.now() / 1000);

            await db.run(
              `INSERT OR REPLACE INTO messages (id, session_id, contact_id, from_me, text_content, media_url, media_type, timestamp, is_read, tenant_id)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [msg.key.id, id, jid, msg.key.fromMe ? 1 : 0, textContent || (mediaType !== 'text' ? `[Sent ${mediaType}]` : ''), null, mediaType, timestamp, 1, tenantId]
            );
          }

          await db.run('COMMIT');
          console.log(`[Session ${id}] Transaction: Successfully synced ${messagesToInsert.length} history messages (capped at 50 per chat).`);
        } catch (err) {
          await db.run('ROLLBACK');
          console.error(`[History Sync] Failed to sync messages:`, err.message);
        }
      }

      // Trigger frontend reload
      emitToTenant('new_message', { system_sync: true, tenantId });
      emitToTenant('history_synced', { session_id: id, count: messages?.length || 0, tenantId });
    }).catch(err => {
      console.error(`[History Sync Queue Error]`, err);
    });
  });

  // Chats upsert handler (realtime sync of new or active chats)
  sock.ev.on('chats.upsert', async (chatsList) => {
    try {
      const db = getDb();
      for (const chat of chatsList) {
        const jid = chat.id;
        if (!jid || jid === 'status@broadcast' || jid.endsWith('@broadcast') || jid.endsWith('@newsletter')) continue;
        const name = chat.name || null;
        await db.run(
          `INSERT OR IGNORE INTO contacts (id, name, pipeline_stage, labels, tenant_id) VALUES (?, ?, 'new', '[]', ?)`,
          [jid, name, tenantId]
        );
        if (name) {
          await db.run(
            `UPDATE contacts SET name = ? WHERE id = ? AND tenant_id = ? AND (name IS NULL OR name = '')`,
            [name, jid, tenantId]
          );
        }
      }
      emitToTenant('new_message', { system_sync: true });
    } catch (err) {
      console.error('Error handling chats.upsert:', err);
    }
  });

  // Contact Address Book Sync Handlers
  sock.ev.on('contacts.upsert', async (contactsList) => {
    try {
      for (const contact of contactsList) {
        let jid = contact.id;
        if (!jid || jid === 'status@broadcast' || jid.endsWith('@broadcast') || jid.endsWith('@newsletter')) continue;

        // LID handling
        if (jid.endsWith('@lid')) {
          const pn = contact.phoneNumber;
          if (pn) {
            const pnJid = pn.includes('@') ? pn : `${pn}@s.whatsapp.net`;
            await saveLidMapping(jid, pnJid);
            jid = pnJid;
          } else {
            const cachedPn = await getPnFromLid(jid);
            if (cachedPn) jid = cachedPn;
          }
        }

        if (!jid.endsWith('@s.whatsapp.net') && !jid.endsWith('@g.us')) continue;

        // Extract name
        const contactName = contact.name || contact.verifiedName || contact.notify;
        if (contactName) {
          await saveContact(jid, contactName);
        }
      }
      emitToTenant('new_message', { system_sync: true }); // Notify UI to refresh contact names
    } catch (err) {
      console.error('Error handling contacts.upsert:', err);
    }
  });

  sock.ev.on('contacts.update', async (updates) => {
    try {
      for (const update of updates) {
        let jid = update.id;
        if (!jid || jid === 'status@broadcast' || jid.endsWith('@broadcast') || jid.endsWith('@newsletter')) continue;

        // LID handling
        if (jid.endsWith('@lid')) {
          const pn = update.phoneNumber;
          if (pn) {
            const pnJid = pn.includes('@') ? pn : `${pn}@s.whatsapp.net`;
            await saveLidMapping(jid, pnJid);
            jid = pnJid;
          } else {
            const cachedPn = await getPnFromLid(jid);
            if (cachedPn) jid = cachedPn;
          }
        }

        if (!jid.endsWith('@s.whatsapp.net') && !jid.endsWith('@g.us')) continue;

        const contactName = update.name || update.verifiedName || update.notify;
        if (contactName) {
          await saveContact(jid, contactName);
        }
        
        // Save profile picture if updated in events
        if (update.imgUrl !== undefined) {
          const cachedUrl = update.imgUrl || 'none';
          await updateContactProfilePic(jid, cachedUrl);
        }
      }
      emitToTenant('new_message', { system_sync: true }); // Notify UI to refresh chat list
    } catch (err) {
      console.error('Error handling contacts.update:', err);
    }
  });

  // Incoming & WhatsApp Web/Companion Messages Handler
  sock.ev.on('messages.upsert', async (m) => {
    if (m.type !== 'notify' && m.type !== 'append') return;

    for (const msg of m.messages) {
      let jid = msg.key.remoteJid;
      
      // Filter out status broadcasts or invalid message payloads
      if (!jid || jid === 'status@broadcast') continue;

      // Map LID to real Phone JID if remoteJidAlt contains a phone number
      const lid = jid;
      const pn = msg.key.remoteJidAlt;
      if (pn && pn.endsWith('@s.whatsapp.net')) {
        await saveLidMapping(lid, pn);
        jid = pn;
      } else if (lid.endsWith('@lid')) {
        const cachedPn = await getPnFromLid(lid);
        if (cachedPn) jid = cachedPn;
      }

      // Handle incoming message reactions (emoji)
      if (msg.message?.reactionMessage) {
        const reaction = msg.message.reactionMessage;
        const targetId = reaction.key?.id;
        const emoji = reaction.text || '';
        if (targetId) {
          await updateMessageReaction(targetId, emoji, reaction.key?.fromMe ? 1 : 0);
          emitToTenant('message_reaction', {
            messageId: targetId,
            id: targetId,
            emoji,
            reaction: emoji,
            fromMe: reaction.key?.fromMe ? 1 : 0,
            contactId: jid,
            tenantId
          });
        }
        continue;
      }

      // Handle incoming message deletion / revocation ("Delete for Everyone")
      if (msg.message?.protocolMessage && (msg.message.protocolMessage.type === 0 || msg.message.protocolMessage.type === 'REVOKE')) {
        const targetId = msg.message.protocolMessage.key?.id;
        if (targetId) {
          await deleteMessageRecord(targetId, '🚫 This message was deleted');
          emitToTenant('message_deleted', {
            id: targetId,
            contactId: jid,
            text: '🚫 This message was deleted',
            tenantId
          });
        }
        continue;
      }
      
      // Get sender details
      const isGroup = jid.endsWith('@g.us');
      const fromMe = msg.key.fromMe;
      
      // Retrieve text content safely
      const textContent = getMessageText(msg.message);

      // Check media type
      let mediaType = 'text';
      if (msg.message?.imageMessage) mediaType = 'image';
      else if (msg.message?.documentMessage) mediaType = 'document';
      else if (msg.message?.audioMessage) mediaType = 'audio';
      else if (msg.message?.videoMessage) mediaType = 'video';

      if (!textContent && mediaType === 'text') continue;

      let mediaUrl = null;
      if (mediaType !== 'text') {
        triggerDownloadMediaBackground(msg, mediaType, io);
      }

      // Capture contact name (only if incoming, to avoid saving user's own business pushName (outgoing) to the recipient)
      const contactName = fromMe ? null : msg.pushName;

      // Save/update contact and save message to SQLite
      await saveContact(jid, contactName, tenantId);
      const db = getDb();
      await db.run(`UPDATE contacts SET is_archived = 0 WHERE id = ? AND tenant_id = ?`, [jid, tenantId]);

      // Asynchronously fetch WhatsApp profile picture if not cached
      if (sock && !isGroup) {
        (async () => {
          try {
            const existing = await getContact(jid, tenantId);
            if (!existing?.profile_pic_url) {
              const picUrl = await sock.profilePictureUrl(jid, 'image').catch(() => null);
              if (picUrl) {
                await updateContactProfilePic(jid, picUrl);
                emitToTenant('contact_updated', { id: jid, profile_pic_url: picUrl });
              }
            }
          } catch (_) {}
        })();
      }
      
      const rawTs = typeof msg.messageTimestamp === 'object' && msg.messageTimestamp !== null
        ? (msg.messageTimestamp.low ?? msg.messageTimestamp.toNumber?.() ?? Math.floor(Date.now() / 1000))
        : (Number(msg.messageTimestamp) || Math.floor(Date.now() / 1000));

      const messagePayload = {
        id: msg.key.id,
        sessionId: id,
        contactId: jid,
        fromMe: fromMe,
        textContent: textContent || (mediaType !== 'text' ? `[Sent ${mediaType}]` : ''),
        mediaUrl: mediaUrl,
        mediaType: mediaType,
        timestamp: rawTs,
        tenantId: tenantId
      };

      await saveMessage(messagePayload);

      // Emit new message event to UI with both camelCase and snake_case properties
      emitToTenant('new_message', {
        ...messagePayload,
        session_id: id,
        contact_id: jid,
        from_me: fromMe ? 1 : 0,
        text_content: messagePayload.textContent,
        media_type: mediaType,
        media_url: mediaUrl,
        contactName
      });

      // Outbound message wallet deduction (ensures messages sent from WhatsApp Web/App are also counted and deducted)
      if (fromMe && !isGroup) {
        import('./services/UniversalWalletService.js').then(async ({ default: walletSvc }) => {
          try {
            await walletSvc.deductForMessage({
              tenantId: tenantId || 1,
              messageId: msg.key.id,
              messageType: 'whatsapp_normal_chat',
              count: 1,
              recipientPhone: jid.replace(/\D/g, ''),
              triggerSource: 'WHATSAPP_WEB_SYNC',
              description: `WhatsApp Web chat to ${contactName || jid.replace(/\D/g, '')}`
            });
          } catch (wErr) {
            console.warn('[SessionManager Wallet Deduct Notice]:', wErr.message);
          }
        }).catch(() => {});
      }

      // Real-time GoHighLevel Sync Pipeline (Asynchronous, Non-Blocking)
      if (tenantId && !jid.endsWith('@g.us') && !jid.endsWith('@broadcast')) {
        import('./services/ghl/GhlSyncEngine.js').then(async ({ default: ghlSyncEngine }) => {
          try {
            const { getGhlIntegrationByTenant } = await import('./db.js');
            const integration = await getGhlIntegrationByTenant(tenantId);
            if (integration && integration.is_active && integration.location_id) {
              await ghlSyncEngine.syncConversationToGhl(tenantId, {
                contact: { id: jid, phone: jid, name: contactName || jid },
                messages: [{
                  text: textContent || (mediaType !== 'text' ? `[Sent ${mediaType}]` : ''),
                  fromMe: fromMe,
                  mediaUrl: mediaUrl,
                  status: 'delivered'
                }],
                callLogs: []
              });
            }
          } catch (syncErr) {
            // Silently log notice without disrupting core messaging loop
            console.warn(`[GHL Realtime Sync] Note: ${syncErr.message}`);
          }
        }).catch(() => {});
      }

      // Chatbot Auto-Reply Logic
      if (!fromMe && textContent && textContent.trim()) {
        try {
          const plan = await getTenantPlanDetails(tenantId);
          if (plan && plan.allow_chatbot === 1) {
            const rules = await getChatbotRules(tenantId);
            const cleanText = textContent.toLowerCase().trim();
            
            const matchedRule = rules.find(rule => {
              if (!rule.is_active) return false;
              if (rule.match_type === 'exact') {
                return cleanText === rule.keyword;
              } else {
                return cleanText.includes(rule.keyword);
              }
            });

            if (matchedRule) {
              console.log(`[Chatbot] Matched keyword "${matchedRule.keyword}". Auto-replying...`);
              setTimeout(async () => {
                try {
                  const autoSent = await sendWhatsAppMessage(id, jid, matchedRule.reply_text);
                  emitToTenant('new_message', {
                    id: autoSent.id,
                    session_id: id,
                    contact_id: jid,
                    from_me: 1,
                    text_content: autoSent.textContent,
                    media_type: 'text',
                    media_url: null,
                    timestamp: autoSent.timestamp,
                    tenantId: tenantId
                  });
                } catch (err) {
                  console.error(`[Chatbot] Failed to send auto-reply:`, err.message);
                }
              }, 1000);
            }
          }
        } catch (err) {
          console.error(`[Chatbot] Error checking rules:`, err.message);
        }
      }

      // Multi-Step WhatsApp Automation Hub Trigger (Runs active Inbound & Keyword sequences)
      if (!fromMe && textContent && textContent.trim()) {
        import('./services/AutomationWorkflowEngine.js').then(({ automationWorkflowEngine }) => {
          automationWorkflowEngine.triggerEvent('inbound_message', {
            customer_name: contactName || 'Customer',
            customer_phone: jid,
            message_text: textContent
          }, tenantId).catch(err => {
            console.warn('[Inbound Automation Engine Warning]:', err.message);
          });
        }).catch(() => {});
      }
    }
  });

  // Handle message updates (sent, delivered, read status ticks)
  sock.ev.on('messages.update', async (updates) => {
    for (const { key, update } of updates) {
      if (update.status !== undefined) {
        try {
          await updateMessageStatus(key.id, update.status);
          const statusPayload = {
            id: key.id,
            status: update.status,
            contactId: key.remoteJid,
            fromMe: key.fromMe ? 1 : 0,
            tenantId
          };
          // Broadcast status change to client
          emitToTenant('message_status_update', statusPayload);
        } catch (err) {
          console.error(`[Message Status Update] Failed for msg ${key.id}:`, err.message);
        }
      }
    }
  });

  // 1. Message Read Receipts (Live Blue Ticks from WhatsApp recipient)
  sock.ev.on('message-receipt.update', async (receipts) => {
    for (const { key, receipt } of receipts) {
      if (key?.id && receipt?.readTimestamp) {
        try {
          await updateMessageStatus(key.id, 4); // 4 = READ
          emitToTenant('message_status_update', {
            id: key.id,
            status: 4,
            contactId: key.remoteJid,
            fromMe: key.fromMe ? 1 : 0,
            tenantId
          });
        } catch (err) {
          console.error(`[Message Receipt Update] Error for ${key.id}:`, err.message);
        }
      }
    }
  });

  // 2. Message Reactions update event
  sock.ev.on('messages.reaction', async (reactions) => {
    for (const item of reactions) {
      const targetId = item.reaction?.key?.id || item.key?.id;
      const emoji = item.reaction?.text || '';
      if (targetId) {
        try {
          await updateMessageReaction(targetId, emoji, item.reaction?.key?.fromMe ? 1 : 0);
          emitToTenant('message_reaction', {
            messageId: targetId,
            id: targetId,
            emoji,
            reaction: emoji,
            fromMe: item.reaction?.key?.fromMe ? 1 : 0,
            contactId: item.key?.remoteJid,
            tenantId
          });
        } catch (err) {
          console.error(`[Reaction Update] Error for ${targetId}:`, err.message);
        }
      }
    }
  });

  // 3. Message Delete / Revocation event
  sock.ev.on('messages.delete', async (item) => {
    if (item.keys) {
      for (const key of item.keys) {
        if (key.id) {
          try {
            await deleteMessageRecord(key.id, '🚫 This message was deleted');
            emitToTenant('message_deleted', {
              id: key.id,
              contactId: key.remoteJid,
              text: '🚫 This message was deleted',
              tenantId
            });
          } catch (err) {
            console.error(`[Delete Update] Error for ${key.id}:`, err.message);
          }
        }
      }
    }
  });

  // 4. Live Presence Update ("composing" = typing, "recording" = recording audio)
  sock.ev.on('presence.update', async ({ id: presenceJid, presences }) => {
    if (!presences) return;
    for (const [userJid, presence] of Object.entries(presences)) {
      const lastKnown = presence?.lastKnownPresence;
      emitToTenant('presence_update', {
        contactId: presenceJid,
        userJid,
        presence: lastKnown, // 'composing' | 'recording' | 'paused' | 'available'
        timestamp: Date.now(),
        tenantId
      });
    }
  });

  return sock;
}

// Stop session
export async function stopSession(id) {
  if (reconnectTimers.has(id)) {
    clearTimeout(reconnectTimers.get(id));
    reconnectTimers.delete(id);
  }
  const sock = activeSockets.get(id);
  if (sock) {
    try {
      sock.ev?.removeAllListeners();
      sock.end();
    } catch (err) {
      console.error(`Error closing socket for session ${id}:`, err);
    }
    activeSockets.delete(id);
    await updateSessionStatus(id, 'disconnected', null, null);
  }
}

// Delete session files and session from database
export async function destroySession(id) {
  await stopSession(id);
  
  const sessionPath = path.join(sessionsDir, id);
  if (fs.existsSync(sessionPath)) {
    fs.rmSync(sessionPath, { recursive: true, force: true });
  }

  await dbDeleteSession(id);
}

// Send WhatsApp text message
export async function sendWhatsAppMessage(sessionId, recipientJid, text, tenantId = 1) {
  const isSockReady = (s) => Boolean(s && !s.isClosed && (s.user?.id || s.ws?.isOpen || s.authState?.creds?.me?.id));

  let sock = activeSockets.get(sessionId);
  if (!isSockReady(sock)) {
    // Prefer any actively connected socket with open Baileys connection
    for (const [id, s] of activeSockets.entries()) {
      if (isSockReady(s)) {
        sock = s;
        sessionId = id;
        break;
      }
    }
  }

  // Secondary fallback: Any socket that has user.id (authenticated)
  if (!sock) {
    for (const [id, s] of activeSockets.entries()) {
      if (s && !s.isClosed && s.user?.id) {
        sock = s;
        sessionId = id;
        break;
      }
    }
  }

  if (!sock || !isSockReady(sock)) {
    throw new Error('WhatsApp session is not connected or active. Please pair your device by scanning the QR code.');
  }

  // Format JID if it's just a raw number
  let jid = recipientJid;
  if (!jid.includes('@')) {
    jid = `${jid}@s.whatsapp.net`;
  }

  // Send message using Baileys socket with 6s safety timeout to prevent hanging
  const sendPromise = sock.sendMessage(jid, { text });
  const timeoutPromise = new Promise((_, reject) => 
    setTimeout(() => reject(new Error('WhatsApp message delivery timeout (6s)')), 6000)
  );
  const result = await Promise.race([sendPromise, timeoutPromise]);

  // Save the outbound message to database with status 1 (sent / server_ack)
  if (result && result.key) {
    const timestamp = Math.floor(Date.now() / 1000);
    await saveMessage({
      id: result.key.id,
      sessionId,
      contactId: jid,
      fromMe: true,
      textContent: text,
      mediaType: 'text',
      timestamp,
      status: 1,
      tenantId
    });

    return {
      id: result.key.id,
      recipientJid: jid,
      text,
      timestamp,
      status: 1
    };
  }

  throw new Error('Failed to capture sent message key');
}

// Mark WhatsApp messages as read on recipient's WhatsApp (sends blue ticks)
export async function markWhatsAppMessagesAsRead(sessionId, contactJid, messageKeys = []) {
  try {
    let sock = activeSockets.get(sessionId);
    if (!sock) {
      for (const s of activeSockets.values()) {
        if (s && !s.isClosed) { sock = s; break; }
      }
    }
    if (!sock) return false;

    let raw = String(contactJid || '').trim();
    let jid = raw;
    if (!jid.includes('@')) {
      const digits = jid.replace(/\D/g, '');
      const l10 = digits.slice(-10);
      jid = digits.length >= 10 ? (digits.startsWith('91') ? `${digits}@s.whatsapp.net` : `91${l10}@s.whatsapp.net`) : `${digits}@s.whatsapp.net`;
    }

    // Subscribe to presence so we receive live typing/recording presence from this contact
    try {
      await sock.presenceSubscribe(jid);
    } catch (e) {}

    if (Array.isArray(messageKeys) && messageKeys.length > 0) {
      const keysToRead = messageKeys
        .map(k => typeof k === 'string' ? { remoteJid: jid, id: k } : k)
        .filter(k => k && k.remoteJid && k.id);
      if (keysToRead.length > 0) {
        await sock.readMessages(keysToRead);
      }
    }
    return true;
  } catch (err) {
    console.warn(`[Baileys Read Receipts] Notice for ${contactJid}:`, err.message);
    return false;
  }
}

// Send WhatsApp media message
export async function sendWhatsAppMedia(sessionId, recipientJid, mediaType, fileBuffer, fileName, fileMimeType, caption = '', tenantId = 1) {
  const isSockReady = (s) => Boolean(s && !s.isClosed && (s.user?.id || s.ws?.isOpen || s.authState?.creds?.me?.id));

  let sock = activeSockets.get(sessionId);
  if (!isSockReady(sock)) {
    for (const [sId, s] of activeSockets.entries()) {
      if (isSockReady(s)) {
        sock = s;
        sessionId = sId;
        break;
      }
    }
  }
  if (!sock) {
    for (const [sId, s] of activeSockets.entries()) {
      if (s && !s.isClosed && s.user?.id) {
        sock = s;
        sessionId = sId;
        break;
      }
    }
  }
  if (!sock || !isSockReady(sock)) {
    throw new Error('WhatsApp session is not active. Please scan the QR code to link your phone.');
  }

  // Format JID if it's just a raw number
  let jid = recipientJid;
  if (!jid.includes('@')) {
    jid = `${jid}@s.whatsapp.net`;
  }

  if (!fs.existsSync(mediaStorePath)) {
    fs.mkdirSync(mediaStorePath, { recursive: true });
  }

  // Create local file path to save it in media_store
  const ext = path.extname(fileName) || (mediaType === 'image' ? '.jpg' : mediaType === 'video' ? '.mp4' : mediaType === 'audio' ? '.ogg' : '.bin');
  const storedFileName = `media_sent_${Date.now()}${ext}`;
  const storedFilePath = path.join(mediaStorePath, storedFileName);
  fs.writeFileSync(storedFilePath, fileBuffer);
  const mediaUrl = `/media/${storedFileName}`;

  // Construct message payload based on mediaType
  let options = {};
  const finalCaption = (caption || fileName || '').trim();
  if (mediaType === 'image') {
    options = { image: fileBuffer, mimetype: fileMimeType || 'image/jpeg' };
    if (finalCaption) options.caption = finalCaption;
  } else if (mediaType === 'video') {
    options = { video: fileBuffer, mimetype: fileMimeType || 'video/mp4' };
    if (finalCaption) options.caption = finalCaption;
  } else if (mediaType === 'audio') {
    let finalBuffer = fileBuffer;
    let finalMime = 'audio/ogg; codecs=opus';
    let isPtt = true;

    // Check if audio is WebM (recorded from Chrome/browser)
    const isWebm = (fileMimeType && fileMimeType.includes('webm')) || (fileName && fileName.endsWith('.webm'));
    if (isWebm) {
      try {
        const { execSync } = await import('child_process');
        const os = await import('os');
        const tmpIn = path.join(os.tmpdir(), `in_${Date.now()}_${Math.random().toString(36).substr(2, 4)}.webm`);
        const tmpOut = path.join(os.tmpdir(), `out_${Date.now()}_${Math.random().toString(36).substr(2, 4)}.ogg`);
        fs.writeFileSync(tmpIn, fileBuffer);
        execSync(`ffmpeg -y -i "${tmpIn}" -c:a libopus -b:a 32k -vn "${tmpOut}"`, { stdio: 'ignore', timeout: 6000 });
        if (fs.existsSync(tmpOut) && fs.statSync(tmpOut).size > 100) {
          finalBuffer = fs.readFileSync(tmpOut);
          finalMime = 'audio/ogg; codecs=opus';
          isPtt = true;
          try { fs.unlinkSync(tmpIn); fs.unlinkSync(tmpOut); } catch (e) {}
        }
      } catch (e) {
        // If ffmpeg is not available, send as audio/mp4 so WhatsApp accepts and delivers the audio without dropping it
        finalMime = 'audio/mp4';
        isPtt = false;
      }
    }

    options = { audio: finalBuffer, mimetype: finalMime, ptt: isPtt };
  } else if (mediaType === 'document') {
    options = { document: fileBuffer, mimetype: fileMimeType || 'application/pdf', fileName: fileName || 'document.pdf' };
    if (finalCaption) options.caption = finalCaption;
  }

  const sendPromise = sock.sendMessage(jid, options);
  const timeoutPromise = new Promise((_, reject) => 
    setTimeout(() => reject(new Error('WhatsApp media delivery timeout (25s)')), 25000)
  );
  const response = await Promise.race([sendPromise, timeoutPromise]);

  if (response && response.key) {
    const timestamp = response.messageTimestamp
      ? response.messageTimestamp.low || response.messageTimestamp.toNumber?.() || Math.floor(Date.now() / 1000)
      : Math.floor(Date.now() / 1000);

    // Save sent message to database
    await saveMessage({
      id: response.key.id,
      sessionId: sessionId,
      contactId: jid,
      fromMe: 1,
      textContent: finalCaption || `[Sent ${mediaType}]`,
      mediaUrl: mediaUrl,
      mediaType: mediaType,
      timestamp: timestamp,
      tenantId: tenantId
    });

    return {
      id: response.key.id,
      sessionId: sessionId,
      contactId: jid,
      fromMe: 1,
      textContent: finalCaption || `[Sent ${mediaType}]`,
      mediaUrl: mediaUrl,
      mediaType: mediaType,
      timestamp: timestamp
    };
  }

  throw new Error('Failed to capture sent media key from WhatsApp');
}

// Fetch WhatsApp profile picture dynamically from any active socket
export async function getProfilePicUrl(jid) {
  let activeSock = null;
  for (const sock of activeSockets.values()) {
    if (sock && !sock.isClosed) {
      activeSock = sock;
      break;
    }
  }
  if (!activeSock) {
    throw new Error('No active WhatsApp connection to fetch profile picture');
  }
  
  // Format JID if it is just a raw number
  let targetJid = jid;
  if (!targetJid.includes('@')) {
    targetJid = `${targetJid}@s.whatsapp.net`;
  }
  
  try {
    const url = await activeSock.profilePictureUrl(targetJid, 'image');
    return url;
  } catch (err) {
    // Return null if no profile pic or restricted
    return null;
  }
}

// Recursively extract text from any Baileys message structure
function getMessageText(message) {
  if (!message) return '';
  
  if (message.ephemeralMessage) {
    return getMessageText(message.ephemeralMessage.message);
  }
  if (message.viewOnceMessage) {
    return getMessageText(message.viewOnceMessage.message);
  }
  if (message.viewOnceMessageV2) {
    return getMessageText(message.viewOnceMessageV2.message);
  }
  if (message.documentWithCaptionMessage) {
    return getMessageText(message.documentWithCaptionMessage.message);
  }
  
  return message.conversation || 
         message.extendedTextMessage?.text || 
         message.imageMessage?.caption || 
         message.videoMessage?.caption || 
         message.documentMessage?.caption || 
         message.templateButtonReplyMessage?.selectedId ||
         message.buttonsResponseMessage?.selectedButtonId ||
         '';
}

// Check if a number is registered on WhatsApp using any active socket
export async function checkWhatsAppNumber(jid) {
  let activeSock = null;
  for (const sock of activeSockets.values()) {
    if (sock) {
      activeSock = sock;
      break;
    }
  }
  if (!activeSock) {
    throw new Error('No active WhatsApp connection to verify phone number. Please connect an account first.');
  }

  let targetJid = jid;
  if (!targetJid.includes('@')) {
    targetJid = `${targetJid}@s.whatsapp.net`;
  }

  try {
    const result = await activeSock.onWhatsApp(targetJid);
    if (result && result.length > 0 && result[0].exists) {
      return result[0].jid;
    }
    return null;
  } catch (err) {
    console.error(`Error checking WhatsApp number for ${jid}:`, err);
    return null;
  }
}

// Start background scheduler worker for scheduled messages
export function startScheduledMessagesWorker(io) {
  console.log('Background Scheduled Messages Worker initialized.');
  setInterval(async () => {
    try {
      const pending = await getPendingScheduledMessages();
      if (pending.length === 0) return;

      console.log(`[Scheduler] Found ${pending.length} scheduled messages ready to send.`);
      for (const msg of pending) {
        try {
          await sendWhatsAppMessage(msg.session_id, msg.contact_id, msg.message_text);
          await updateScheduledMessageStatus(msg.id, 'sent');
          console.log(`[Scheduler] Successfully sent scheduled message ${msg.id} to ${msg.contact_id}`);
          io.emit('scheduled_message_update', { contactId: msg.contact_id, status: 'sent' });
        } catch (err) {
          console.error(`[Scheduler] Failed to send scheduled message ${msg.id}:`, err.message);
          await updateScheduledMessageStatus(msg.id, 'failed', err.message);
          io.emit('scheduled_message_update', { contactId: msg.contact_id, status: 'failed', error: err.message });
        }
      }
    } catch (err) {
      console.error('[Scheduler Worker Error]:', err);
    }
  }, 10000); // Check every 10 seconds
}

// React to a WhatsApp message (emoji)
export async function sendWhatsAppReaction(sessionId, recipientJid, messageId, emoji, fromMe = true) {
  let sock = activeSockets.get(sessionId);
  if (!sock) {
    for (const s of activeSockets.values()) {
      if (s && !s.isClosed) { sock = s; break; }
    }
  }
  if (!sock) throw new Error('WhatsApp session is not active');

  let raw = String(recipientJid || '').trim();
  let jid = raw;
  if (!jid.includes('@')) {
    const digits = jid.replace(/\D/g, '');
    const l10 = digits.slice(-10);
    jid = digits.length >= 10 ? (digits.startsWith('91') ? `${digits}@s.whatsapp.net` : `91${l10}@s.whatsapp.net`) : `${digits}@s.whatsapp.net`;
  }

  try {
    await sock.sendMessage(jid, {
      react: {
        text: emoji || '', // empty string removes reaction
        key: {
          remoteJid: jid,
          fromMe: Boolean(fromMe),
          id: messageId
        }
      }
    });
  } catch (err) {
    console.warn(`[Baileys Reaction] Error: ${err.message}`);
  }

  await updateMessageReaction(messageId, emoji || null);
  return { success: true, messageId, emoji };
}

// Delete WhatsApp message for everyone (Revoke)
export async function deleteWhatsAppMessage(sessionId, recipientJid, messageId) {
  let sock = activeSockets.get(sessionId);
  if (!sock) {
    for (const s of activeSockets.values()) {
      if (s && !s.isClosed) { sock = s; break; }
    }
  }
  if (!sock) throw new Error('WhatsApp session is not active');

  let raw = String(recipientJid || '').trim();
  let jid = raw;
  if (!jid.includes('@')) {
    const digits = jid.replace(/\D/g, '');
    const l10 = digits.slice(-10);
    jid = digits.length >= 10 ? (digits.startsWith('91') ? `${digits}@s.whatsapp.net` : `91${l10}@s.whatsapp.net`) : `${digits}@s.whatsapp.net`;
  }

  try {
    await sock.sendMessage(jid, {
      delete: {
        remoteJid: jid,
        fromMe: true,
        id: messageId
      }
    });
  } catch (err) {
    console.warn(`[Baileys Delete] Error: ${err.message}`);
  }

  await deleteMessageRecord(messageId, '🚫 You deleted this message');
  return { success: true, messageId };
}

// Send presence update ("composing" | "recording" | "paused")
export async function sendWhatsAppPresence(sessionId, recipientJid, presence = 'composing') {
  let sock = activeSockets.get(sessionId);
  if (!sock) {
    for (const s of activeSockets.values()) {
      if (s && !s.isClosed) { sock = s; break; }
    }
  }
  if (!sock) return false;

  let raw = String(recipientJid || '').trim();
  let jid = raw;
  if (!jid.includes('@')) {
    const digits = jid.replace(/\D/g, '');
    const l10 = digits.slice(-10);
    jid = digits.length >= 10 ? (digits.startsWith('91') ? `${digits}@s.whatsapp.net` : `91${l10}@s.whatsapp.net`) : `${digits}@s.whatsapp.net`;
  }

  try {
    await sock.sendPresenceUpdate(presence, jid);
    return true;
  } catch (err) {
    return false;
  }
}

