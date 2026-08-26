import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { initDb } from './db.js';
import setupRoutes from './routes.js';
import { initAllSessions } from './sessionManager.js';

dotenv.config();

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

// Setup API routes
app.use('/api', setupRoutes(io));

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

const PORT = process.env.PORT || 5000;

async function start() {
  try {
    // 1. Initialize SQLite Database
    await initDb();

    // 2. Start all active sessions in the background
    await initAllSessions(io);

    // 3. Socket.io handling
    io.on('connection', (socket) => {
      console.log('Socket client connected:', socket.id);
      
      socket.on('disconnect', () => {
        console.log('Socket client disconnected:', socket.id);
      });
    });

    // 4. Start listening on the port
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
