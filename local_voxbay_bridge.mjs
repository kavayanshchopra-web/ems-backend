import http from 'http';
import { exec } from 'child_process';
import fs from 'fs';
import { io as ioClient } from 'socket.io-client';

const VOXBAY_EXE = 'C:\\Program Files (x86)\\Voxbay Phone\\VoxbayPhone.exe';
const PORT = 9876;
const VPS_SOCKET_URL = 'https://api.employeemanagementsystems.com';

function dialNumber(phoneNumber) {
  const cleanNumber = String(phoneNumber).replace(/\D/g, '');
  if (!cleanNumber) return false;

  console.log(`[Bridge] 📞 Dialing ${cleanNumber} on Voxbay Softphone...`);
  if (fs.existsSync(VOXBAY_EXE)) {
    exec(`"${VOXBAY_EXE}" ${cleanNumber}`, (err) => {
      if (err) console.warn('[Bridge] Dial execution note:', err.message);
    });
  } else {
    // Fallback: Launch via Windows Default Tel Protocol
    exec(`start tel:${cleanNumber}`, (err) => {
      if (err) console.warn('[Bridge] Protocol dial note:', err.message);
    });
  }
  return true;
}

function hangupCall() {
  console.log('[Bridge] 📴 Executing Hangup on Voxbay Softphone...');
  if (fs.existsSync(VOXBAY_EXE)) {
    exec(`"${VOXBAY_EXE}" -hangup`, () => {});
    exec(`"${VOXBAY_EXE}" /hangup`, () => {});
    exec(`"${VOXBAY_EXE}" -hangupall`, () => {});
    exec(`"${VOXBAY_EXE}" /hangupall`, () => {});
  }
}

// 1. Local HTTP Server on Port 9876 (Direct Browser Calls)
const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    return res.end();
  }

  if (req.url === '/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ status: 'ready', softphoneInstalled: fs.existsSync(VOXBAY_EXE) }));
  }

  if (req.url === '/dial' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const data = JSON.parse(body || '{}');
        const num = data.number || data.phone || data.phoneNumber;
        dialNumber(num);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, dialed: num }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  if (req.url === '/hangup' && req.method === 'POST') {
    hangupCall();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ success: true }));
  }

  res.writeHead(404);
  res.end();
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`=======================================================`);
  console.log(`🚀 VOXBAY LOCAL DESKTOP BRIDGE RUNNING ON PORT ${PORT}`);
  console.log(`   Connected to Voxbay Phone App at: ${VOXBAY_EXE}`);
  console.log(`=======================================================`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`[Bridge] Note: Port ${PORT} already active, continuing with Cloud WebSocket listener...`);
  } else {
    console.warn('[Bridge] Server warning:', err.message);
  }
});

// 2. Cloud WebSocket Listener (For GoHighLevel iframe & Remote Click-To-Call)
try {
  const socket = ioClient(VPS_SOCKET_URL, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 2000
  });

  socket.on('connect', () => {
    console.log(`🟢 Connected to Cloud VPS Real-Time Stream (${VPS_SOCKET_URL})`);
    console.log(`   Ready to receive calls from GoHighLevel & Web Dialers!`);
  });

  socket.on('softphone_dial', (data) => {
    console.log('⚡ [Cloud Event Received] Dialing Number:', data);
    const num = data.number || data.destination || data.phoneNumber;
    if (num) dialNumber(num);
  });

  socket.on('softphone_hangup', (data) => {
    console.log('⚡ [Cloud Event Received] Hangup:', data);
    hangupCall();
  });

  socket.on('disconnect', () => {
    console.log('🟡 Disconnected from Cloud VPS Stream. Reconnecting...');
  });
} catch (e) {
  console.warn('[Bridge] Socket connection warning:', e.message);
}
