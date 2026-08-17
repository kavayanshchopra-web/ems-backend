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
  getTenantPlanDetails
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
function triggerDownloadMediaBackground(msg, mediaType, io) {
  if (mediaType === 'text') return;
  const msgId = msg.key.id;

  handleDownloadMedia(msg, mediaType)
    .then(async (mediaUrl) => {
      if (mediaUrl) {
        await updateMessageMediaUrl(msgId, mediaUrl);
        // Broadcast media downloaded update event to client
        io.emit('media_downloaded', { id: msgId, mediaUrl, media_url: mediaUrl });
      }
    })
    .catch((err) => {
      console.error(`[Media Sync] Background download failed for ${msgId}:`, err.message);
    });
}

// Map to hold active sockets
const activeSockets = new Map();

// Global promise chain to serialize database transactions during history sync
let dbSyncQueue = Promise.resolve();

// Initialize all saved sessions from DB on startup
export async function initAllSessions(io) {
  try {
    const sessions = await getAllSessions();
    console.log(`Auto-starting ${sessions.length} saved sessions...`);
    for (const session of sessions) {
      if (session.status !== 'disconnected') {
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
  if (activeSockets.has(id)) {
    console.log(`Session ${id} is already active.`);
    return activeSockets.get(id);
  }

  const session = await getSession(id);
  const tenantId = session?.tenant_id || 1;

  const sessionPath = path.join(sessionsDir, id);
  const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

  // Set up low-verbosity logger for Baileys
  const logger = pino({ level: 'silent' });

  const { version, isLatest } = await fetchLatestWaWebVersion().catch(() => ({ version: [2, 3000, 1045345293], isLatest: false }));
  console.log(`[Session ${id}] Using WAWeb version: ${version.join('.')} (isLatest: ${isLatest})`);

  const sock = makeWASocket({
    version,
    auth: state,
    logger,
    printQRInTerminal: false,
    browser: ['Ubuntu', 'Chrome', '20.0.04'],
    connectTimeoutMs: 60000,
    defaultQueryTimeoutMs: 60000,
    keepAliveIntervalMs: 30000,
    syncFullHistory: false, // Lite mode: Prevents downloading huge past chat history to conserve VPS RAM
    shouldSyncHistoryMessage: () => false,
    markOnlineOnConnect: false,
    generateHighQualityLinkPreview: false
  });

  activeSockets.set(id, sock);

  // Connection Updates
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log(`[Session ${id}] QR code received.`);
      try {
        const qrDataUrl = await QRCode.toDataURL(qr);
        await updateSessionStatus(id, 'qr_ready', qrDataUrl, null);
        io.emit('session_update', { id, status: 'qr_ready', qr: qrDataUrl });
      } catch (err) {
        console.error('Error generating QR data URL:', err);
      }
    } else if (connection === 'connecting') {
      console.log(`[Session ${id}] Connecting...`);
      await updateSessionStatus(id, 'connecting', null, null);
      io.emit('session_update', { id, status: 'connecting' });
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
      io.emit('session_update', { id, status: 'connected', phoneNumber, profilePicUrl });
    }

    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log(`[Session ${id}] Connection closed. Reason:`, lastDisconnect?.error?.message, `Reconnecting: ${shouldReconnect}`);
      if (lastDisconnect?.error) {
        console.error(`[Session ${id}] Connection error object:`, JSON.stringify(lastDisconnect.error, null, 2) || lastDisconnect.error);
      }

      if (shouldReconnect) {
        // Reconnect if not logged out
        activeSockets.delete(id);
        startSession(id, io);
      } else {
        // Logged out: clean credentials folder and delete session socket
        console.log(`[Session ${id}] Logged out. Cleaning files...`);
        activeSockets.delete(id);
        await updateSessionStatus(id, 'disconnected', null, null);
        
        if (fs.existsSync(sessionPath)) {
          fs.rmSync(sessionPath, { recursive: true, force: true });
        }
        
        io.emit('session_update', { id, status: 'disconnected' });
      }
    }
  });

  // Save auth credentials whenever updated
  sock.ev.on('creds.update', saveCreds);

  // Handle WhatsApp History Sync (Sync chats, contacts, and messages from phone inside transactions)
  sock.ev.on('messaging-history.set', (history) => {
    dbSyncQueue = dbSyncQueue.then(async () => {
      const { chats, contacts, messages } = history;
      console.log(`[Session ${id}] Received history sync. Contacts: ${contacts?.length || 0}, Messages: ${messages?.length || 0}`);
      
      const db = getDb();
      
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

      // 2. Sync messages inside a transaction
      if (messages && messages.length > 0) {
        // Group messages by contact JID first, resolving LIDs where possible
        const messagesByJid = {};
        for (const msg of messages) {
          let jid = msg.key.remoteJid;
          if (!jid || jid === 'status@broadcast') continue;

          // Map LID to real Phone JID
          const lid = jid;
          const pn = msg.key.remoteJidAlt;
          let resolvedJid = jid;
          if (pn && pn.endsWith('@s.whatsapp.net')) {
            await db.run(
              `INSERT OR REPLACE INTO lid_mappings (lid, pn) VALUES (?, ?)`,
              [lid, pn]
            );
            resolvedJid = pn;
          } else if (lid.endsWith('@lid')) {
            const row = await db.get(`SELECT pn FROM lid_mappings WHERE lid = ?`, [lid]);
            if (row && row.pn) resolvedJid = row.pn;
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
            return tsB - tsA; // Descending
          });
          
          messagesToInsert.push(...list.slice(0, 50));
        }

        await db.run('BEGIN TRANSACTION');
        try {
          for (const item of messagesToInsert) {
            const { msg, resolvedJid: jid } = item;
            const textContent = getMessageText(msg.message);

            let mediaType = 'text';
            if (msg.message?.imageMessage) mediaType = 'image';
            else if (msg.message?.documentMessage) mediaType = 'document';
            else if (msg.message?.audioMessage) mediaType = 'audio';
            else if (msg.message?.videoMessage) mediaType = 'video';

            if (!textContent && mediaType === 'text') continue;

            if (mediaType !== 'text') {
              triggerDownloadMediaBackground(msg, mediaType, io);
            }

            const contactName = msg.key.fromMe ? null : msg.pushName;
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
      io.emit('new_message', { system_sync: true });
    }).catch(err => {
      console.error(`[History Sync Queue Error]`, err);
    });
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
      io.emit('new_message', { system_sync: true }); // Notify UI to refresh contact names
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
      io.emit('new_message', { system_sync: true }); // Notify UI to refresh chat list
    } catch (err) {
      console.error('Error handling contacts.update:', err);
    }
  });

  // Incoming Messages Handler
  sock.ev.on('messages.upsert', async (m) => {
    if (m.type !== 'notify') return;

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
      
      const messagePayload = {
        id: msg.key.id,
        sessionId: id,
        contactId: jid,
        fromMe: fromMe,
        textContent: textContent || (mediaType !== 'text' ? `[Sent ${mediaType}]` : ''),
        mediaUrl: mediaUrl,
        mediaType: mediaType,
        timestamp: msg.messageTimestamp,
        tenantId: tenantId
      };

      await saveMessage(messagePayload);

      // Emit new message event to UI with both camelCase and snake_case properties
      io.emit('new_message', {
        ...messagePayload,
        session_id: id,
        contact_id: jid,
        from_me: fromMe ? 1 : 0,
        text_content: messagePayload.textContent,
        media_type: mediaType,
        media_url: mediaUrl,
        contactName
      });

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
                  io.emit('new_message', {
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
    }
  });

  // Handle message updates (sent, delivered, read status ticks)
  sock.ev.on('messages.update', async (updates) => {
    for (const { key, update } of updates) {
      if (update.status !== undefined) {
        try {
          await updateMessageStatus(key.id, update.status);
          // Broadcast status change to client
          io.emit('message_status_update', { id: key.id, status: update.status });
        } catch (err) {
          console.error(`[Message Status Update] Failed for msg ${key.id}:`, err.message);
        }
      }
    }
  });

  return sock;
}

// Stop session
export async function stopSession(id) {
  const sock = activeSockets.get(id);
  if (sock) {
    try {
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
export async function sendWhatsAppMessage(sessionId, recipientJid, text) {
  const sock = activeSockets.get(sessionId);
  if (!sock) {
    throw new Error('WhatsApp session is not connected or active');
  }

  // Format JID if it's just a raw number
  let jid = recipientJid;
  if (!jid.includes('@')) {
    jid = `${jid}@s.whatsapp.net`;
  }

  // Send message using Baileys socket
  const result = await sock.sendMessage(jid, { text });

  // Save the outbound message to database
  if (result && result.key) {
    const timestamp = Math.floor(Date.now() / 1000);
    await saveMessage({
      id: result.key.id,
      sessionId,
      contactId: jid,
      fromMe: true,
      textContent: text,
      mediaType: 'text',
      timestamp
    });

    return {
      id: result.key.id,
      recipientJid: jid,
      text,
      timestamp
    };
  }

  throw new Error('Failed to capture sent message key');
}

// Send WhatsApp media message
export async function sendWhatsAppMedia(sessionId, recipientJid, mediaType, fileBuffer, fileName, fileMimeType) {
  const sock = activeSockets.get(sessionId);
  if (!sock) {
    throw new Error('WhatsApp session is not active');
  }

  // Format JID if it's just a raw number
  let jid = recipientJid;
  if (!jid.includes('@')) {
    jid = `${jid}@s.whatsapp.net`;
  }

  // Create local file path to save it in media_store
  const ext = path.extname(fileName) || (mediaType === 'image' ? '.jpg' : mediaType === 'video' ? '.mp4' : mediaType === 'audio' ? '.ogg' : '.bin');
  const storedFileName = `media_sent_${Date.now()}${ext}`;
  const storedFilePath = path.join(mediaStorePath, storedFileName);
  fs.writeFileSync(storedFilePath, fileBuffer);
  const mediaUrl = `/media/${storedFileName}`;

  // Construct message payload based on mediaType
  let options = {};
  if (mediaType === 'image') {
    options = { image: fileBuffer, caption: fileName || '' };
  } else if (mediaType === 'video') {
    options = { video: fileBuffer, caption: fileName || '' };
  } else if (mediaType === 'audio') {
    options = { audio: fileBuffer, mimetype: fileMimeType, ptt: true };
  } else if (mediaType === 'document') {
    options = { document: fileBuffer, mimetype: fileMimeType, fileName: fileName };
  }

  const response = await sock.sendMessage(jid, options);
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
      textContent: fileName || `[Sent ${mediaType}]`,
      mediaUrl: mediaUrl,
      mediaType: mediaType,
      timestamp: timestamp
    });

    return {
      id: response.key.id,
      sessionId: sessionId,
      contactId: jid,
      fromMe: 1,
      textContent: fileName || `[Sent ${mediaType}]`,
      mediaUrl: mediaUrl,
      mediaType: mediaType,
      timestamp: timestamp
    };
  }

  throw new Error('Failed to send media message');
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

