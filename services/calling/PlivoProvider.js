/**
 * PlivoProvider.js
 * Universal WebRTC & PSTN Calling Provider for Plivo (ESM)
 * Connects directly to Sandbox PostgreSQL 17 (mucgmzldgvtblmsurtgo) for real-time wallet ledger.
 */

import CallingProvider from './CallingProvider.js';
import plivo from 'plivo';
import jwt from 'jsonwebtoken';
import pg from 'pg';

const sandboxDbPool = new pg.Pool({
  connectionString: 'postgresql://postgres:%28sandbox%40113%29@db.mucgmzldgvtblmsurtgo.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

export default class PlivoProvider extends CallingProvider {
  constructor(options = {}) {
    super('plivo');
    this.authId = options.authId || process.env.PLIVO_AUTH_ID || 'SANDBOX_PLIVO_AUTH_ID';
    this.authToken = options.authToken || process.env.PLIVO_AUTH_TOKEN || 'SANDBOX_PLIVO_AUTH_TOKEN';
    this.defaultCallerId = options.callerId || process.env.PLIVO_CALLER_ID || '918031496345';
    
    // Initialize Plivo REST Client if credentials present
    if (this.authId && !this.authId.startsWith('SANDBOX_')) {
      try {
        this.client = new plivo.Client(this.authId, this.authToken);
      } catch (err) {
        console.warn('[PlivoProvider] Warning: Plivo client init notice:', err.message);
      }
    }
  }

  /**
   * 1. Generate Browser JWT Voice Access Token for Telecaller
   * Used by plivo-browser-sdk: plivoClient.client.loginWithAccessToken(token)
   */
  generateAccessToken({
    authId = this.authId,
    authToken = this.authToken,
    endpointUsername = 'agent_sandbox',
    tenantId = 1,
    validitySeconds = 86400
  }) {
    const payload = {
      iss: authId,
      sub: endpointUsername,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + validitySeconds,
      scope: 'voice',
      tenant_id: tenantId
    };

    return jwt.sign(payload, authToken);
  }

  /**
   * 2. Generate Voice XML for Outbound Browser WebRTC Dial
   */
  generateAnswerXml({
    destination,
    callerId = this.defaultCallerId,
    record = true,
    actionUrl = 'https://api.employeemanagementsystems.com/api/telephony/plivo/status'
  }) {
    const cleanDestination = String(destination).replace(/\D/g, '');
    const cleanCallerId = String(callerId).replace(/\D/g, '');

    let xml = '<Response>\n';
    if (record) {
      xml += `  <Record action="${actionUrl}" method="POST" recordSession="true" redirect="false" maxLength="3600" />\n`;
    }
    xml += `  <Dial callerId="${cleanCallerId}">\n`;
    xml += `    <Number>${cleanDestination}</Number>\n`;
    xml += '  </Dial>\n';
    xml += '</Response>';

    return xml;
  }

  /**
   * 3. Initiate Outbound Call via Plivo REST API (Server Leg)
   */
  async initiateCall({
    destination,
    fromNumber = this.defaultCallerId,
    tenantId = 1,
    answerUrl,
    hangupUrl
  }) {
    const cleanDestination = String(destination).replace(/\D/g, '');
    const cleanFrom = String(fromNumber).replace(/\D/g, '');

    if (!this.client) {
      // Sandbox fallback mode when live Plivo credentials are not yet configured
      return {
        success: true,
        isSandbox: true,
        callUuid: `plivo_sb_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        message: 'Sandbox call session initiated successfully.'
      };
    }

    try {
      const response = await this.client.calls.create(
        cleanFrom,
        cleanDestination,
        answerUrl || `https://api.employeemanagementsystems.com/api/telephony/plivo/answer?tenant_id=${tenantId}`,
        {
          answerMethod: 'POST',
          hangupUrl: hangupUrl || `https://api.employeemanagementsystems.com/api/telephony/plivo/status?tenant_id=${tenantId}`,
          hangupMethod: 'POST'
        }
      );

      return {
        success: true,
        callUuid: response.requestUuid || response.callUuid,
        raw: response
      };
    } catch (err) {
      console.error('[PlivoProvider] initiateCall error:', err);
      return {
        success: false,
        error: err.message
      };
    }
  }

  /**
   * 4. End / Hangup Active Call
   */
  async endCall({ callUuid }) {
    if (!callUuid || !this.client) {
      return { success: true, message: 'Sandbox call terminated.' };
    }

    try {
      const response = await this.client.calls.hangup(callUuid);
      return { success: true, raw: response };
    } catch (err) {
      console.error('[PlivoProvider] endCall error:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * 5. Process Webhook from Plivo (Status, Duration, Recording)
   */
  processWebhook(payload = {}) {
    const callUuid = payload.CallUUID || payload.CallUuid || payload.call_uuid;
    const duration = parseInt(payload.Duration || payload.CallDuration || payload.duration || 0, 10);
    const recordingUrl = payload.RecordUrl || payload.RecordingUrl || payload.recording_url || null;
    const status = (payload.CallStatus || payload.Status || 'completed').toUpperCase();
    const from = payload.From || payload.from || '';
    const to = payload.To || payload.to || '';
    const cost = parseFloat(payload.TotalCost || payload.BillRate || 0.0000);

    return {
      callUuid,
      durationSeconds: duration,
      recordingUrl,
      status,
      from,
      to,
      wholesaleCost: cost,
      raw: payload
    };
  }

  /**
   * 6. Real-Time Wallet Balance Deduction in Sandbox PostgreSQL 17
   */
  async deductWallet({
    tenantId = 1,
    durationSeconds = 0,
    ratePerMinute = 0.75,
    agentId = 'agent_1',
    agentName = 'Telecaller',
    callUuid = ''
  }) {
    if (durationSeconds <= 0) {
      return { success: true, deducted: 0, reason: 'Zero duration call' };
    }

    // Standard telecom rounding: 60/60 pulse (e.g. 15 sec = 1 min, 65 sec = 2 mins)
    const billableMinutes = Math.max(1, Math.ceil(durationSeconds / 60));
    const billedAmount = parseFloat((billableMinutes * ratePerMinute).toFixed(2));

    const client = await sandboxDbPool.connect();
    try {
      await client.query('BEGIN');

      // Fetch and lock wallet record
      const walletRes = await client.query(
        'SELECT balance, status FROM telephony_wallets WHERE tenant_id = $1 FOR UPDATE',
        [tenantId]
      );

      let currentBalance = 0;
      if (walletRes.rows.length === 0) {
        // Create wallet if missing with initial ₹1,000 balance
        const initRes = await client.query(
          `INSERT INTO telephony_wallets (tenant_id, balance, status)
           VALUES ($1, 1000.00, 'ACTIVE') RETURNING balance`,
          [tenantId]
        );
        currentBalance = parseFloat(initRes.rows[0].balance);
      } else {
        currentBalance = parseFloat(walletRes.rows[0].balance);
      }

      const newBalance = parseFloat((currentBalance - billedAmount).toFixed(2));

      // Update wallet balance
      await client.query(
        `UPDATE telephony_wallets 
         SET balance = $1, updated_at = NOW() 
         WHERE tenant_id = $2`,
        [newBalance, tenantId]
      );

      // Record transaction audit trail
      await client.query(
        `INSERT INTO telephony_wallet_transactions 
         (tenant_id, call_id, type, amount, balance_after, description, agent_id, agent_name, duration_seconds)
         VALUES ($1, $2, 'CALL_DEDUCTION', $3, $4, $5, $6, $7, $8)`,
        [
          tenantId,
          callUuid,
          billedAmount,
          newBalance,
          `Voice Call (${billableMinutes} min @ ₹${ratePerMinute}/min)`,
          String(agentId),
          agentName,
          durationSeconds
        ]
      );

      // Also update call_logs record with cost and billed_amount
      if (callUuid) {
        await client.query(
          `UPDATE call_logs 
           SET cost = $1, billed_amount = $2 
           WHERE id = $3 OR phone = $4`,
          [
            parseFloat((billableMinutes * 0.38).toFixed(4)), // wholesale Plivo rate
            billedAmount,
            callUuid,
            callUuid
          ]
        ).catch(() => {});
      }

      await client.query('COMMIT');
      console.log(`[PlivoProvider] Wallet deducted: ₹${billedAmount} for Tenant ${tenantId}. New balance: ₹${newBalance}`);

      return {
        success: true,
        billedAmount,
        billableMinutes,
        newBalance
      };
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('[PlivoProvider] deductWallet error:', err);
      return { success: false, error: err.message };
    } finally {
      client.release();
    }
  }

  /**
   * 7. Fetch Current Tenant Wallet Details
   */
  async getWallet(tenantId = 1) {
    const client = await sandboxDbPool.connect();
    try {
      const res = await client.query(
        'SELECT * FROM telephony_wallets WHERE tenant_id = $1',
        [tenantId]
      );
      if (res.rows.length === 0) {
        return {
          tenant_id: tenantId,
          balance: 1000.00,
          currency: 'INR',
          auto_recharge_enabled: false,
          status: 'ACTIVE'
        };
      }
      return res.rows[0];
    } finally {
      client.release();
    }
  }

  /**
   * 8. Fetch Telephony & Inbound Routing Settings for Tenant
   */
  async getTenantTelephonySettings(tenantId = 1) {
    const client = await sandboxDbPool.connect();
    try {
      const res = await client.query(
        'SELECT * FROM telephony_settings WHERE tenant_id = $1',
        [tenantId]
      );
      if (res.rows.length === 0) {
        return {
          tenant_id: tenantId,
          caller_id: this.defaultCallerId,
          inbound_routing_strategy: 'sticky_agent',
          ring_timeout: 25,
          max_concurrency: 50,
          fallback_greeting: 'Thank you for calling. All our executives are currently busy. We will call you back shortly.'
        };
      }
      return res.rows[0];
    } finally {
      client.release();
    }
  }

  /**
   * 9. Update Inbound Routing & Concurrency Settings
   */
  async updateInboundSettings({
    tenantId = 1,
    inboundRoutingStrategy = 'sticky_agent',
    ringTimeout = 25,
    fallbackGreeting = 'Thank you for calling. All our executives are currently busy. We will call you back shortly.',
    maxConcurrency = 50
  }) {
    const client = await sandboxDbPool.connect();
    try {
      const res = await client.query(
        `UPDATE telephony_settings 
         SET 
           inbound_routing_strategy = $1,
           ring_timeout = $2,
           fallback_greeting = $3,
           max_concurrency = $4,
           updated_at = NOW()
         WHERE tenant_id = $5
         RETURNING *`,
        [inboundRoutingStrategy, ringTimeout, fallbackGreeting, maxConcurrency, tenantId]
      );
      return res.rows[0] || null;
    } finally {
      client.release();
    }
  }

  /**
   * 10. Agent Telephony Presence (Fetch & Update)
   */
  async getAgentPresence(tenantId = 1) {
    const client = await sandboxDbPool.connect();
    try {
      const res = await client.query(
        `SELECT * FROM agent_telephony_presence 
         WHERE tenant_id = $1 
         ORDER BY is_online DESC, is_busy ASC, last_seen DESC`,
        [tenantId]
      );
      return res.rows;
    } finally {
      client.release();
    }
  }

  async updateAgentPresence({
    tenantId = 1,
    agentId,
    agentName = 'Agent',
    sipEndpoint = null,
    isOnline = true,
    isBusy = false
  }) {
    const client = await sandboxDbPool.connect();
    try {
      const endpoint = sipEndpoint || `sip:agent_${agentId}@phone.plivo.com`;
      const res = await client.query(
        `INSERT INTO agent_telephony_presence (tenant_id, agent_id, agent_name, sip_endpoint, is_online, is_busy, last_seen)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())
         ON CONFLICT (tenant_id, agent_id) DO UPDATE 
         SET 
           agent_name = COALESCE(EXCLUDED.agent_name, agent_telephony_presence.agent_name),
           sip_endpoint = COALESCE(EXCLUDED.sip_endpoint, agent_telephony_presence.sip_endpoint),
           is_online = EXCLUDED.is_online,
           is_busy = EXCLUDED.is_busy,
           last_seen = NOW()
         RETURNING *`,
        [tenantId, String(agentId), agentName, endpoint, isOnline, isBusy]
      );
      return res.rows[0];
    } finally {
      client.release();
    }
  }

  /**
   * 11. Generate Inbound Call XML with Dynamic Routing
   * Supports: Sticky Agent -> Round Robin -> Ring All -> Fallback Greeting
   */
  async generateInboundXml({
    from,
    to,
    tenantId = 1,
    actionUrl,
    fallbackUrl
  }) {
    const settings = await this.getTenantTelephonySettings(tenantId);
    const strategy = settings.inbound_routing_strategy || 'sticky_agent';
    const timeout = settings.ring_timeout || 25;
    const cleanFrom = String(from || '').replace(/\D/g, '');

    const client = await sandboxDbPool.connect();
    let targetAgents = [];

    try {
      // 1. Fetch available online agents for this tenant
      const activeAgentsRes = await client.query(
        `SELECT * FROM agent_telephony_presence 
         WHERE tenant_id = $1 AND is_online = true AND is_busy = false
         ORDER BY last_call_at ASC NULLS FIRST`,
        [tenantId]
      );
      const activeAgents = activeAgentsRes.rows;

      if (strategy === 'sticky_agent' && cleanFrom) {
        // Find most recent agent who spoke to this customer
        const stickyRes = await client.query(
          `SELECT agent_id, agent_name FROM call_logs 
           WHERE phone LIKE $1 OR phone LIKE $2
           ORDER BY created_at DESC LIMIT 1`,
          [`%${cleanFrom.slice(-10)}`, cleanFrom]
        );

        if (stickyRes.rows.length > 0) {
          const stickyId = stickyRes.rows[0].agent_id;
          const matchedAgent = activeAgents.find(a => String(a.agent_id) === String(stickyId));
          if (matchedAgent) {
            targetAgents = [matchedAgent];
            console.log(`[Plivo Inbound] Sticky Agent matched: ${matchedAgent.agent_name} (${matchedAgent.agent_id})`);
          }
        }
      }

      // If no sticky agent or strategy is round_robin: pick least recently used agent
      if (targetAgents.length === 0 && strategy === 'round_robin' && activeAgents.length > 0) {
        targetAgents = [activeAgents[0]];
      }

      // If strategy is ring_all (or fallback if sticky agent was offline): ring all available agents
      if (targetAgents.length === 0 && activeAgents.length > 0) {
        targetAgents = activeAgents;
      }

      // If NO agents are online/available: return fallback greeting immediately
      if (targetAgents.length === 0) {
        const greeting = settings.fallback_greeting || 'Thank you for calling. All our executives are currently busy. We will call you back shortly.';
        let xml = '<Response>\n';
        xml += `  <Speak>${greeting}</Speak>\n`;
        xml += '</Response>';
        return { xml, targetAgents: [], strategy: 'fallback_no_agents' };
      }

      // Build Plivo Inbound Dial XML
      let xml = '<Response>\n';
      if (actionUrl) {
        xml += `  <Record action="${actionUrl}" method="POST" recordSession="true" redirect="false" maxLength="3600" />\n`;
      }
      xml += `  <Dial timeout="${timeout}" action="${fallbackUrl}">\n`;
      for (const agent of targetAgents) {
        const endpoint = agent.sip_endpoint || `sip:agent_${agent.agent_id}@phone.plivo.com`;
        xml += `    <User>${endpoint}</User>\n`;
      }
      xml += '  </Dial>\n';
      xml += '</Response>';

      return {
        xml,
        targetAgents,
        strategy
      };
    } finally {
      client.release();
    }
  }

  /**
   * 12. Generate Fallback Greeting XML & Record Missed Call
   */
  async handleInboundFallback({
    from,
    to,
    tenantId = 1,
    callUuid = ''
  }) {
    const settings = await this.getTenantTelephonySettings(tenantId);
    const greeting = settings.fallback_greeting || 'Thank you for calling. All our executives are currently busy. We will call you back shortly.';

    // Insert missed call log in Sandbox PostgreSQL
    const client = await sandboxDbPool.connect();
    try {
      await client.query(
        `INSERT INTO call_logs 
         (id, tenant_id, phone, customer_phone, customer_name, agent_id, agent_name, call_type, type, status, duration, duration_seconds, created_at)
         VALUES ($1, $2, $3, $3, 'Inbound Caller', 'inbound_queue', 'Inbound IVR / Queue', 'INBOUND', 'inbound', 'MISSED', '0s', 0, NOW())
         ON CONFLICT (id) DO UPDATE SET status = 'MISSED'`,
        [callUuid || `missed_${Date.now()}`, tenantId, from]
      ).catch(e => console.warn('[PlivoProvider] Missed call log insert note:', e.message));
    } finally {
      client.release();
    }

    let xml = '<Response>\n';
    xml += `  <Speak>${greeting}</Speak>\n`;
    xml += '</Response>';
    return xml;
  }

  /**
   * Helper: Parse Date Period Filter
   */
  _buildPeriodClause(period = 'this_month', prefix = '') {
    const col = prefix ? `${prefix}.created_at` : 'created_at';
    switch (String(period).toLowerCase()) {
      case 'today':
        return `${col} >= CURRENT_DATE`;
      case 'this_week':
        return `${col} >= DATE_TRUNC('week', CURRENT_DATE)`;
      case 'this_month':
        return `${col} >= DATE_TRUNC('month', CURRENT_DATE)`;
      case 'all':
      default:
        return "1=1";
    }
  }

  /**
   * 13. Dynamic Telephony Summary Report (Tenant Level)
   */
  async getTelephonySummaryReport({ tenantId = 1, period = 'this_month' }) {
    const client = await sandboxDbPool.connect();
    try {
      const dateClause = this._buildPeriodClause(period);
      const query = `
        SELECT 
          COUNT(*)::int as total_calls,
          COUNT(*) FILTER (WHERE duration_seconds > 0 OR status IN ('ANSWERED', 'COMPLETED'))::int as connected_calls,
          COUNT(*) FILTER (WHERE status = 'MISSED' OR duration_seconds = 0)::int as missed_calls,
          COALESCE(SUM(duration_seconds), 0)::int as total_duration_seconds,
          COALESCE(SUM(CEIL(duration_seconds / 60.0)), 0)::int as total_minutes,
          COALESCE(SUM(billed_amount), 0.00)::numeric(10,2) as total_billed_amount,
          COALESCE(SUM(cost), 0.0000)::numeric(10,4) as total_wholesale_cost
        FROM call_logs
        WHERE ($1::int IS NULL OR tenant_id = $1) AND ${dateClause}
      `;
      const res = await client.query(query, [tenantId ? parseInt(tenantId, 10) : null]);
      const row = res.rows[0] || {};

      const totalBilled = parseFloat(row.total_billed_amount || 0);
      const totalCost = parseFloat(row.total_wholesale_cost || 0);
      const grossProfit = parseFloat((totalBilled - totalCost).toFixed(2));
      const marginPercent = totalBilled > 0 ? parseFloat(((grossProfit / totalBilled) * 100).toFixed(1)) : 0.0;

      return {
        tenantId,
        period,
        totalCalls: row.total_calls || 0,
        connectedCalls: row.connected_calls || 0,
        missedCalls: row.missed_calls || 0,
        connectedRate: row.total_calls > 0 ? parseFloat(((row.connected_calls / row.total_calls) * 100).toFixed(1)) : 0.0,
        totalDurationSeconds: row.total_duration_seconds || 0,
        totalMinutes: row.total_minutes || 0,
        totalBilledAmount: totalBilled,
        totalWholesaleCost: totalCost,
        grossProfit,
        marginPercent
      };
    } finally {
      client.release();
    }
  }

  /**
   * 14. Dynamic Agent-Wise Performance Breakdown
   */
  async getAgentPerformanceReport({ tenantId = 1, period = 'this_month' }) {
    const client = await sandboxDbPool.connect();
    try {
      const dateClause = this._buildPeriodClause(period);
      const query = `
        SELECT 
          COALESCE(agent_id, 'unassigned') as agent_id,
          COALESCE(agent_name, 'Telecaller') as agent_name,
          COUNT(*)::int as total_calls,
          COUNT(*) FILTER (WHERE duration_seconds > 0 OR status IN ('ANSWERED', 'COMPLETED'))::int as connected_calls,
          COALESCE(SUM(duration_seconds), 0)::int as total_duration_seconds,
          COALESCE(SUM(CEIL(duration_seconds / 60.0)), 0)::int as total_minutes,
          COALESCE(ROUND(AVG(duration_seconds) FILTER (WHERE duration_seconds > 0), 1), 0.0)::float as avg_duration_seconds,
          COALESCE(SUM(billed_amount), 0.00)::numeric(10,2) as total_billed_amount
        FROM call_logs
        WHERE ($1::int IS NULL OR tenant_id = $1) AND ${dateClause} AND agent_name IS NOT NULL
        GROUP BY agent_id, agent_name
        ORDER BY total_minutes DESC, total_calls DESC
      `;
      const res = await client.query(query, [tenantId ? parseInt(tenantId, 10) : null]);
      return res.rows.map(r => ({
        agentId: r.agent_id,
        agentName: r.agent_name,
        totalCalls: r.total_calls,
        connectedCalls: r.connected_calls,
        connectedRate: r.total_calls > 0 ? parseFloat(((r.connected_calls / r.total_calls) * 100).toFixed(1)) : 0,
        totalDurationSeconds: r.total_duration_seconds,
        totalMinutes: r.total_minutes,
        avgDurationSeconds: r.avg_duration_seconds,
        totalBilledAmount: parseFloat(r.total_billed_amount)
      }));
    } finally {
      client.release();
    }
  }

  /**
   * 15. SuperAdmin Multi-Company Financial Ledger & Telephony Profit Analysis
   */
  async getSuperAdminFinancialReport({ period = 'this_month' }) {
    const client = await sandboxDbPool.connect();
    try {
      const dateClause = this._buildPeriodClause(period, 'c');
      const query = `
        SELECT 
          c.tenant_id,
          COALESCE(w.balance, 1000.00)::numeric(10,2) as wallet_balance,
          COALESCE(w.status, 'ACTIVE') as wallet_status,
          COUNT(c.id)::int as total_calls,
          COALESCE(SUM(c.duration_seconds), 0)::int as total_duration_seconds,
          COALESCE(SUM(CEIL(c.duration_seconds / 60.0)), 0)::int as total_minutes,
          COALESCE(SUM(c.billed_amount), 0.00)::numeric(10,2) as total_revenue,
          COALESCE(SUM(c.cost), 0.0000)::numeric(10,4) as total_wholesale_cost,
          (COALESCE(SUM(c.billed_amount), 0.00) - COALESCE(SUM(c.cost), 0.0000))::numeric(10,2) as gross_profit
        FROM call_logs c
        LEFT JOIN telephony_wallets w ON w.tenant_id = c.tenant_id
        WHERE ${dateClause}
        GROUP BY c.tenant_id, w.balance, w.status
        ORDER BY total_revenue DESC
      `;
      const res = await client.query(query);

      let grandTotalRevenue = 0;
      let grandTotalCost = 0;
      let grandTotalMinutes = 0;
      let grandTotalCalls = 0;

      const tenantBreakdown = res.rows.map(r => {
        const rev = parseFloat(r.total_revenue || 0);
        const cost = parseFloat(r.total_wholesale_cost || 0);
        const profit = parseFloat(r.gross_profit || 0);

        grandTotalRevenue += rev;
        grandTotalCost += cost;
        grandTotalMinutes += (r.total_minutes || 0);
        grandTotalCalls += (r.total_calls || 0);

        return {
          tenantId: r.tenant_id,
          companyName: `Company #${r.tenant_id}`,
          walletBalance: parseFloat(r.wallet_balance || 0),
          walletStatus: r.wallet_status,
          totalCalls: r.total_calls,
          totalMinutes: r.total_minutes,
          totalRevenue: rev,
          totalWholesaleCost: cost,
          grossProfit: profit,
          marginPercent: rev > 0 ? parseFloat(((profit / rev) * 100).toFixed(1)) : 0.0
        };
      });

      const netProfit = parseFloat((grandTotalRevenue - grandTotalCost).toFixed(2));
      const overallMargin = grandTotalRevenue > 0 ? parseFloat(((netProfit / grandTotalRevenue) * 100).toFixed(1)) : 0.0;

      return {
        period,
        grandTotals: {
          totalCalls: grandTotalCalls,
          totalMinutes: grandTotalMinutes,
          totalRevenue: parseFloat(grandTotalRevenue.toFixed(2)),
          totalWholesaleCost: parseFloat(grandTotalCost.toFixed(4)),
          netProfit,
          overallMargin
        },
        tenants: tenantBreakdown
      };
    } finally {
      client.release();
    }
  }
}

