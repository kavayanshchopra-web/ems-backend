/**
 * Autonomous System Audit Engine (AuditEngine)
 * Automatically captures and logs all record mutations, field updates, calling events,
 * WhatsApp activity, and security changes with Before vs After diffs.
 */

class SystemAuditEngine {
  constructor() {
    this.subscribers = new Set();
    this.buffer = [];
    this.isFlushing = false;
    this.currentUser = null;
    this.currentTenantId = '1';
  }

  setCurrentUser(user, tenantId = '1') {
    this.currentUser = user;
    if (tenantId) this.currentTenantId = tenantId;
  }

  subscribe(callback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  notify(event) {
    this.subscribers.forEach((cb) => {
      try {
        cb(event);
      } catch (err) {
        console.error('[AuditEngine] Subscriber error:', err);
      }
    });
  }

  /**
   * Universal Event Logger
   */
  async logEvent({
    tenantId,
    action = 'ACTION_PERFORMED',
    module = 'general',
    resourceName = '',
    details = '',
    oldValue = '',
    newValue = '',
    actor = null
  }) {
    const user = actor || this.currentUser || {};
    const tId = tenantId || this.currentTenantId || user.tenantId || '1';

    const logEntry = {
      tenantId: String(tId),
      userId: String(user.id || user.uid || 'system'),
      userName: user.name || user.displayName || user.email || 'System User',
      userEmail: user.email || '',
      userRole: user.role || 'staff',
      action: action.toUpperCase(),
      module: String(module || 'general').toLowerCase(),
      resourceName: String(resourceName || ''),
      details: typeof details === 'object' ? JSON.stringify(details) : String(details || ''),
      oldValue: typeof oldValue === 'object' ? JSON.stringify(oldValue) : String(oldValue || ''),
      newValue: typeof newValue === 'object' ? JSON.stringify(newValue) : String(newValue || ''),
      created_at: new Date().toISOString()
    };

    // Instant local notification to UI subscribers
    this.notify(logEntry);

    // Save to LocalStorage queue for offline safety
    try {
      const localQueue = JSON.parse(localStorage.getItem('omniflow_audit_queue') || '[]');
      localQueue.unshift(logEntry);
      if (localQueue.length > 500) localQueue.length = 500;
      localStorage.setItem('omniflow_audit_queue', JSON.stringify(localQueue));
    } catch (e) {}

    // Async flush to backend API
    this.sendToBackend(logEntry);
    return logEntry;
  }

  async sendToBackend(logEntry) {
    try {
      const res = await fetch('/api/audit-logs/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(logEntry)
      });
      return await res.json();
    } catch (err) {
      console.warn('[AuditEngine] Log backend push deferred:', err.message);
    }
  }

  // --- Specialized Helper Methods ---

  logRecordCreated(module, resourceName, recordData, actor = null) {
    return this.logEvent({
      action: 'RECORD_CREATED',
      module,
      resourceName,
      details: `Created new ${module} entry: ${resourceName}`,
      newValue: recordData,
      actor
    });
  }

  logRecordUpdated(module, resourceName, oldValue, newValue, actor = null) {
    return this.logEvent({
      action: 'RECORD_UPDATED',
      module,
      resourceName,
      details: `Updated ${module} entry: ${resourceName}`,
      oldValue,
      newValue,
      actor
    });
  }

  logRecordDeleted(module, resourceName, recordData, actor = null) {
    return this.logEvent({
      action: 'RECORD_DELETED',
      module,
      resourceName,
      details: `Deleted ${module} entry: ${resourceName}`,
      oldValue: recordData,
      actor
    });
  }

  logStageChanged(module, resourceName, oldStage, newStage, actor = null) {
    return this.logEvent({
      action: 'STAGE_CHANGED',
      module,
      resourceName,
      details: `Stage moved from "${oldStage}" to "${newStage}" for ${resourceName}`,
      oldValue: { stage: oldStage },
      newValue: { stage: newStage },
      actor
    });
  }

  logFieldChanged(module, resourceName, fieldName, oldValue, newValue, actor = null) {
    return this.logEvent({
      action: 'FIELD_CHANGED',
      module,
      resourceName,
      details: `Field "${fieldName}" updated from "${oldValue}" to "${newValue}" on ${resourceName}`,
      oldValue: { [fieldName]: oldValue },
      newValue: { [fieldName]: newValue },
      actor
    });
  }

  logCallPlaced(customerPhone, channel = 'VOXBAY', duration = 0, status = 'PLACED', actor = null) {
    return this.logEvent({
      action: 'CALL_PLACED',
      module: 'telecalling',
      resourceName: customerPhone,
      details: `${channel} call placed to ${customerPhone} (Status: ${status}, Duration: ${duration}s)`,
      newValue: { phone: customerPhone, channel, duration, status },
      actor
    });
  }

  logWhatsAppActivity(action, details, target = '', actor = null) {
    return this.logEvent({
      action: `WA_${action.toUpperCase()}`,
      module: 'whatsapp',
      resourceName: target || 'WhatsApp Session',
      details,
      actor
    });
  }

  logSecurityEvent(action, details, actor = null) {
    return this.logEvent({
      action: `SECURITY_${action.toUpperCase()}`,
      module: 'security',
      resourceName: 'Auth / Security',
      details,
      actor
    });
  }
}

export const AuditEngine = new SystemAuditEngine();
export default AuditEngine;