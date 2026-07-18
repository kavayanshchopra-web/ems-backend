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

// Setup API routes
app.use('/api', setupRoutes(io));

// Serve built frontend in production if dist exists
const frontendDistDir = path.join(__dirname, '../frontend/dist');
if (fs.existsSync(frontendDistDir)) {
  app.use(express.static(frontendDistDir));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/media')) return next();
    res.sendFile(path.join(frontendDistDir, 'index.html'));
  });
}

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
