/**
 * UNIFIED PHONE NORMALIZATION & IMMUTABLE MATCHING ENGINE
 * Single Source of Truth for WhatsApp, Conversations, CRM Leads, GHL, and Telecalling.
 */

/**
 * Extracts the standardized 10-digit phone number.
 * Strips all non-digits, country codes (+91, 91, 0), and whitespace.
 * @param {string|number} rawPhone 
 * @returns {string} 10-digit string or empty string if invalid
 */
export function normalizePhone10(rawPhone) {
  if (!rawPhone) return '';
  const digits = String(rawPhone)
    .replace(/@s\.whatsapp\.net|@c\.us|@g\.us|@broadcast|@lid/g, '')
    .replace(/\D/g, '');
  
  if (digits.length >= 10) {
    return digits.slice(-10);
  }
  return digits.length >= 7 ? digits : '';
}

/**
 * Converts any phone representation into standardized Indian E.164 (+91XXXXXXXXXX)
 * @param {string|number} rawPhone 
 * @returns {string} E.164 formatted string
 */
export function toE164Phone(rawPhone) {
  const norm10 = normalizePhone10(rawPhone);
  if (!norm10) return '';
  if (norm10.length === 10) {
    return `+91${norm10}`;
  }
  const cleanDigits = String(rawPhone).replace(/\D/g, '');
  return cleanDigits ? `+${cleanDigits}` : '';
}

/**
 * Converts any phone representation into standardized WhatsApp JID (91XXXXXXXXXX@s.whatsapp.net)
 * @param {string|number} rawPhone 
 * @returns {string} WhatsApp JID
 */
export function toWhatsAppJid(rawPhone) {
  const norm10 = normalizePhone10(rawPhone);
  if (!norm10) return '';
  if (norm10.length === 10) {
    return `91${norm10}@s.whatsapp.net`;
  }
  const cleanDigits = String(rawPhone).replace(/\D/g, '');
  return `${cleanDigits}@s.whatsapp.net`;
}

/**
 * Formats a phone number for user-friendly UI display: "+91 96463 78478"
 * @param {string|number} rawPhone 
 * @returns {string} Display string
 */
export function formatPhoneDisplay(rawPhone) {
  const norm10 = normalizePhone10(rawPhone);
  if (!norm10 || norm10.length < 10) {
    const digits = String(rawPhone || '').replace(/\D/g, '');
    return digits ? (digits.length > 6 ? `+${digits}` : digits) : '—';
  }
  return `+91 ${norm10.slice(0, 5)} ${norm10.slice(5)}`;
}

/**
 * Deterministically checks if two phone representations refer to the exact same person.
 * @param {string|number} phoneA 
 * @param {string|number} phoneB 
 * @returns {boolean}
 */
export function isSamePhone(phoneA, phoneB) {
  if (!phoneA || !phoneB) return false;
  const normA = normalizePhone10(phoneA);
  const normB = normalizePhone10(phoneB);
  if (normA && normB && normA === normB) return true;

  const rawA = String(phoneA).replace(/@s\.whatsapp\.net|@c\.us/g, '').replace(/\D/g, '');
  const rawB = String(phoneB).replace(/@s\.whatsapp\.net|@c\.us/g, '').replace(/\D/g, '');
  return Boolean(rawA && rawB && rawA === rawB);
}

export default {
  normalizePhone10,
  toE164Phone,
  toWhatsAppJid,
  formatPhoneDisplay,
  isSamePhone
};
