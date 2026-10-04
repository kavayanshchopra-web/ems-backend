import pg from 'pg';
import crypto from 'crypto';
import paymentGatewayService from './PaymentGatewayService.js';

const PG_URL = process.env.DATABASE_URL || 'postgresql://postgres:%28sandbox%40113%29@db.mucgmzldgvtblmsurtgo.supabase.co:5432/postgres';

class UniversalWalletService {
  constructor() {
    this.pool = new pg.Pool({
      connectionString: PG_URL,
      ssl: { rejectUnauthorized: false }
    });
  }

  // 1. Fetch live wallet details for tenant
  async getWallet(tenantId = 1) {
    const client = await this.pool.connect();
    try {
      let res = await client.query('SELECT * FROM universal_wallets WHERE tenant_id = $1;', [tenantId]);
      if (res.rows.length === 0) {
        // Initialize default wallet with ₹0.00 balance and ₹1,000 threshold
        const init = await client.query(`
          INSERT INTO universal_wallets (tenant_id, balance, currency, min_threshold, status, created_at, updated_at)
          VALUES ($1, 0.0000, 'INR', 1000.0000, 'ACTIVE', NOW(), NOW())
          RETURNING *;
        `, [tenantId]);
        return init.rows[0];
      }
      const wallet = res.rows[0];
      wallet.balance = parseFloat(wallet.balance || 0);
      wallet.min_threshold = parseFloat(wallet.min_threshold || 1000);
      wallet.is_below_threshold = wallet.balance <= wallet.min_threshold;
      wallet.is_depleted = wallet.balance <= 0;
      return wallet;
    } finally {
      client.release();
    }
  }

  // 2. Resolve 3-Tier WhatsApp rates for tenant (taking overrides into account)
  async getRates(tenantId = 1) {
    const client = await this.pool.connect();
    try {
      const res = await client.query(`
        SELECT 
          g.service_key,
          g.display_name,
          g.category,
          g.unit_type,
          g.default_rate as global_rate,
          COALESCE(o.custom_rate, g.default_rate) as effective_rate,
          o.custom_rate IS NOT NULL as is_custom_override
        FROM global_service_rates g
        LEFT JOIN tenant_rate_overrides o 
          ON g.service_key = o.service_key AND o.tenant_id = $1
        WHERE g.is_active = TRUE
        ORDER BY g.service_key;
      `, [tenantId]);

      const rateMap = {};
      for (const row of res.rows) {
        rateMap[row.service_key] = {
          displayName: row.display_name,
          category: row.category,
          rate: parseFloat(row.effective_rate),
          isCustom: row.is_custom_override
        };
      }
      return rateMap;
    } finally {
      client.release();
    }
  }

  // 3. Pre-check if client has enough balance to send message (Strict Block Check)
  async checkCanSend(tenantId = 1, messageType = 'whatsapp_normal_chat', count = 1) {
    const wallet = await this.getWallet(tenantId);
    const rates = await this.getRates(tenantId);

    const rateConfig = rates[messageType] || { rate: 0.10 };
    const requiredAmount = rateConfig.rate * count;

    if (wallet.balance <= 0 || wallet.balance < requiredAmount) {
      return {
        allowed: false,
        reason: 'INSUFFICIENT_BALANCE',
        currentBalance: wallet.balance,
        requiredAmount,
        rate: rateConfig.rate,
        message: `🚫 Wallet Balance (₹${wallet.balance.toFixed(2)}) is insufficient. Message requires ₹${requiredAmount.toFixed(2)}. Kindly recharge.`
      };
    }

    return {
      allowed: true,
      currentBalance: wallet.balance,
      requiredAmount,
      rate: rateConfig.rate,
      balanceAfter: wallet.balance - requiredAmount,
      isBelowThreshold: (wallet.balance - requiredAmount) <= wallet.min_threshold
    };
  }

  // 4. Atomic Deduct for Outbound EMS Message
  async deductForMessage({
    tenantId = 1,
    messageId,
    messageType = 'whatsapp_normal_chat',
    count = 1,
    recipientPhone = '',
    triggerSource = 'EMS_WEB_CHAT',
    description = ''
  }) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Lock wallet row for update
      const walletRes = await client.query(`
        SELECT balance, min_threshold 
        FROM universal_wallets 
        WHERE tenant_id = $1 
        FOR UPDATE;
      `, [tenantId]);

