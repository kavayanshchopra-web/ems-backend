import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { initDb, getDb } from './db.js';
import setupRoutes from './routes.js';
import { initAllSessions } from './sessionManager.js';
import { ghlAuthService } from './services/ghl/index.js';
import paymentGatewayService from './services/PaymentGatewayService.js';
import jwt from 'jsonwebtoken';

dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET || 'omniflow_super_secret_jwt_key';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const mediaStoreDir = path.join(__dirname, 'media_store');

// Ensure media_store directory exists
if (!fs.existsSync(mediaStoreDir)) {
  fs.mkdirSync(mediaStoreDir, { recursive: true });
}

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // Allow connections from frontend dev server
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

app.use(cors());

// Webhook raw body parser (MUST run before express.json() parses body to object)
app.use('/api/billing/webhook', express.raw({ type: 'application/json' }));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve WhatsApp downloaded media statically
app.use('/media', express.static(mediaStoreDir));

// Root status route
app.get('/', (req, res) => {
  res.json({ status: 'online', message: 'EMS WhatsApp CRM Backend API Engine Running' });
});

// Health check endpoint (used by Flutter mobile app)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'OmniFlow Server is running', timestamp: new Date().toISOString() });
});

// ==============================================================================
// ⚡ Reverse-Proxy for White-Labeled OmniFlow Automation Studio (n8n Port 5678)
// ==============================================================================
const N8N_TARGET_HOST = process.env.N8N_HOST || '127.0.0.1';
const N8N_TARGET_PORT = parseInt(process.env.N8N_PORT || '5678', 10);

