import crypto from 'crypto';

/**
 * Normalizes any phone number or WhatsApp JID to E.164 international format.
 * Examples:
 * - "919876543210@s.whatsapp.net" -> "+919876543210"
 * - "+91 98765-43210" -> "+919876543210"
 * - "09876543210" (India) -> "+919876543210"
 * - "9876543210" (10-digit India fallback) -> "+919876543210"
 * - "+1 (555) 234-5678" -> "+15552345678"
 * 
 * @param {string} rawPhone 
 * @param {string} defaultCountryCode Default: "91" (India)
 * @returns {string|null} Normalized E.164 phone string (e.g. "+919876543210") or null if invalid
 */
export function normalizePhoneToE164(rawPhone, defaultCountryCode = '91') {
  if (!rawPhone || typeof rawPhone !== 'string') return null;

  // 1. Strip WhatsApp JID suffixes
  let cleaned = rawPhone
    .replace(/@s\.whatsapp\.net/gi, '')
    .replace(/@g\.us/gi, '')
    .replace(/@lid/gi, '')
    .trim();

  // 2. Remove all formatting characters except leading '+'
  const hasLeadingPlus = cleaned.startsWith('+');
  const digitsOnly = cleaned.replace(/\D/g, '');

  if (!digitsOnly || digitsOnly.length < 7) {
    return null; // Invalid length for phone number
  }

  // 3. Handle standard formats
  if (hasLeadingPlus) {
    return `+${digitsOnly}`;
  }

  // If 10 digits and default is India (91), prefix with 91
  if (digitsOnly.length === 10 && defaultCountryCode === '91') {
    return `+91${digitsOnly}`;
  }

  // If 11 digits starting with 0 (e.g. 09876543210), replace leading 0 with country code
  if (digitsOnly.length === 11 && digitsOnly.startsWith('0') && defaultCountryCode === '91') {
    return `+91${digitsOnly.substring(1)}`;
  }

  // If already starts with country code (e.g. 919876543210 or 15552345678)
  if (digitsOnly.length >= 11) {
    return `+${digitsOnly}`;
  }

  return `+${defaultCountryCode}${digitsOnly}`;
}

/**
 * Converts a standard phone number or E.164 string to a WhatsApp JID for internal EMS use.
 * @param {string} phone 
 * @returns {string|null} (e.g. "919876543210@s.whatsapp.net")
 */
export function phoneToWhatsAppJid(phone) {
  if (!phone) return null;
  const digits = String(phone).replace(/\D/g, '');
  if (!digits || digits.length < 7) return null;
  return `${digits}@s.whatsapp.net`;
}

/**
 * Splits a full name string into firstName and lastName components.
 * @param {string} fullName 
 * @returns {{ firstName: string, lastName: string, name: string }}
 */
export function splitFullName(fullName) {
  const clean = (fullName || '').trim();
  if (!clean) {
    return { firstName: '', lastName: '', name: '' };
  }

  const parts = clean.split(/\s+/);
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: '', name: clean };
  }

  const firstName = parts[0];
  const lastName = parts.slice(1).join(' ');
  return { firstName, lastName, name: clean };
}

/**
 * Computes a deterministic MD5 hash of an object payload for synchronization loop suppression.
 * @param {Object} payload 
 * @returns {string} 32-character hex hash
 */
export function calculatePayloadHash(payload) {
  if (!payload || typeof payload !== 'object') {
    return crypto.createHash('md5').update(String(payload || '')).digest('hex');
  }

  // Sort keys deterministically
  const sortedKeys = Object.keys(payload).sort();
  const canonicalObj = {};
  const ignoredKeys = new Set([
    'updated_at', 'created_at', 'last_synced_at', 'unread_count',
    'eventId', 'traceId', 'messageId', 'timestamp', 'dateAdded', 'dateUpdated'
  ]);

  for (const k of sortedKeys) {
    if (!ignoredKeys.has(k)) {
      canonicalObj[k] = payload[k];
    }
  }

  const serialized = JSON.stringify(canonicalObj);
  return crypto.createHash('md5').update(serialized).digest('hex');
}
