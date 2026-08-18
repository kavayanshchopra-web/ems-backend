import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import Stripe from 'stripe';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { 
  getAllSessions, 
  saveSession, 
  getRecentChats, 
  getMessagesForContact, 
  updateContactCRM,
  updateContactProfilePic,
  markMessagesAsRead,
  getDb,
  saveContact,
  saveWebhookLog,
  getWebhookLogs,
  getContact,
  getChatbotRules,
  addChatbotRule,
  deleteChatbotRule,
  toggleChatbotRule,
  saveScheduledMessage,
  deleteScheduledMessage,
  getScheduledMessagesForContact,
  updateMessageStarStatus,
  getStarredMessagesForContact,
  createTenant,
  getTenant,
  getUserByEmail,
  createUser,
  getTenantSettings,
  updateTenantSettings,
  getSession,
  getTenantPlanDetails,
  getAllPlans,
  addOrUpdatePlan,
  getPlanPrices,
  updatePlanPrice,
  deletePlanPrice,
  getPlansWithPrices,
  getEmployees,
  getEmployeesCount,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getAttendanceLogs,
  getEmployeeAttendanceToday,
  checkInEmployee,
  checkOutEmployee,
  addGpsLocation,
  getLiveLocations,
  getGpsHistory,
  getTasks,
  createTask,
  updateTask,
  deleteTask,
  getNotices,
  createNotice,
  deleteNotice,
  getHolidays,
  createHoliday,
  deleteHoliday,
  getLeaves,
  createLeave,
  updateLeaveStatus,
  getSimBridgeDevices,
  getSimBridgeDeviceByStaff,
  registerOrUpdateSimDevice,
  getCallLogs,
  createCallLog
} from './db.js';
import { 
  startSession, 
  stopSession, 
  destroySession, 
  sendWhatsAppMessage, 
  sendWhatsAppMedia,
  getProfilePicUrl,
  checkWhatsAppNumber
} from './sessionManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const recordingsDir = path.join(__dirname, 'media_store', 'recordings');
if (!fs.existsSync(recordingsDir)) {
  fs.mkdirSync(recordingsDir, { recursive: true });
}

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'omniflow_super_secret_jwt_key';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mock_secret_key');

// JWT Token authentication middleware
const globalWebhookLogs = [];

export async function authMiddleware(req, res, next) {
  // Allow login, signup, and webhook testing routes without token
  if (req.path.startsWith('/auth/') || req.path === '/billing/webhook' || req.path.includes('/integrations/webhook/') || req.path.includes('/integrations/oauth/')) {
    return next();
  }

  const authHeader = req.headers['authorization'];
  const token = authHeader ? authHeader.split(' ')[1] : null;

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded; // { id, email, role, tenant_id }
      return next();
    } catch (err) {
      console.warn('JWT verify notice:', err.message);
    }
  }

  // Fallback default superadmin user for local dev/testing
  req.user = { id: 1, email: 'admin@omniflow.com', role: 'superadmin', tenant_id: 1 };
  next();
}

// Helper to check user roles
function checkRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Access denied: login required' });
    }
    if (req.user.role === 'superadmin' || allowedRoles.includes(req.user.role)) {
      return next();
    }
    return res.status(403).json({ error: 'Access denied: insufficient permissions' });
  };
}

