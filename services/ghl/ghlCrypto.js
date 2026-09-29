import crypto from 'crypto';

/**
 * GHL Token Cryptographic Security Service (AES-256-GCM)
 * Provides authenticated encryption and decryption for sensitive HighLevel OAuth tokens.
 * 
 * Storage Format: iv_hex:authTag_hex:cipher_hex
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit IV recommended for GCM
const AUTH_TAG_LENGTH = 16; // 128-bit authentication tag

function getEncryptionKey() {
  const envKey = process.env.GHL_ENCRYPTION_KEY;
  if (envKey && envKey.trim().length >= 32) {
    return crypto.createHash('sha256').update(envKey.trim()).digest();
  }
  // Fallback to SHA-256 hash of JWT_SECRET in dev/test if GHL_ENCRYPTION_KEY is not set
  const fallbackSecret = process.env.JWT_SECRET || 'omniflow_ghl_fallback_secret_key_2026';
  return crypto.createHash('sha256').update(fallbackSecret).digest();
}

/**
 * Encrypts a plaintext token string using AES-256-GCM.
 * @param {string} plaintext - The plaintext token to encrypt.
 * @returns {string} Encrypted cipher string formatted as "iv:authTag:ciphertext".
 */
export function encryptToken(plaintext) {
  if (!plaintext || typeof plaintext !== 'string') {
    throw new Error('[ghlCrypto] Plaintext must be a non-empty string');
  }

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH
  });

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypts a previously encrypted token string using AES-256-GCM.
 * @param {string} encryptedString - Format: "iv:authTag:ciphertext".
 * @returns {string} Decrypted plaintext token.
 */
export function decryptToken(encryptedString) {
  if (!encryptedString || typeof encryptedString !== 'string') {
    throw new Error('[ghlCrypto] Encrypted string must be provided');
  }

  const parts = encryptedString.split(':');
  if (parts.length !== 3) {
    throw new Error('[ghlCrypto] Invalid encrypted token format');
  }

  const [ivHex, authTagHex, cipherHex] = parts;
  const key = getEncryptionKey();
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH
  });
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(cipherHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Returns a masked representation of a token for safe UI display or audit logs.
 * Never exposes the actual secret token material.
 * @param {string} token 
 * @returns {string} e.g. "pit-89a***f3d"
 */
export function maskToken(token) {
  if (!token || typeof token !== 'string') return '***';
  if (token.length <= 8) return '********';
  const prefix = token.substring(0, 4);
  const suffix = token.substring(token.length - 4);
  return `${prefix}***${suffix}`;
}

export default {
  encryptToken,
  decryptToken,
  maskToken
};
