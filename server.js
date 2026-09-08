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

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

// Setup API routes (Mount on both /api and / for unified GHL webhook compatibility)
const routesHandler = setupRoutes(io);
app.use('/api', routesHandler);
app.use('/', routesHandler);

// Voxbay standard webhook endpoint (/callcenterbridging)
const handleVoxbayWebhook = async (req, res) => {
  try {
    const payload = { ...req.query, ...req.body };
    console.log('[Global Voxbay Webhook Received]', JSON.stringify(payload));
    res.setHeader('Content-Type', 'text/plain');
    res.status(200).send('success');
  } catch (err) {
    console.error('[Voxbay Webhook Global Handler Error]', err);
    res.setHeader('Content-Type', 'text/plain');
    res.status(200).send('success');
  }
};
app.post('/callcenterbridging', handleVoxbayWebhook);
app.get('/callcenterbridging', handleVoxbayWebhook);
app.post('/voxbay', handleVoxbayWebhook);
app.get('/voxbay', handleVoxbayWebhook);

// Serve built frontend assets statically if available
const frontendDist = path.join(__dirname, 'frontend', 'dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/media') || req.path.startsWith('/voxbay') || req.path.startsWith('/callcenterbridging')) {
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