export default function setupRoutes(io) {
  // Register Auth Middleware globally
  router.use(authMiddleware);

  // ==========================================
  // AUTHENTICATION ROUTES (Public)
  // ==========================================

  // Tenant Signup (Creates tenant + owner user)
  router.post('/auth/register', async (req, res) => {
    const { email, password, companyName } = req.body;
    if (!email || !password || !companyName) {
      return res.status(400).json({ error: 'email, password, and companyName are required' });
    }

    try {
      const existingUser = await getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: 'User with this email already exists' });
      }

      // 1. Create tenant and seed settings
      const tenant = await createTenant(companyName);

      // 2. Hash password and save user
      const passwordHash = await bcrypt.hash(password, 10);
      const role = email.toLowerCase().trim() === 'admin@omniflow.com' ? 'superadmin' : 'owner';
      const user = await createUser(email, passwordHash, role, tenant.id);

      if (role === 'superadmin') {
        const db = getDb();
        await db.run(`UPDATE tenants SET plan_id = 'pro' WHERE id = ?`, [tenant.id]);
      }

      // 3. Generate token
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role, tenant_id: tenant.id },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.status(201).json({
        token,
        user: { id: user.id, email: user.email, role: user.role, tenantId: tenant.id },
        tenant
      });
    } catch (err) {
      console.error('Registration error:', err);
      res.status(500).json({ error: 'Registration failed. Please try again.' });
    }
  });

  // Login Route
  router.post('/auth/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    try {
      const user = await getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const match = await bcrypt.compare(password, user.password_hash);
      if (!match) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const tenant = await getTenant(user.tenant_id);

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role, tenant_id: user.tenant_id },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({
        token,
        user: { id: user.id, email: user.email, role: user.role, tenantId: user.tenant_id },
        tenant
      });
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ error: 'Login failed' });
    }
  });

  // Get logged-in user profile details
  router.get('/auth/me', async (req, res) => {
    try {
      const tenant = await getTenant(req.user.tenant_id);
      res.json({
        user: req.user,
        tenant
      });
    } catch (err) {
      res.status(500).json({ error: 'Failed to retrieve profile' });
    }
  });

  // ==========================================
  // BILLING & SUBSCRIPTIONS (Stripe)
  // ==========================================

  // Create checkout session for subscription
  router.post('/billing/create-checkout-session', async (req, res) => {
    const { priceId } = req.body;
    if (!priceId) {
      return res.status(400).json({ error: 'priceId is required' });
    }

    try {
      const tenant = await getTenant(req.user.tenant_id);
      
      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [{
          price: priceId,
          quantity: 1,
        }],
        customer: tenant.stripe_customer_id || undefined,
        customer_email: tenant.stripe_customer_id ? undefined : req.user.email,
        success_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/billing-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/billing-cancel`,
        subscription_data: {
          metadata: {
            tenantId: req.user.tenant_id.toString()
          }
        },
        metadata: {
          tenantId: req.user.tenant_id.toString()
        }
      });

      res.json({ url: session.url });
    } catch (err) {
      console.error('Stripe checkout error:', err);
      res.status(500).json({ error: err.message || 'Failed to create checkout session' });
    }
  });

  // Stripe Portal session for customer subscription management
  router.post('/billing/create-portal-session', async (req, res) => {
    try {
      const tenant = await getTenant(req.user.tenant_id);
      if (!tenant || !tenant.stripe_customer_id) {
        return res.status(400).json({ error: 'No active Stripe billing profile found.' });
      }

      const session = await stripe.billingPortal.sessions.create({
        customer: tenant.stripe_customer_id,
        return_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/settings`,
      });

      res.json({ url: session.url });
    } catch (err) {
      console.error('Stripe Portal session error:', err);
      res.status(500).json({ error: 'Failed to create customer portal session' });
    }
  });

  // Stripe Webhook handler to sync subscription status updates
  router.post('/billing/webhook', async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;
    try {
      if (webhookSecret && sig) {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
      } else {
        // Fallback for local sandbox/testing if webhook secret is not set
        event = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      }
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    const session = event.data?.object;
    try {
      switch (event.type) {
        case 'checkout.session.completed':
          if (session.metadata?.tenantId) {
            await updateTenantSubscription(
              parseInt(session.metadata.tenantId),
              'active',
              session.customer
            );
            console.log(`[Stripe Webhook] Tenant ${session.metadata.tenantId} activated. Customer ID: ${session.customer}`);
          }
          break;
        case 'invoice.payment_succeeded':
          if (session.subscription) {
            try {
              const subscription = await stripe.subscriptions.retrieve(session.subscription);
              const tenantId = subscription.metadata?.tenantId || subscription.subscription_data?.metadata?.tenantId;
              if (tenantId) {
                await updateTenantSubscription(parseInt(tenantId), 'active', session.customer);
                console.log(`[Stripe Webhook] Tenant ${tenantId} invoice payment succeeded.`);
              }
            } catch (retrieveErr) {
              console.error('[Stripe Webhook] Error retrieving subscription details:', retrieveErr.message);
            }
          }
          break;
        case 'customer.subscription.updated':
          const subUpdated = event.data.object;
          const updatedTenantId = subUpdated.metadata?.tenantId;
          if (updatedTenantId) {
            const status = subUpdated.status === 'active' || subUpdated.status === 'trialing' ? 'active' : 'past_due';
            await updateTenantSubscription(parseInt(updatedTenantId), status);
            console.log(`[Stripe Webhook] Tenant ${updatedTenantId} subscription updated to status: ${status}`);
          }
          break;
        case 'customer.subscription.deleted':
          const subDeleted = event.data.object;
          const deletedTenantId = subDeleted.metadata?.tenantId;
          if (deletedTenantId) {
            await updateTenantSubscription(parseInt(deletedTenantId), 'cancelled');
            console.log(`[Stripe Webhook] Tenant ${deletedTenantId} subscription cancelled.`);
          }
          break;
        default:
          // Ignored event types
      }
    } catch (dbErr) {
      console.error('[Stripe Webhook] Error updating tenant subscription status in database:', dbErr);
    }

    res.json({ received: true });
  });

  // ==========================================
  // DYNAMIC SETTINGS ROUTES
  // ==========================================
  
  router.get('/settings', async (req, res) => {
    try {
      const settings = await getTenantSettings(req.user.tenant_id);
      res.json(settings || {});
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to retrieve settings' });
    }
  });

  router.put('/settings', checkRole(['owner', 'admin']), async (req, res) => {
    const { pipelineStages, tags } = req.body;
    try {
      const updated = await updateTenantSettings(req.user.tenant_id, { pipelineStages, tags });
      res.json(updated);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to update settings' });
    }
  });

  // ==========================================
  // WHATSAPP CHANNELS / SESSIONS
  // ==========================================

  // Create a new WhatsApp session
  router.post('/sessions', checkRole(['owner', 'admin']), async (req, res) => {
    const { phoneName } = req.body;
    if (!phoneName) {
      return res.status(400).json({ error: 'phoneName is required' });
    }

    try {
      const plan = await getTenantPlanDetails(req.user.tenant_id);
      const currentSessions = await getAllSessions(req.user.tenant_id);
      
      if (req.user.role !== 'superadmin' && plan && currentSessions.length >= plan.max_channels) {
        return res.status(403).json({ 
          error: `Plan Limit Exceeded: Your plan (${plan.name}) allows a maximum of ${plan.max_channels} active channel(s). Please upgrade to add more.` 
        });
      }

      const sessionId = 'session_' + Date.now();
      await saveSession(sessionId, phoneName, req.user.tenant_id);
      
      startSession(sessionId, io).catch(err => {
        console.error('Error starting session:', err);
      });

      res.status(201).json({ id: sessionId, phoneName, status: 'disconnected' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to create session' });
    }
  });

  // Get all active sessions
  router.get('/sessions', async (req, res) => {
    try {
      const sessions = await getAllSessions(req.user.tenant_id);
      res.json(sessions);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to retrieve sessions' });
    }
  });

  // Start/Reconnect a session
  router.post('/sessions/start/:id', checkRole(['owner', 'admin']), async (req, res) => {
    const { id } = req.params;
    try {
      const session = await getSession(id);
      if (!session || session.tenant_id !== req.user.tenant_id) {
        return res.status(403).json({ error: 'Access denied to this session' });
      }

      startSession(id, io).catch(err => {
        console.error('Error starting session:', err);
      });
      res.json({ message: 'Session start initiated' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to initiate session start' });
    }
  });

  // Stop a session
  router.post('/sessions/stop/:id', checkRole(['owner', 'admin']), async (req, res) => {
    const { id } = req.params;
    try {
      const session = await getSession(id);
      if (!session || session.tenant_id !== req.user.tenant_id) {
        return res.status(403).json({ error: 'Access denied to this session' });
      }

      await stopSession(id);
      res.json({ message: 'Session stopped' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to stop session' });
    }
  });

  // Delete a session completely
  router.delete('/sessions/:id', checkRole(['owner', 'admin']), async (req, res) => {
    const { id } = req.params;
    try {
      const session = await getSession(id);
      if (session && req.user.role !== 'superadmin' && session.tenant_id !== req.user.tenant_id) {
        return res.status(403).json({ error: 'Access denied to this session' });
      }

      await destroySession(id);
      res.json({ message: 'Session deleted' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to delete session' });
    }
  });

  // ==========================================
  // CRM CONTACTS
  // ==========================================

  // Get contacts / recent chats
  router.get('/contacts', async (req, res) => {
    try {
      const contacts = await getRecentChats(req.user.tenant_id);
      res.json(contacts);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to retrieve contacts' });
    }
  });

  // Get messages for a contact
  router.get('/contacts/:id/messages', async (req, res) => {
    const { id } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    try {
      const messages = await getMessagesForContact(id, limit, offset, req.user.tenant_id);
      
      const db = getDb();
      const countRow = await db.get(`SELECT COUNT(*) as total FROM messages WHERE contact_id = ? AND tenant_id = ?`, [id, req.user.tenant_id]);
      const total = countRow ? countRow.total : 0;
      
      res.json({
        messages,
        total,
        hasMore: offset + messages.length < total
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to retrieve message history' });
    }
  });

  // Mark messages as read
  router.put('/contacts/:id/read', async (req, res) => {
    const { id } = req.params;
    try {
      await markMessagesAsRead(id, req.user.tenant_id);
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to mark messages as read' });
    }
  });

  // Start a new chat
  router.post('/contacts/new', async (req, res) => {
    const { phone, name, initialMessage, sessionId } = req.body;
    if (!phone) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    try {
      const cleanPhone = phone.replace(/[^0-9]/g, '');
      const verifiedJid = await checkWhatsAppNumber(cleanPhone);
      if (!verifiedJid) {
        return res.status(404).json({ error: 'This phone number is not registered on WhatsApp.' });
      }

      let contact = await getContact(verifiedJid, req.user.tenant_id);
      if (!contact) {
        await saveContact(verifiedJid, name || null, req.user.tenant_id);
        contact = await getContact(verifiedJid, req.user.tenant_id);
      } else if (name) {
        const db = getDb();
        await db.run(`UPDATE contacts SET name = ? WHERE id = ? AND tenant_id = ?`, [name, verifiedJid, req.user.tenant_id]);
        contact = await getContact(verifiedJid, req.user.tenant_id);
      }

      if (initialMessage && initialMessage.trim() && sessionId) {
        // Double check session belongs to tenant
        const session = await getSession(sessionId);
        if (session && session.tenant_id === req.user.tenant_id) {
          await sendWhatsAppMessage(sessionId, verifiedJid, initialMessage.trim());
        }
      }

      res.status(201).json(contact);
    } catch (err) {
      console.error('Error starting new chat:', err);
      res.status(500).json({ error: err.message || 'Failed to start new chat' });
    }
  });

  // 2-Way CRM Sync from OmniFlow Chrome Extension / Web Overlay
  router.post('/contacts/crm-sync', async (req, res) => {
    const { name, phone, stage, notes, dealValue, customName, email, labels } = req.body;
    if (!phone && !name) {
      return res.status(400).json({ error: 'Phone or Name is required for CRM sync' });
    }

    try {
      const cleanPhone = (phone || '').replace(/[^0-9]/g, '');
      const contactId = cleanPhone ? `${cleanPhone}@s.whatsapp.net` : `${name.replace(/\s+/g, '_')}@temp.net`;
      
      let contact = await getContact(contactId, req.user.tenant_id);
      if (!contact) {
        await saveContact(contactId, name || cleanPhone || 'New Contact', req.user.tenant_id, stage || 'new');
      }

      const updated = await updateContactCRM(contactId, {
        customName: customName || name,
        email,
        notes,
        pipelineStage: stage,
        labels,
        dealValue
      }, req.user.tenant_id);

      io.emit('contact_update', updated);
      res.json({ success: true, contact: updated });
    } catch (err) {
      console.error('[CRM-Sync Error]', err);
      res.status(500).json({ error: 'Failed to sync CRM data from extension' });
    }
  });

  // Update CRM information for a contact
  router.put('/contacts/:id', async (req, res) => {
    const { id } = req.params;
    const { customName, email, notes, pipelineStage, labels, dealValue } = req.body;
    try {
      const updated = await updateContactCRM(id, {
        customName,
        email,
        notes,
        pipelineStage,
        labels,
        dealValue
      }, req.user.tenant_id);
      
      io.emit('contact_update', updated);
      res.json(updated);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to update contact CRM data' });
    }
  });

  // Archive or unarchive a contact
  router.put('/contacts/:id/archive', async (req, res) => {
    const { id } = req.params;
    const { isArchived } = req.body;
    try {
      const db = getDb();
      await db.run(
        `UPDATE contacts SET is_archived = ? WHERE id = ? AND tenant_id = ?`,
        [isArchived ? 1 : 0, id, req.user.tenant_id]
      );
      
      const updated = await getContact(id, req.user.tenant_id);
      io.emit('contact_update', updated);
      res.json(updated);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to update archive status' });
    }
  });

  // ==========================================
  // SCHEDULED MESSAGES
  // ==========================================

  router.get('/contacts/:id/scheduled', async (req, res) => {
    const { id } = req.params;
    try {
      const messages = await getScheduledMessagesForContact(id, req.user.tenant_id);
      res.json(messages);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch scheduled messages' });
    }
  });

  router.post('/contacts/:id/scheduled', async (req, res) => {
    const { id } = req.params;
    const { sessionId, messageText, sendAt } = req.body;
    if (!sessionId || !messageText || !sendAt) {
      return res.status(400).json({ error: 'sessionId, messageText, and sendAt are required' });
    }

    try {
      const plan = await getTenantPlanDetails(req.user.tenant_id);
      if (plan && plan.allow_scheduler !== 1) {
        return res.status(403).json({
          error: `Feature Lock: Scheduled messages are not enabled on your plan (${plan.name}). Please upgrade to unlock message automation.`
        });
      }

      const session = await getSession(sessionId);
      if (!session || session.tenant_id !== req.user.tenant_id) {
        return res.status(403).json({ error: 'Session access denied' });
      }

      const scheduled = await saveScheduledMessage(sessionId, id, messageText.trim(), parseInt(sendAt), req.user.tenant_id);
      io.emit('scheduled_message_update', { contactId: id });
      res.status(201).json(scheduled);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to schedule message' });
    }
  });

  router.delete('/scheduled/:id', async (req, res) => {
    const { id } = req.params;
    try {
      const db = getDb();
      const msg = await db.get(`SELECT contact_id FROM scheduled_messages WHERE id = ? AND tenant_id = ?`, [id, req.user.tenant_id]);
      if (msg) {
        await deleteScheduledMessage(id, req.user.tenant_id);
        io.emit('scheduled_message_update', { contactId: msg.contact_id });
      }
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to delete scheduled message' });
    }
  });

  // ==========================================
  // STARRED MESSAGES & SENDING
  // ==========================================

  router.put('/messages/:id/star', async (req, res) => {
    const { id } = req.params;
    const { isStarred } = req.body;
    try {
      const updated = await updateMessageStarStatus(id, isStarred, req.user.tenant_id);
      io.emit('message_star_update', { id, isStarred: updated.is_starred });
      res.json(updated);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to update star status' });
    }
  });

  router.get('/contacts/:id/starred', async (req, res) => {
    const { id } = req.params;
    try {
      const starred = await getStarredMessagesForContact(id, req.user.tenant_id);
      res.json(starred);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch starred messages' });
    }
  });

  // Send WhatsApp message
  router.post('/messages/send', async (req, res) => {
    const { sessionId, recipientJid, text } = req.body;
    if (!sessionId || !recipientJid || !text) {
      return res.status(400).json({ error: 'sessionId, recipientJid, and text are required' });
    }

    try {
      const session = await getSession(sessionId);
      if (!session || session.tenant_id !== req.user.tenant_id) {
        return res.status(403).json({ error: 'Session access denied' });
      }

      const sentMessage = await sendWhatsAppMessage(sessionId, recipientJid, text);
      
      io.emit('new_message', {
        id: sentMessage.id,
        sessionId,
        session_id: sessionId,
        contactId: sentMessage.recipientJid,
        contact_id: sentMessage.recipientJid,
        fromMe: 1,
        from_me: 1,
        textContent: text,
        text_content: text,
        mediaType: 'text',
        media_type: 'text',
        timestamp: sentMessage.timestamp,
        tenantId: req.user.tenant_id
      });

      res.json({ message: 'Message sent successfully', data: sentMessage });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message || 'Failed to send message' });
    }
  });

  // Send Media Message
  router.post('/messages/send-media', async (req, res) => {
    const { sessionId, recipientJid, mediaType, fileName, fileMimeType, fileData } = req.body;
    if (!sessionId || !recipientJid || !mediaType || !fileData) {
      return res.status(400).json({ error: 'sessionId, recipientJid, mediaType, and fileData are required' });
    }

    try {
      const session = await getSession(sessionId);
      if (!session || session.tenant_id !== req.user.tenant_id) {
        return res.status(403).json({ error: 'Session access denied' });
      }

      const matches = fileData.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) {
        return res.status(400).json({ error: 'Invalid base64 file data format' });
      }

      const mimeType = matches[1];
      const base64Data = matches[2];
      const buffer = Buffer.from(base64Data, 'base64');

      const sentMedia = await sendWhatsAppMedia(
        sessionId,
        recipientJid,
        mediaType,
        buffer,
        fileName || `attachment_${Date.now()}`,
        fileMimeType || mimeType
      );

      io.emit('new_message', {
        id: sentMedia.id,
        sessionId,
        contactId: sentMedia.contactId,
        fromMe: 1,
        textContent: sentMedia.textContent,
        mediaType: sentMedia.mediaType,
        mediaUrl: sentMedia.mediaUrl,
        timestamp: sentMedia.timestamp,
        tenantId: req.user.tenant_id
      });

      res.json({ message: 'Media sent successfully', data: sentMedia });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message || 'Failed to send media message' });
    }
  });

  // Get and cache profile pic
  router.get('/contacts/:id/profile-pic', async (req, res) => {
    const { id } = req.params;
    try {
      const picUrl = await getProfilePicUrl(id);
      if (picUrl) {
        await updateContactProfilePic(id, picUrl);
      }
      res.json({ profile_pic_url: picUrl });
    } catch (err) {
      res.json({ profile_pic_url: null });
    }
  });

  // ==========================================
  // CHATBOT RULES
  // ==========================================

  router.get('/chatbot', async (req, res) => {
    try {
      const rules = await getChatbotRules(req.user.tenant_id);
      res.json(rules);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to retrieve chatbot rules' });
    }
  });

  router.post('/chatbot', async (req, res) => {
    const { keyword, matchType, replyText } = req.body;
    if (!keyword || !replyText) {
      return res.status(400).json({ error: 'keyword and replyText are required' });
    }
    try {
      const plan = await getTenantPlanDetails(req.user.tenant_id);
      if (plan && plan.allow_chatbot !== 1) {
        return res.status(403).json({
          error: `Feature Lock: Automated chatbot rules are not enabled on your plan (${plan.name}). Please upgrade to unlock bot responses.`
        });
      }

      const newRule = await addChatbotRule(keyword, matchType || 'contains', replyText, req.user.tenant_id);
      res.status(201).json(newRule);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message || 'Failed to add chatbot rule' });
    }
  });

  router.put('/chatbot/:id/toggle', async (req, res) => {
    const { id } = req.params;
    const { isActive } = req.body;
    try {
      await toggleChatbotRule(id, isActive, req.user.tenant_id);
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to toggle chatbot rule' });
    }
  });

  router.delete('/chatbot/:id', async (req, res) => {
    const { id } = req.params;
    try {
      await deleteChatbotRule(id, req.user.tenant_id);
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to delete chatbot rule' });
    }
  });

  // ==========================================
  // HR EMPLOYEE DIRECTORY CRUD
  // ==========================================

  // 1. Get all employees in workspace
  router.get('/employees', checkRole(['owner', 'admin', 'manager']), async (req, res) => {
    try {
      const list = await getEmployees(req.user.tenant_id);
      res.json(list);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to retrieve employees directory' });
    }
  });

  // 2. Add a new employee profile (with Plan limits validation)
  router.post('/employees', checkRole(['owner', 'admin']), async (req, res) => {
    const { firstName, lastName, email, phone, role, department, salary, createLoginAccount, password } = req.body;
    if (!firstName) {
      return res.status(400).json({ error: 'firstName is required' });
    }

    try {
      // Plan limit check
      const currentCount = await getEmployeesCount(req.user.tenant_id);
      const plan = await getTenantPlanDetails(req.user.tenant_id);
      if (plan && currentCount >= plan.max_employees) {
        return res.status(403).json({
          error: `Plan Limit Exceeded: Your plan (${plan.name}) allows a maximum of ${plan.max_employees} employees. Please upgrade to add more team members.`
        });
      }

      let userId = null;
      // Optional Login Account creation helper
      if (createLoginAccount && email && password) {
        // Check if user already exists
        const existingUser = await getUserByEmail(email);
        if (existingUser) {
          return res.status(400).json({ error: 'A login account with this email address already exists.' });
        }
        // Hash password and save user
        const passwordHash = await bcrypt.hash(password, 10);
        // Map role (owner remains system registry owner, employees become admins/managers/agents/employees)
        const userRole = role === 'admin' ? 'admin' : (role === 'manager' ? 'manager' : 'agent');
        const user = await createUser(email, passwordHash, userRole, req.user.tenant_id);
        userId = user.id;
      }

      const newEmployee = await createEmployee(req.user.tenant_id, {
        firstName,
        lastName,
        email,
        phone,
        role: role || 'employee',
        department,
        salary: salary || 0,
        userId
      });

      res.status(201).json(newEmployee);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message || 'Failed to add employee profile' });
    }
  });

  // 3. Update employee profile details
  router.put('/employees/:id', checkRole(['owner', 'admin']), async (req, res) => {
    const { id } = req.params;
    const { firstName, lastName, email, phone, role, department, salary, status } = req.body;
    if (!firstName) {
      return res.status(400).json({ error: 'firstName is required' });
    }

    try {
      const updated = await updateEmployee(req.user.tenant_id, id, {
        firstName,
        lastName,
        email,
        phone,
        role,
        department,
        salary,
        status
      });
      res.json(updated);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to update employee details' });
    }
  });

  // 4. Delete employee profile (and delete their user login if linked)
  router.delete('/employees/:id', checkRole(['owner', 'admin']), async (req, res) => {
    const { id } = req.params;
    try {
      await deleteEmployee(req.user.tenant_id, id);
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to delete employee profile' });
    }
  });

  // ==========================================
  // GPS & FIELD ATTENDANCE ROUTERS
  // ==========================================

  // Check plan for GPS permissions
  const checkGpsPlanAccess = async (req, res, next) => {
    try {
      const plan = await getTenantPlanDetails(req.user.tenant_id);
      if (plan && plan.allow_gps_tracking === 1) {
        next();
      } else {
        res.status(403).json({ 
          error: 'Feature Locked: Live GPS tracking and Field Attendance is not enabled on your current plan. Please upgrade to Pro to unlock.' 
        });
      }
    } catch (err) {
      res.status(500).json({ error: 'Plan verification failed' });
    }
  };

  // 1. Get workspace attendance history (Owner, Admin, Manager)
  router.get('/attendance', checkRole(['owner', 'admin', 'manager']), checkGpsPlanAccess, async (req, res) => {
    try {
      const logs = await getAttendanceLogs(req.user.tenant_id);
      res.json(logs);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to retrieve attendance logs' });
    }
  });

  async function getOrCreateEmployeeForUser(tenantId, user) {
    const dbInstance = getDb();
    let employee = await dbInstance.get(
      `SELECT id FROM employees WHERE user_id = ? AND tenant_id = ?`,
      [user.id, tenantId]
    );
    if (!employee) {
      const u = await dbInstance.get(`SELECT * FROM users WHERE id = ?`, [user.id]);
      const nameParts = ((u && (u.displayName || u.username)) || 'Employee').split(' ');
      const firstName = nameParts[0] || 'Employee';
      const lastName = nameParts.slice(1).join(' ') || '';
      const email = (u && u.email) || `user_${user.id}@workspace.local`;
      const role = (u && u.role) || 'employee';
      const result = await dbInstance.run(
        `INSERT INTO employees (tenant_id, first_name, last_name, email, phone, role, department, salary, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [tenantId, firstName, lastName, email, '', role, 'General', 0, user.id]
      );
      employee = { id: result.lastID };
    }
    return employee;
  }

  // 2. Get today's attendance status for logged-in user
  router.get('/attendance/today', async (req, res) => {
    try {
      const employee = await getOrCreateEmployeeForUser(req.user.tenant_id, req.user);
      const todayLog = await getEmployeeAttendanceToday(req.user.tenant_id, employee.id);
      res.json(todayLog || { status: 'checked_out' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to retrieve today\'s status' });
    }
  });

  // 3. Employee Check-In (plan gate removed — basic attendance is free)
  router.post('/attendance/check-in', async (req, res) => {
    const { lat, lng } = req.body || {};
    try {
      const employee = await getOrCreateEmployeeForUser(req.user.tenant_id, req.user);

      // Check if already checked in
      const dbInstance = getDb();
      const activeLog = await dbInstance.get(
        `SELECT id FROM attendance_logs WHERE tenant_id = ? AND employee_id = ? AND status = 'checked_in'`,
        [req.user.tenant_id, employee.id]
      );
      if (activeLog) {
        return res.status(400).json({ error: 'You are already checked in.' });
      }

      const log = await checkInEmployee(req.user.tenant_id, employee.id, lat, lng);
      if (lat && lng) {
        await addGpsLocation(req.user.tenant_id, employee.id, lat, lng, 10);
      }
      res.status(201).json(log);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message || 'Failed to check in' });
    }
  });

  // 4. Employee Check-Out (plan gate removed — basic attendance is free)
  router.post('/attendance/check-out', async (req, res) => {
    const { lat, lng } = req.body || {};
    try {
      const employee = await getOrCreateEmployeeForUser(req.user.tenant_id, req.user);
      const log = await checkOutEmployee(req.user.tenant_id, employee.id, lat, lng);
      if (lat && lng) {
        await addGpsLocation(req.user.tenant_id, employee.id, lat, lng, 10);
      }
      res.json(log);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message || 'Failed to check out' });
    }
  });

  // 5. GPS breadcrumb tracking updates
  router.post('/gps/track', checkGpsPlanAccess, async (req, res) => {
    const { lat, lng, accuracy } = req.body;
    if (!lat || !lng) {
      return res.status(400).json({ error: 'Latitude and Longitude parameters are required' });
    }

    try {
      const dbInstance = getDb();
      const employee = await dbInstance.get(
        `SELECT id FROM employees WHERE user_id = ? AND tenant_id = ?`,
        [req.user.id, req.user.tenant_id]
      );
      if (!employee) {
        return res.status(404).json({ error: 'No employee profile linked to current user' });
      }

      await addGpsLocation(req.user.tenant_id, employee.id, lat, lng, accuracy);
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to record tracking ping' });
    }
  });

  // 6. Get live location maps coordinates list (Owner, Admin, Manager)
  router.get('/gps/live', checkRole(['owner', 'admin', 'manager']), checkGpsPlanAccess, async (req, res) => {
    try {
      const list = await getLiveLocations(req.user.tenant_id);
      res.json(list);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to retrieve live tracking points' });
    }
  });

  // 7. Get location breadcrumbs history for a single worker (Owner, Admin, Manager)
  router.get('/gps/history/:employeeId', checkRole(['owner', 'admin', 'manager']), checkGpsPlanAccess, async (req, res) => {
    const { employeeId } = req.params;
    const { date } = req.query;
    try {
      const history = await getGpsHistory(req.user.tenant_id, employeeId, date);
      res.json(history);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to retrieve GPS location logs history' });
    }
  });

  // ==========================================
  // CLONED EMS PORTAL FEATURE ROUTERS
  // ==========================================

  // 1. Tasks CRUD Endpoints
  router.get('/tasks', async (req, res) => {
    try {
      const list = await getTasks(req.user.tenant_id);
      res.json(list);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to retrieve tasks' });
    }
  });

  router.post('/tasks', checkRole(['owner', 'admin', 'manager']), async (req, res) => {
    try {
      const task = await createTask(req.user.tenant_id, req.body);
      res.status(201).json(task);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to create task' });
    }
  });

  router.put('/tasks/:id', async (req, res) => {
    try {
      const task = await updateTask(req.user.tenant_id, req.params.id, req.body);
      res.json(task);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to update task details' });
    }
  });

  router.delete('/tasks/:id', checkRole(['owner', 'admin', 'manager']), async (req, res) => {
    try {
      await deleteTask(req.user.tenant_id, req.params.id);
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to delete task' });
    }
  });

  // 2. Notices CRUD Endpoints
  router.get('/notices', async (req, res) => {
    try {
      const list = await getNotices(req.user.tenant_id);
      res.json(list);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to retrieve notice board logs' });
    }
  });

  router.post('/notices', checkRole(['owner', 'admin', 'manager']), async (req, res) => {
    try {
      const notice = await createNotice(req.user.tenant_id, req.body);
      res.status(201).json(notice);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to publish workspace notice' });
    }
  });

  router.delete('/notices/:id', checkRole(['owner', 'admin', 'manager']), async (req, res) => {
    try {
      await deleteNotice(req.user.tenant_id, req.params.id);
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to delete notice' });
    }
  });

  // 3. Holidays CRUD Endpoints
  router.get('/holidays', async (req, res) => {
    try {
      const list = await getHolidays(req.user.tenant_id);
      res.json(list);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to retrieve holidays calendar' });
    }
  });

  router.post('/holidays', checkRole(['owner', 'admin', 'manager']), async (req, res) => {
    try {
      const holiday = await createHoliday(req.user.tenant_id, req.body);
      res.status(201).json(holiday);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to add calendar holiday' });
    }
  });

  router.delete('/holidays/:id', checkRole(['owner', 'admin', 'manager']), async (req, res) => {
    try {
      await deleteHoliday(req.user.tenant_id, req.params.id);
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to delete calendar holiday' });
    }
  });

  // 4. Leaves CRUD Endpoints
  router.get('/leaves', async (req, res) => {
    try {
      const list = await getLeaves(req.user.tenant_id);
      res.json(list);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to retrieve leaves applications' });
    }
  });

  router.post('/leaves', async (req, res) => {
    try {
      const dbInstance = getDb();
      const employee = await dbInstance.get(
        `SELECT id FROM employees WHERE user_id = ? AND tenant_id = ?`,
        [req.user.id, req.user.tenant_id]
      );
      if (!employee) {
        return res.status(400).json({ error: 'Leaves can only be requested by employee profiles.' });
      }

      const leave = await createLeave(req.user.tenant_id, {
        employeeId: employee.id,
        startDate: req.body.startDate,
        endDate: req.body.endDate,
        type: req.body.type,
        reason: req.body.reason
      });
      res.status(201).json(leave);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to file leave request' });
    }
  });

  router.put('/leaves/:id', checkRole(['owner', 'admin', 'manager']), async (req, res) => {
    const { status } = req.body;
    try {
      const leave = await updateLeaveStatus(req.user.tenant_id, req.params.id, status);
      res.json(leave);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to update leave application status' });
    }
  });

  // ==========================================
  // SAAS DYNAMIC PLANS & PRICING
  // ==========================================

  // Helper check for superadmin
  const checkSuperadmin = (req, res, next) => {
    if (req.user && req.user.role === 'superadmin') {
      next();
    } else {
      res.status(403).json({ error: 'Access denied: Superadmin permission required' });
    }
  };

  // 1. Get plans with dynamic country prices (Public/Subscribers)
  router.get('/billing/plans', async (req, res) => {
    const country = req.query.country || 'DEFAULT';
    try {
      const plans = await getPlansWithPrices(country);
      res.json(plans);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to retrieve plans' });
    }
  });

  // 2. Get all plans details for admin dashboard (Superadmin only)
  router.get('/admin/plans', checkSuperadmin, async (req, res) => {
    try {
      const plans = await getAllPlans(true); // Include inactive plans
      // Map prices into details
      const plansWithPrices = [];
      for (const p of plans) {
        const prices = await getPlanPrices(p.id);
        plansWithPrices.push({
          ...p,
          prices
        });
      }
      res.json(plansWithPrices);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to retrieve plans for admin' });
    }
  });

  // 3. Create or update plan details (Superadmin only)
  router.post('/admin/plans', checkSuperadmin, async (req, res) => {
    const { id, name, description, features, maxChannels, maxContacts, allowChatbot, allowScheduler, isActive } = req.body;
    if (!id || !name) {
      return res.status(400).json({ error: 'id and name are required' });
    }
    try {
      const updated = await addOrUpdatePlan(
        id.trim(),
        name.trim(),
        description,
        features || [],
        parseInt(maxChannels) || 1,
        parseInt(maxContacts) || 250,
        allowChatbot ? 1 : 0,
        allowScheduler ? 1 : 0,
        isActive ? 1 : 0
      );
      res.json(updated);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to save plan details' });
    }
  });

  // 4. Update or add pricing rates (Superadmin only)
  router.post('/admin/prices', checkSuperadmin, async (req, res) => {
    const { planId, countryCode, currency, amount, stripePriceId } = req.body;
    if (!planId || !countryCode || !currency || amount === undefined) {
      return res.status(400).json({ error: 'planId, countryCode, currency, and amount are required' });
    }
    try {
      await updatePlanPrice(
        planId.trim(),
        countryCode.toUpperCase().trim(),
        currency.toUpperCase().trim(),
        parseFloat(amount),
        stripePriceId ? stripePriceId.trim() : null
      );
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to save plan pricing rate' });
    }
  });

  // 5. Delete plan pricing rate (Superadmin only)
  router.delete('/admin/prices/:planId/:countryCode', checkSuperadmin, async (req, res) => {
    const { planId, countryCode } = req.params;
    try {
      await deletePlanPrice(planId, countryCode);
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to delete plan pricing rate' });
    }
  });

  // ==========================================
  // UNIVERSAL INTEGRATIONS & WEBHOOKS RECEIVER
  // ==========================================
  router.all(['/v1/integrations/webhook/receive/:companyId/:source', '/v1/integrations/webhook/receive/:source'], async (req, res) => {
    try {
      if (req.method === 'OPTIONS' || req.method === 'HEAD') {
        return res.status(200).send('OK');
      }

      const companyId = req.params.companyId || 'default_tenant';
      const source = req.params.source || 'ghl';
      const payload = req.body || {};
      const eventType = payload.type || payload.event || `${source}_inbound_event`;
      const timestamp = new Date().toISOString();

      console.log(`📥 [INBOUND WEBHOOK - ${req.method}] Source: ${source} | Company: ${companyId} | Event: ${eventType}`, payload);

      const logRecord = {
        id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        companyId: companyId || 'default_tenant',
        source: source ? source.toUpperCase() : 'WEBHOOK',
        event: eventType,
        status: 200,
        payload: JSON.stringify(payload),
        timestamp
      };

      globalWebhookLogs.unshift(logRecord);
      if (globalWebhookLogs.length > 200) globalWebhookLogs.pop();
      await saveWebhookLog(logRecord);

      // Auto-extract GHL / External Contact Data and Save into DB
      const contactObj = payload.contact || payload;
      const firstName = contactObj.first_name || contactObj.firstName || '';
      const lastName = contactObj.last_name || contactObj.lastName || '';
      const fullName = `${firstName} ${lastName}`.trim() || contactObj.full_name || contactObj.name || contactObj.email || contactObj.phone || 'GHL Lead';
      const rawPhone = contactObj.phone || contactObj.phoneNumber || contactObj.phone_number || '';
      const cleanPhone = rawPhone.replace(/\D/g, '');
      const contactId = cleanPhone ? `${cleanPhone}@s.whatsapp.net` : (contactObj.id ? `ghl_${contactObj.id}` : `ghl_${Date.now()}`);

      try {
        if (fullName && fullName !== 'GHL Lead') {
          await saveContact(contactId, fullName, 1, 'lead');
        }
      } catch (err) {
        console.warn('GHL Auto Contact Save:', err.message);
      }

      if (io) {
        io.emit('webhook_received', logRecord);
        io.emit('contact_updated', { id: contactId, name: fullName, phone: rawPhone, source: 'GHL' });
      }

      try {
        const dbInstance = getDb();
        if (dbInstance) {
          await dbInstance.run(
            `INSERT INTO audit_logs (tenant_id, user_id, user_email, action, details, ip_address) VALUES (?, ?, ?, ?, ?, ?)`,
            [companyId || 'default_tenant', 'system_webhook', 'webhook@ghl.com', `WEBHOOK_${source.toUpperCase()}`, JSON.stringify(logRecord), req.ip || '127.0.0.1']
          );
        }
      } catch (err) {
        console.warn('DB log write warning:', err.message);
      }

      res.status(200).json({ success: true, message: 'Webhook received & logged successfully', timestamp });
    } catch (err) {
      console.error('Webhook receive error:', err);
      res.status(200).json({ success: true, message: 'Webhook received' });
    }
  });

  // Get Webhook Activity Logs
  router.get('/v1/integrations/logs', async (req, res) => {
    try {
      const { companyId } = req.query;
      const cleanId = companyId || 'default_tenant';
      const dbLogs = await getWebhookLogs(cleanId);
      const combinedLogs = [...globalWebhookLogs, ...dbLogs];
      
      // Remove duplicates by id
      const uniqueLogs = [];
      const seenIds = new Set();
      for (const log of combinedLogs) {
        if (!seenIds.has(log.id)) {
          seenIds.add(log.id);
          uniqueLogs.push(log);
        }
      }

      res.json({ success: true, logs: uniqueLogs });
    } catch (err) {
      res.json({ success: true, logs: globalWebhookLogs });
    }
  });

  // Direct GHL Live Contacts Sync Endpoint
  router.post('/v1/integrations/ghl/sync-live-contacts', async (req, res) => {
    try {
      const { companyId, contacts = [] } = req.body;
      const cleanId = companyId || 'default_tenant';
      const syncedLogs = [];

      for (const c of contacts) {
        const fullName = c.name || `${c.firstName || ''} ${c.lastName || ''}`.trim() || c.email || c.phone || 'GHL Contact';
        const rawPhone = c.phone || c.phoneNumber || '';
        const cleanPhone = rawPhone.replace(/\D/g, '');
        const contactId = cleanPhone ? `${cleanPhone}@s.whatsapp.net` : (c.id ? `ghl_${c.id}` : `ghl_${Date.now()}`);

        if (fullName && fullName !== 'GHL Contact') {
          try {
            await saveContact(contactId, fullName, 1);
          } catch (err) {
            console.warn('GHL Sync saveContact warning:', err.message);
          }

          const logItem = {
            id: `ghl_live_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            companyId: cleanId,
            source: 'GHL MARKETPLACE',
            event: 'ContactCreate',
            status: 200,
            payload: JSON.stringify({
              name: fullName,
              email: c.email || '',
              phone: rawPhone,
              locationId: c.locationId || 'loc_webgearz_subaccount',
              tags: c.tags || []
            }),
            timestamp: new Date().toISOString()
          };

          globalWebhookLogs.unshift(logItem);
          syncedLogs.push(logItem);

          if (io) {
            io.emit('webhook_received', logItem);
            io.emit('contact_updated', { id: contactId, name: fullName, phone: rawPhone, source: 'GHL' });
          }
        }
      }

      if (globalWebhookLogs.length > 200) globalWebhookLogs.splice(200);

      res.json({ success: true, count: syncedLogs.length, logs: syncedLogs });
    } catch (err) {
      console.error('GHL Live Sync error:', err);
      res.status(500).json({ error: err.message || 'Failed to sync GHL contacts' });
    }
  });

  // GHL OAuth Callback Redirect Page
  router.get('/v1/integrations/oauth/callback', (req, res) => {
    const { code } = req.query;
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>GHL Integration Connected</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #0f172a; color: white; text-align: center; }
          .card { background: #1e293b; padding: 40px; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); border: 1px solid #334155; max-width: 420px; }
          .icon { font-size: 48px; margin-bottom: 16px; }
          h2 { margin: 0 0 12px 0; color: #14d2cb; font-size: 22px; }
          p { color: #94a3b8; font-size: 14px; line-height: 1.5; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="icon">⚡</div>
          <h2>HighLevel Connected Successfully!</h2>
          <p>Authorization code received. You can close this window and return to OmniFlow EMS.</p>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'GHL_OAUTH_SUCCESS', code: '${code}' }, '*');
            }
            setTimeout(() => window.close(), 3000);
          </script>
        </div>
      </body>
      </html>
    `);
  });

  // ==========================================
  // 📱 SIM BRIDGE & TELECALLING ENDPOINTS
  // ==========================================

  // Socket.io handlers for SIM Bridge
  if (io) {
    io.on('connection', (socket) => {
      // Mobile app joins its staff room
      socket.on('sim_bridge:register_device', async (data) => {
        const { staffId, deviceId, deviceName, simCarrier, simNumber, deviceIp, batteryLevel } = data || {};
        if (staffId) {
          socket.join(`staff_${staffId}`);
          socket.join(`device_${deviceId}`);
          await registerOrUpdateSimDevice(1, {
            staffId,
            staffName: data.staffName || `Staff ${staffId}`,
            deviceId: deviceId || socket.id,
            deviceName: deviceName || 'Android Phone',
            simCarrier: simCarrier || 'Jio 4G',
            simNumber: simNumber || '',
            deviceIp: deviceIp || socket.handshake.address,
            batteryLevel: batteryLevel || 100,
            status: 'online'
          });
          io.emit('sim_bridge:device_updated', { staffId, status: 'online', deviceName, simCarrier });
        }
      });

      // Desktop triggers call to mobile phone
      socket.on('sim_bridge:trigger_call', (data) => {
        const { staffId, customerPhone, customerName } = data || {};
        if (staffId) {
          io.to(`staff_${staffId}`).emit('sim_bridge:incoming_trigger', {
            customerPhone,
            customerName: customerName || 'Customer',
            timestamp: Date.now()
          });
        }
      });

      // Mobile reports call state back to desktop
      socket.on('sim_bridge:call_status', (data) => {
        const { staffId, status, duration, customerPhone } = data || {};
        if (staffId) {
          io.emit(`sim_bridge:status_${staffId}`, { status, duration, customerPhone, timestamp: Date.now() });
        }
      });

      // Desktop or mobile requests hangup
      socket.on('sim_bridge:hangup', (data) => {
        const { staffId } = data || {};
        if (staffId) {
          io.to(`staff_${staffId}`).emit('sim_bridge:hangup_command');
        }
      });
    });
  }

  // Get list of all paired SIM Bridge Devices
  router.get('/sim-bridge/devices', async (req, res) => {
    try {
      const devices = await getSimBridgeDevices(1);
      const now = Date.now();
      const enriched = devices.map(d => {
        const lastSeenMs = d.last_seen ? new Date(d.last_seen).getTime() : 0;
        const isOnline = (now - lastSeenMs) < 30000;
        return {
          ...d,
          isOnline,
          status: isOnline ? (d.status || 'online') : 'offline'
        };
      });
      res.json({ success: true, devices: enriched });
    } catch (err) {
      console.error('Error fetching sim bridge devices:', err);
      res.status(500).json({ error: 'Failed to fetch devices' });
    }
  });

  // Get status of specific staff / extension
  router.get('/sim-bridge/device-status', async (req, res) => {
    try {
      const { staffId, extension } = req.query;
      const device = await getSimBridgeDeviceByStaff(1, extension || staffId || '101');
      if (!device) {
        return res.json({ success: true, isPaired: false, status: 'offline' });
      }
      const lastSeenMs = device.last_seen ? new Date(device.last_seen).getTime() : 0;
      const isOnline = (Date.now() - lastSeenMs) < 30000;
      res.json({
        success: true,
        isPaired: true,
        isOnline,
        device: {
          ...device,
          status: isOnline ? (device.status || 'online') : 'offline'
        }
      });
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch device status' });
    }
  });

  // Pair or update mobile SIM device (from Mobile App)
  router.post('/sim-bridge/pair', async (req, res) => {
    try {
      const device = await registerOrUpdateSimDevice(1, req.body);
      console.log(`📱 [SIM BRIDGE] Staff Device Paired: Ext ${device.extension || device.staff_id} (${device.device_name}) - SIM: ${device.sim_carrier}`);
      if (io) {
        io.emit('sim_bridge:device_paired', device);
      }
      res.json({ success: true, device });
    } catch (err) {
      console.error('Error pairing sim device:', err);
      res.status(500).json({ error: 'Failed to pair device' });
    }
  });

  // Mobile App Heartbeat (keeps device status ONLINE)
  router.post('/sim-bridge/heartbeat', async (req, res) => {
    try {
      const { extension, staffId, batteryLevel, status } = req.body;
      const key = String(extension || staffId || '101');
      await registerOrUpdateSimDevice(1, {
        staffId: key,
        extension: key,
        batteryLevel: batteryLevel || 100,
        status: status || 'online'
      });
      res.json({ success: true, timestamp: Date.now() });
    } catch (err) {
      res.status(500).json({ error: 'Heartbeat failed' });
    }
  });

  const pendingSimCalls = new Map(); // extension/staffId -> call data

  // Poll for pending call command (Mobile App)
  router.get('/sim-bridge/poll-call', (req, res) => {
    const key1 = String(req.query.extension || '');
    const key2 = String(req.query.staffId || '');
    const ext = key1 || key2 || '101';
    
    // Check both extension key and staffId key
    let pending = pendingSimCalls.get(ext);
    if (!pending && key2) pending = pendingSimCalls.get(key2);
    if (!pending && key1) pending = pendingSimCalls.get(key1);

    if (pending && (Date.now() - pending.timestamp < 45000)) {
      pendingSimCalls.delete(ext);
      if (key1) pendingSimCalls.delete(key1);
      if (key2) pendingSimCalls.delete(key2);
      console.log(`⚡ [SIM BRIDGE] Mobile Fetched Call Command -> Dialing ${pending.customerPhone} (Ext: ${ext})`);
      return res.json({ hasCall: true, ...pending });
    }
    res.json({ hasCall: false });
  });

  // REST Trigger Call (Desktop -> Server -> Mobile)
  router.post('/sim-bridge/trigger-call', async (req, res) => {
    try {
      const { staffId, extension, customerPhone, customerName } = req.body;
      if (!customerPhone) {
        return res.status(400).json({ error: 'customerPhone is required' });
      }

      const targetExt = String(extension || staffId || '101');
      console.log(`📞 [SIM BRIDGE] Call Queued from Laptop CRM -> Target Ext: ${targetExt} -> Customer Phone: ${customerPhone}`);

      // Add to pending poll queue for mobile device
      const callData = {
        extension: targetExt,
        staffId: String(staffId || targetExt),
        customerPhone,
        customerName: customerName || 'Customer',
        timestamp: Date.now()
      };

      pendingSimCalls.set(targetExt, callData);
      if (staffId && String(staffId) !== targetExt) {
        pendingSimCalls.set(String(staffId), callData);
      }

      if (io) {
        io.to(`staff_${targetExt}`).emit('sim_bridge:incoming_trigger', callData);
        io.emit(`sim_bridge:status_${targetExt}`, { status: 'DIALING', customerPhone, timestamp: Date.now() });
      }
      res.json({ success: true, message: `Call queued for extension ${targetExt}` });
    } catch (err) {
      console.error('Error triggering sim call:', err);
      res.status(500).json({ error: 'Failed to trigger call' });
    }
  });

  // Telecalling Logs List
  router.get('/telecalling/logs', async (req, res) => {
    try {
      const logs = await getCallLogs(1, 200);
      res.json({ success: true, logs });
    } catch (err) {
      console.error('Error fetching call logs:', err);
      res.status(500).json({ error: 'Failed to fetch call logs' });
    }
  });

  // Save new Call Log
  router.post('/telecalling/logs', async (req, res) => {
    try {
      const log = await createCallLog(1, req.body);
      if (io) {
        io.emit('telecalling:new_log', log);
      }
      res.json({ success: true, log });
    } catch (err) {
      console.error('Error saving call log:', err);
      res.status(500).json({ error: 'Failed to save call log' });
    }
  });

  // Upload Call Audio Recording (.mp3 / base64)
  router.post('/telecalling/upload-recording', async (req, res) => {
    try {
      const { audioBase64, customerPhone, customerName, staffId, staffName, durationSeconds, disposition, notes } = req.body;
      if (!audioBase64) {
        return res.status(400).json({ error: 'audioBase64 payload required' });
      }
      const filename = `call_rec_${staffId || 'staff'}_${Date.now()}.mp3`;
      const filePath = path.join(recordingsDir, filename);
      const cleanBase64 = audioBase64.replace(/^data:audio\/\w+;base64,/, '');
      fs.writeFileSync(filePath, Buffer.from(cleanBase64, 'base64'));

      const recordingUrl = `/media/recordings/${filename}`;
      const log = await createCallLog(1, {
        staffId: staffId || '1',
        staffName: staffName || 'Telecaller',
        customerName: customerName || 'Customer',
        customerPhone: customerPhone || 'Unknown',
        channel: 'SIM',
        type: 'OUTGOING',
        durationSeconds: durationSeconds || 0,
        recordingUrl,
        disposition: disposition || 'Interested',
        notes: notes || 'Auto-recorded via OmniFlow SIM Bridge'
      });

      if (io) {
        io.emit('telecalling:new_log', log);
      }
      res.json({ success: true, recordingUrl, log });
    } catch (err) {
      console.error('Error uploading call recording:', err);
      res.status(500).json({ error: 'Failed to upload call recording' });
    }
  });

  // ==========================================
  // 📱 SIM BRIDGE & TELECALLING ENDPOINTS
  // ==========================================

  // Socket.io handlers for SIM Bridge
  if (io) {
    io.on('connection', (socket) => {
      // Mobile app joins its staff room
      socket.on('sim_bridge:register_device', async (data) => {
        const { staffId, deviceId, deviceName, simCarrier, simNumber, deviceIp, batteryLevel } = data || {};
        if (staffId) {
          socket.join(`staff_${staffId}`);
          socket.join(`device_${deviceId}`);
          await registerOrUpdateSimDevice(1, {
            staffId,
            staffName: data.staffName || `Staff ${staffId}`,
            deviceId: deviceId || socket.id,
            deviceName: deviceName || 'Android Phone',
            simCarrier: simCarrier || 'Jio 4G',
            simNumber: simNumber || '',
            deviceIp: deviceIp || socket.handshake.address,
            batteryLevel: batteryLevel || 100,
            status: 'online'
          });
          io.emit('sim_bridge:device_updated', { staffId, status: 'online', deviceName, simCarrier });
        }
      });

      // Desktop triggers call to mobile phone
      socket.on('sim_bridge:trigger_call', (data) => {
        const { staffId, customerPhone, customerName } = data || {};
        if (staffId) {
          io.to(`staff_${staffId}`).emit('sim_bridge:incoming_trigger', {
            customerPhone,
            customerName: customerName || 'Customer',
            timestamp: Date.now()
          });
        }
      });

      // Mobile reports call state back to desktop
      socket.on('sim_bridge:call_status', (data) => {
        const { staffId, status, duration, customerPhone } = data || {};
        if (staffId) {
          io.emit(`sim_bridge:status_${staffId}`, { status, duration, customerPhone, timestamp: Date.now() });
        }
      });

      // Desktop or mobile requests hangup
      socket.on('sim_bridge:hangup', (data) => {
        const { staffId } = data || {};
        if (staffId) {
          io.to(`staff_${staffId}`).emit('sim_bridge:hangup_command');
        }
      });
    });
  }

  // Get list of all paired SIM Bridge Devices
  router.get('/sim-bridge/devices', async (req, res) => {
    try {
      const devices = await getSimBridgeDevices(1);
      const now = Date.now();
      const enriched = devices.map(d => {
        const lastSeenMs = d.last_seen ? new Date(d.last_seen).getTime() : 0;
        const isOnline = (now - lastSeenMs) < 30000;
        return {
          ...d,
          isOnline,
          status: isOnline ? (d.status || 'online') : 'offline'
        };
      });
      res.json({ success: true, devices: enriched });
    } catch (err) {
      console.error('Error fetching sim bridge devices:', err);
      res.status(500).json({ error: 'Failed to fetch devices' });
    }
  });

  // Get status of specific staff / extension
  router.get('/sim-bridge/device-status', async (req, res) => {
    try {
      const { staffId, extension } = req.query;
      const device = await getSimBridgeDeviceByStaff(1, extension || staffId || '101');
      if (!device) {
        return res.json({ success: true, isPaired: false, status: 'offline' });
      }
      const lastSeenMs = device.last_seen ? new Date(device.last_seen).getTime() : 0;
      const isOnline = (Date.now() - lastSeenMs) < 30000;
      res.json({
        success: true,
        isPaired: true,
        isOnline,
        device: {
          ...device,
          status: isOnline ? (device.status || 'online') : 'offline'
        }
      });
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch device status' });
    }
  });

  // Pair or update mobile SIM device (from Mobile App)
  router.post('/sim-bridge/pair', async (req, res) => {
    try {
      const device = await registerOrUpdateSimDevice(1, req.body);
      console.log(`📱 [SIM BRIDGE] Staff Device Paired: Ext ${device.extension || device.staff_id} (${device.device_name}) - SIM: ${device.sim_carrier}`);
      if (io) {
        io.emit('sim_bridge:device_paired', device);
      }
      res.json({ success: true, device });
    } catch (err) {
      console.error('Error pairing sim device:', err);
      res.status(500).json({ error: 'Failed to pair device' });
    }
  });

  // Mobile App Heartbeat (keeps device status ONLINE)
  router.post('/sim-bridge/heartbeat', async (req, res) => {
    try {
      const { extension, staffId, batteryLevel, status } = req.body;
      const key = String(extension || staffId || '101');
      await registerOrUpdateSimDevice(1, {
        staffId: key,
        extension: key,
        batteryLevel: batteryLevel || 100,
        status: status || 'online'
      });
      res.json({ success: true, timestamp: Date.now() });
    } catch (err) {
      res.status(500).json({ error: 'Heartbeat failed' });
    }
  });

  const pendingSimCalls = new Map(); // extension/staffId -> call data

  // Poll for pending call command (Mobile App)
  router.get('/sim-bridge/poll-call', (req, res) => {
    const key1 = String(req.query.extension || '');
    const key2 = String(req.query.staffId || '');
    const ext = key1 || key2 || '101';
    
    // Check both extension key and staffId key
    let pending = pendingSimCalls.get(ext);
    if (!pending && key2) pending = pendingSimCalls.get(key2);
    if (!pending && key1) pending = pendingSimCalls.get(key1);

    if (pending && (Date.now() - pending.timestamp < 45000)) {
      pendingSimCalls.delete(ext);
      if (key1) pendingSimCalls.delete(key1);
      if (key2) pendingSimCalls.delete(key2);
      console.log(`⚡ [SIM BRIDGE] Mobile Fetched Call Command -> Dialing ${pending.customerPhone} (Ext: ${ext})`);
      return res.json({ hasCall: true, ...pending });
    }
    res.json({ hasCall: false });
  });

  // REST Trigger Call (Desktop -> Server -> Mobile)
  router.post('/sim-bridge/trigger-call', async (req, res) => {
    try {
      const { staffId, extension, customerPhone, customerName } = req.body;
      if (!customerPhone) {
        return res.status(400).json({ error: 'customerPhone is required' });
      }

      const targetExt = String(extension || staffId || '101');
      console.log(`📞 [SIM BRIDGE] Call Queued from Laptop CRM -> Target Ext: ${targetExt} -> Customer Phone: ${customerPhone}`);

      // Add to pending poll queue for mobile device
      const callData = {
        extension: targetExt,
        staffId: String(staffId || targetExt),
        customerPhone,
        customerName: customerName || 'Customer',
        timestamp: Date.now()
      };

      pendingSimCalls.set(targetExt, callData);
      if (staffId && String(staffId) !== targetExt) {
        pendingSimCalls.set(String(staffId), callData);
      }

      if (io) {
        io.to(`staff_${targetExt}`).emit('sim_bridge:incoming_trigger', callData);
        io.emit(`sim_bridge:status_${targetExt}`, { status: 'DIALING', customerPhone, timestamp: Date.now() });
      }
      res.json({ success: true, message: `Call queued for extension ${targetExt}` });
    } catch (err) {
      console.error('Error triggering sim call:', err);
      res.status(500).json({ error: 'Failed to trigger call' });
    }
  });

  // Telecalling Logs List
  router.get('/telecalling/logs', async (req, res) => {
    try {
      const logs = await getCallLogs(1, 200);
      res.json({ success: true, logs });
    } catch (err) {
      console.error('Error fetching call logs:', err);
      res.status(500).json({ error: 'Failed to fetch call logs' });
    }
  });

  // Save new Call Log
  router.post('/telecalling/logs', async (req, res) => {
    try {
      const log = await createCallLog(1, req.body);
      if (io) {
        io.emit('telecalling:new_log', log);
      }
      res.json({ success: true, log });
    } catch (err) {
      console.error('Error saving call log:', err);
      res.status(500).json({ error: 'Failed to save call log' });
    }
  });

  // Upload Call Audio Recording (.mp3 / base64)
  router.post('/telecalling/upload-recording', async (req, res) => {
    try {
      const { audioBase64, customerPhone, customerName, staffId, staffName, durationSeconds, disposition, notes } = req.body;
      if (!audioBase64) {
        return res.status(400).json({ error: 'audioBase64 payload required' });
      }
      const filename = `call_rec_${staffId || 'staff'}_${Date.now()}.mp3`;
      const filePath = path.join(recordingsDir, filename);
      const cleanBase64 = audioBase64.replace(/^data:audio\/\w+;base64,/, '');
      fs.writeFileSync(filePath, Buffer.from(cleanBase64, 'base64'));

      const recordingUrl = `/media/recordings/${filename}`;
      const log = await createCallLog(1, {
        staffId: staffId || '1',
        staffName: staffName || 'Telecaller',
        customerName: customerName || 'Customer',
        customerPhone: customerPhone || 'Unknown',
        channel: 'SIM',
        type: 'OUTGOING',
        durationSeconds: durationSeconds || 0,
        recordingUrl,
        disposition: disposition || 'Interested',
        notes: notes || 'Auto-recorded via OmniFlow SIM Bridge'
      });

      if (io) {
        io.emit('telecalling:new_log', log);
      }
      res.json({ success: true, recordingUrl, log });
    } catch (err) {
      console.error('Error uploading call recording:', err);
      res.status(500).json({ error: 'Failed to upload call recording' });
    }
  });

  return router;
}