      if (walletRes.rows.length === 0) {
        throw new Error(`Wallet for tenant ${tenantId} not found`);
      }

      const currentBalance = parseFloat(walletRes.rows[0].balance);
      const minThreshold = parseFloat(walletRes.rows[0].min_threshold);

      // Resolve effective rate
      const rateRes = await client.query(`
        SELECT COALESCE(o.custom_rate, g.default_rate) as effective_rate
        FROM global_service_rates g
        LEFT JOIN tenant_rate_overrides o 
          ON g.service_key = o.service_key AND o.tenant_id = $1
        WHERE g.service_key = $2;
      `, [tenantId, messageType]);

      const rate = rateRes.rows.length > 0 ? parseFloat(rateRes.rows[0].effective_rate) : 0.10;
      const totalDeduction = rate * count;

      if (currentBalance < totalDeduction) {
        await client.query('ROLLBACK');
        return {
          success: false,
          error: 'INSUFFICIENT_FUNDS',
          currentBalance,
          required: totalDeduction
        };
      }

      const newBalance = currentBalance - totalDeduction;
      const newStatus = newBalance <= 0 ? 'DEPLETED' : (newBalance <= minThreshold ? 'LOW_BALANCE' : 'ACTIVE');

      // Update wallet balance
      await client.query(`
        UPDATE universal_wallets 
        SET balance = $1, status = $2, updated_at = NOW() 
        WHERE tenant_id = $3;
      `, [newBalance, newStatus, tenantId]);