app.use(['/automations-engine', '/webhook'], (req, res, next) => {
  const isAutomationsEngine = req.baseUrl.startsWith('/automations-engine') || req.path.startsWith('/automations-engine');
  const isWebhook = req.baseUrl.startsWith('/webhook') || req.path.startsWith('/webhook');

  if (!isAutomationsEngine && !isWebhook) {
    return next();
  }

  let targetPath = req.originalUrl || req.url;
  if (isAutomationsEngine) {
    targetPath = targetPath.replace(/^\/automations-engine/, '') || '/';
    if (!targetPath.startsWith('/')) targetPath = '/' + targetPath;
  }

  const proxyOptions = {
    hostname: N8N_TARGET_HOST,
    port: N8N_TARGET_PORT,
    path: targetPath,
    method: req.method,
    headers: {
      ...req.headers,
      host: `${N8N_TARGET_HOST}:${N8N_TARGET_PORT}`,
      'x-forwarded-for': req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      'x-forwarded-proto': req.headers['x-forwarded-proto'] || 'https',
      'x-forwarded-host': req.headers.host || 'app.employeemanagementsystems.com'
    }
  };

  const proxyReq = http.request(proxyOptions, (proxyRes) => {
    const resHeaders = { ...proxyRes.headers };
    delete resHeaders['x-frame-options'];
    delete resHeaders['content-security-policy'];

    res.writeHead(proxyRes.statusCode, resHeaders);
    proxyRes.pipe(res);
  });

  proxyReq.on('error', () => {
    if (req.accepts('html')) {
      res.status(503).send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>OmniFlow Automation Studio</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #091312;
      color: #e2e8f0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 24px;
    }
    .card {
      background: rgba(15, 43, 38, 0.9);
      border: 1px solid rgba(13, 148, 136, 0.45);
      border-radius: 16px;
      padding: 36px;
      max-width: 640px;
      box-shadow: 0 20px 50px rgba(0,0,0,0.7);
      text-align: center;
      backdrop-filter: blur(12px);
    }
    .badge {
      display: inline-block;
      background: rgba(16, 185, 129, 0.15);
      color: #34d399;
      border: 1px solid rgba(16, 185, 129, 0.3);
      padding: 4px 14px;
      border-radius: 999px;
      font-size: 11.5px;
      font-weight: 800;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      margin-bottom: 18px;
    }
    h2 { font-size: 24px; color: #ffffff; margin-bottom: 12px; font-weight: 800; }
    p { color: #94a3b8; font-size: 14px; line-height: 1.6; margin-bottom: 24px; }
    .box {
      background: #05100e;
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 10px;
      padding: 16px;
      text-align: left;
      margin-bottom: 24px;
    }
    .box-title { font-size: 11px; font-weight: 700; color: #14d2cb; text-transform: uppercase; margin-bottom: 8px; }
    .code {
      font-family: 'JetBrains Mono', Consolas, monospace;
      font-size: 12.5px;
      color: #a7f3d0;
      word-break: break-all;
      user-select: all;
    }
    .btn {
      background: linear-gradient(135deg, #0d9488 0%, #064e43 100%);
      color: #ffffff;
      border: 1px solid rgba(20, 210, 203, 0.4);
      padding: 12px 28px;
      border-radius: 10px;
      font-size: 13.5px;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 4px 14px rgba(13, 148, 136, 0.4);
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">⚡ OmniFlow Cloud Engine</div>
    <h2>Engine Starting or Offline</h2>
    <p>The OmniFlow Enterprise Automation Engine is waiting to connect to n8n on port 5678. If Docker is not yet running on your VPS, execute:</p>
    <div class="box">
      <div class="box-title">VPS Terminal Command</div>
      <div class="code">docker run -d --name omniflow-n8n --restart always -p 127.0.0.1:5678:5678 -e N8N_DIAGNOSTICS_ENABLED=false -e N8N_VERSION_NOTIFICATIONS_ENABLED=false -e N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS=true -e N8N_HIRING_BANNER_ENABLED=false -v omniflow_n8n_data:/home/node/.n8n n8nio/n8n:latest</div>
    </div>
    <button class="btn" onclick="location.reload()">🔄 Re-check Engine Status</button>
  </div>
</body>
</html>`);
    } else {
      res.status(503).json({
        error: 'Automation engine is offline or initializing',
        port: N8N_TARGET_PORT,
        suggestion: 'Ensure Docker container omniflow-n8n is running on port 5678'
      });
    }
  });

  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    if (req.body && Object.keys(req.body).length > 0) {
      const bodyData = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      proxyReq.setHeader('content-length', Buffer.byteLength(bodyData));
      proxyReq.write(bodyData);
      proxyReq.end();
    } else {
      req.pipe(proxyReq);
    }
  } else {
    proxyReq.end();
  }
});

// Setup API routes (Mount on both /api and / for unified GHL webhook compatibility)
const routesHandler = setupRoutes(io);
app.use('/api', routesHandler);
app.use('/', routesHandler);

// Forward WebSocket upgrades for n8n studio canvas
server.on('upgrade', (req, socket, head) => {
  if (req.url.startsWith('/automations-engine')) {
    let targetPath = req.url.replace(/^\/automations-engine/, '') || '/';
    if (!targetPath.startsWith('/')) targetPath = '/' + targetPath;

    const proxyReq = http.request({
      hostname: N8N_TARGET_HOST,
      port: N8N_TARGET_PORT,
      path: targetPath,
      method: req.method,
      headers: {
        ...req.headers,
        host: `${N8N_TARGET_HOST}:${N8N_TARGET_PORT}`
      }
    });

    proxyReq.on('upgrade', (proxyRes, proxySocket, proxyHead) => {
      socket.write(`HTTP/1.1 101 Switching Protocols\r\n` +
        Object.entries(proxyRes.headers).map(([k, v]) => `${k}: ${v}\r\n`).join('') +
        '\r\n');
      if (proxyHead && proxyHead.length) socket.write(proxyHead);
      proxySocket.pipe(socket);
      socket.pipe(proxySocket);
    });

    proxyReq.on('error', () => {
      socket.destroy();
    });

    proxyReq.end();
  }
});

// Serve built frontend assets statically if available
const frontendDist = path.join(__dirname, 'frontend', 'dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/media')) {
      return next();
    }
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

const PORT = process.env.PORT || 5000;

async function start() {
  try {
    // 1. Initialize SQLite Database
    await initDb();
    await paymentGatewayService.init(getDb());

    // 2. Start all active sessions in the background
    await initAllSessions(io);

    // 3. Start GHL Token Expiry Background Refresh Daemon
    ghlAuthService.startBackgroundRefreshWorker();

    // 4. Socket.io handling with Multi-Tenant Room Isolation
    io.use((socket, next) => {
      try {
        const token = socket.handshake.auth?.token || socket.handshake.query?.token;
        const tenantId = socket.handshake.auth?.tenant_id || socket.handshake.auth?.tenantId || socket.handshake.query?.tenant_id || socket.handshake.query?.tenantId;
        
        if (token) {
          try {
            const decoded = jwt.verify(token, JWT_SECRET);
            socket.userId = decoded.id;
            socket.tenantId = decoded.tenant_id || decoded.tenantId || decoded.companyId || tenantId || 'default';
          } catch {
            const unverified = jwt.decode(token);
            socket.userId = unverified?.sub || unverified?.user_id || 'anonymous';
            socket.tenantId = unverified?.tenant_id || unverified?.tenantId || unverified?.companyId || tenantId || 'default';
          }
        } else if (tenantId) {
          socket.tenantId = tenantId;
        } else {
          socket.tenantId = 'default';
        }
      } catch (err) {
        socket.tenantId = 'default';
      }
      next();
    });

    io.on('connection', (socket) => {
      const room = `tenant_${socket.tenantId}`;
      socket.join(room);
      console.log(`Socket client connected: ${socket.id} (Joined Room: ${room})`);
      
      // Support dynamic tenant room joining
      socket.on('join_tenant', (newTenantId) => {
        if (newTenantId) {
          socket.join(`tenant_${newTenantId}`);
          console.log(`Socket ${socket.id} joined room: tenant_${newTenantId}`);
        }
      });
      
      socket.on('disconnect', () => {
        console.log('Socket client disconnected:', socket.id);
      });
    });

    // 5. Start listening on the port
    server.listen(PORT, () => {
      console.log(`=============================================`);
      console.log(`WhatsApp CRM Backend running on port ${PORT}`);
      console.log(`=============================================`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