      // Record transaction
      const txnId = `TXN-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const desc = description || `Sent ${count} ${messageType.replace('whatsapp_', '').replace('_', ' ')} message to ${recipientPhone || 'contact'}`;

      await client.query(`
        INSERT INTO wallet_transactions (
          id, tenant_id, service_key, transaction_type, amount, 
          balance_before, balance_after, reference_id, description, 
          trigger_source, recipient_phone, units, rate_applied, created_at
        ) VALUES (
          $1, $2, $3, 'DEBIT', $4, 
          $5, $6, $7, $8, 
          $9, $10, $11, $12, NOW()
        );
      `, [
        txnId, tenantId, messageType, totalDeduction,
        currentBalance, newBalance, messageId || txnId, desc,
        triggerSource, recipientPhone, count, rate
      ]);

      await client.query('COMMIT');

      return {
        success: true,
        transactionId: txnId,
        rateApplied: rate,
        deducted: totalDeduction,
        balanceBefore: currentBalance,
        newBalance,
        status: newStatus,
        isBelowThreshold: newBalance <= minThreshold
      };
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Wallet deduction error:', err);
      throw err;
    } finally {
      client.release();
    }
  }

  // 5. Create Verified Recharge Order (Min ₹1,000)
  async createRechargeOrder({ tenantId = 1, amount = 1000 }) {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < 1000) {
      throw new Error('Minimum wallet recharge amount is ₹1,000.00');
    }

    // Call Payment Gateway to generate order
    const rzpOrder = await paymentGatewayService.createOrder({
      amount: numAmount,
      currency: 'INR',
      tenantId,
      receipt: `w_topup_${tenantId}_${Date.now()}`
    });

    const client = await this.pool.connect();
    try {
      await client.query(`
        INSERT INTO wallet_payment_orders (
          order_id, tenant_id, amount, currency, gateway, status, balance_credited, created_at
        ) VALUES (
          $1, $2, $3, 'INR', 'razorpay', 'CREATED', FALSE, NOW()
        ) ON CONFLICT (order_id) DO UPDATE SET amount = EXCLUDED.amount;
      `, [rzpOrder.id, tenantId, numAmount]);

      return {
        orderId: rzpOrder.id,
        amount: numAmount,
        currency: 'INR',
        keyId: rzpOrder.keyId || process.env.RAZORPAY_KEY_ID || 'rzp_test_sample',
        isMock: rzpOrder.isMock || false
      };
    } finally {
      client.release();
    }
  }

  // 6. Verify HMAC Signature and Credit Balance (ONLY on Payment Success)
  async verifyAndCreditRecharge({ tenantId = 1, orderId, paymentId, signature }) {
    const client = await this.pool.connect();
    try {
      // 1. Check existing order
      const orderRes = await client.query('SELECT * FROM wallet_payment_orders WHERE order_id = $1;', [orderId]);
      if (orderRes.rows.length === 0) {
        throw new Error('Invalid recharge order ID');
      }

      const order = orderRes.rows[0];
      if (order.balance_credited) {
        return {
          success: true,
          message: 'Order already verified and credited previously',
          amount: parseFloat(order.amount)
        };
      }

      // 2. Cryptographic HMAC SHA-256 Verification
      const verifyRes = await paymentGatewayService.verifyPaymentSignature({
        orderId,
        paymentId,
        signature,
        tenantId
      });

      if (!verifyRes.valid) {
        // Mark order failed
        await client.query(`
          UPDATE wallet_payment_orders 
          SET status = 'FAILED', signature = $1, payment_id = $2 
          WHERE order_id = $3;
        `, [signature || 'NONE', paymentId || 'NONE', orderId]);

        throw new Error(`Payment verification failed: ${verifyRes.error || 'Invalid signature'}`);
      }

      // 3. Begin Transaction to safely credit wallet
      await client.query('BEGIN');

      const walletRes = await client.query(`
        SELECT balance, min_threshold 
        FROM universal_wallets 
        WHERE tenant_id = $1 
        FOR UPDATE;
      `, [tenantId]);

      const currentBalance = walletRes.rows.length > 0 ? parseFloat(walletRes.rows[0].balance) : 0;
      const minThreshold = walletRes.rows.length > 0 ? parseFloat(walletRes.rows[0].min_threshold) : 1000;
      const creditAmount = parseFloat(order.amount);
      const newBalance = currentBalance + creditAmount;
      const newStatus = newBalance <= minThreshold ? 'LOW_BALANCE' : 'ACTIVE';

      // Update wallet
      await client.query(`
        UPDATE universal_wallets 
        SET balance = $1, status = $2, last_recharged_at = NOW(), updated_at = NOW() 
        WHERE tenant_id = $3;
      `, [newBalance, newStatus, tenantId]);

      // Update payment order
      await client.query(`
        UPDATE wallet_payment_orders 
        SET status = 'PAID', balance_credited = TRUE, payment_id = $1, signature = $2, paid_at = NOW() 
        WHERE order_id = $3;
      `, [paymentId, signature, orderId]);

      // Insert credit transaction into ledger
      const txnId = `TOPUP-${Date.now()}-${paymentId.slice(-6)}`;
      await client.query(`
        INSERT INTO wallet_transactions (
          id, tenant_id, service_key, transaction_type, amount, 
          balance_before, balance_after, reference_id, description, 
          trigger_source, units, created_at
        ) VALUES (
          $1, $2, 'gateway_recharge', 'CREDIT', $3, 
          $4, $5, $6, $7, 
          'GATEWAY_TOPUP', 1, NOW()
        );
      `, [
        txnId, tenantId, creditAmount, currentBalance, newBalance,
        paymentId, `Wallet Top-Up via Razorpay (Txn: ${paymentId})`
      ]);

      await client.query('COMMIT');

      return {
        success: true,
        creditedAmount: creditAmount,
        newBalance,
        paymentId,
        orderId,
        status: newStatus
      };
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Verify and credit error:', err);
      throw err;
    } finally {
      client.release();
    }
  }

  // 7. Get Tenant Transaction Ledger
  async getLedger(tenantId = 1, limit = 50, offset = 0) {
    const client = await this.pool.connect();
    try {
      const res = await client.query(`
        SELECT * 
        FROM wallet_transactions 
        WHERE tenant_id = $1 
        ORDER BY created_at DESC 
        LIMIT $2 OFFSET $3;
      `, [tenantId, limit, offset]);

      const countRes = await client.query('SELECT COUNT(*) FROM wallet_transactions WHERE tenant_id = $1;', [tenantId]);

      return {
        transactions: res.rows.map(r => ({
          ...r,
          amount: parseFloat(r.amount),
          balance_before: parseFloat(r.balance_before),
          balance_after: parseFloat(r.balance_after)
        })),
        totalCount: parseInt(countRes.rows[0].count, 10)
      };
    } finally {
      client.release();
    }
  }

  // 8. SuperAdmin Manual Adjustment / Complimentary Bonus
  async adminAdjustBalance({ tenantId, amount, reason = 'SuperAdmin Adjustment', adminUser = 'SuperAdmin' }) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const walletRes = await client.query('SELECT balance, min_threshold FROM universal_wallets WHERE tenant_id = $1 FOR UPDATE;', [tenantId]);
      const currentBalance = walletRes.rows.length > 0 ? parseFloat(walletRes.rows[0].balance) : 0;
      const minThreshold = walletRes.rows.length > 0 ? parseFloat(walletRes.rows[0].min_threshold) : 1000;
      const adjAmount = parseFloat(amount);
      const newBalance = currentBalance + adjAmount;
      const newStatus = newBalance <= 0 ? 'DEPLETED' : (newBalance <= minThreshold ? 'LOW_BALANCE' : 'ACTIVE');

      await client.query(`
        UPDATE universal_wallets 
        SET balance = $1, status = $2, updated_at = NOW() 
        WHERE tenant_id = $3;
      `, [newBalance, newStatus, tenantId]);

      const txnId = `ADJ-${Date.now()}`;
      await client.query(`
        INSERT INTO wallet_transactions (
          id, tenant_id, service_key, transaction_type, amount, 
          balance_before, balance_after, reference_id, description, 
          trigger_source, created_at
        ) VALUES (
          $1, $2, 'admin_adjustment', $3, $4, 
          $5, $6, $7, $8, 
          'SUPERADMIN_ADJUST', NOW()
        );
      `, [
        txnId, tenantId, adjAmount >= 0 ? 'BONUS' : 'DEBIT', Math.abs(adjAmount),
        currentBalance, newBalance, txnId, `${reason} (by ${adminUser})`
      ]);

      await client.query('COMMIT');
      return { success: true, newBalance, adjustedAmount: adjAmount };
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  // 9. SuperAdmin Cross-Tenant Telemetry
  async getSuperAdminOverview() {
    const client = await this.pool.connect();
    try {
      const wallets = await client.query(`
        SELECT 
          w.tenant_id,
          w.balance,
          w.min_threshold,
          w.status,
          w.last_recharged_at,
          COALESCE(t.company_name, 'Company #' || w.tenant_id) as company_name,
          COALESCE(SUM(CASE WHEN tx.transaction_type = 'DEBIT' THEN tx.amount ELSE 0 END), 0) as total_spent,
          COALESCE(SUM(CASE WHEN tx.transaction_type = 'CREDIT' THEN tx.amount ELSE 0 END), 0) as total_recharged,
          COALESCE(COUNT(CASE WHEN tx.transaction_type = 'DEBIT' AND tx.service_key LIKE 'whatsapp%' THEN 1 END), 0) as total_messages_sent
        FROM universal_wallets w
        LEFT JOIN tenants t ON t.id = w.tenant_id
        LEFT JOIN wallet_transactions tx ON tx.tenant_id = w.tenant_id
        GROUP BY w.tenant_id, w.balance, w.min_threshold, w.status, w.last_recharged_at, t.company_name
        ORDER BY w.tenant_id;
      `);

      const totalBalance = wallets.rows.reduce((sum, w) => sum + parseFloat(w.balance || 0), 0);
      const lowBalanceCount = wallets.rows.filter(w => parseFloat(w.balance) <= parseFloat(w.min_threshold)).length;

      const txStats = await client.query(`
        SELECT 
          service_key,
          transaction_type,
          COUNT(*) as tx_count,
          SUM(amount) as total_volume
        FROM wallet_transactions
        GROUP BY service_key, transaction_type;
      `);

      const rates = await client.query('SELECT * FROM global_service_rates ORDER BY service_key;');

      return {
        totalClientFloat: totalBalance,
        lowBalanceTenantsCount: lowBalanceCount,
        tenants: wallets.rows,
        transactionStats: txStats.rows,
        globalRates: rates.rows
      };
    } finally {
      client.release();
    }
  }
}

const universalWalletService = new UniversalWalletService();
export default universalWalletService;
