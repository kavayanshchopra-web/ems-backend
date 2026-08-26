import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const VOXBAY_EXE = 'C:\\Program Files (x86)\\Voxbay Phone\\VoxbayPhone.exe';
const FOCUS_PS1 = path.join(__dirname, 'focus.ps1');
const HANGUP_PS1 = path.join(__dirname, 'hangup.ps1');

/**
 * Focus desktop softphone application on Windows
 */
export function focusSoftphone() {
  if (process.platform !== 'win32') return;

  if (fs.existsSync(FOCUS_PS1)) {
    exec(`powershell -NoProfile -ExecutionPolicy Bypass -File "${FOCUS_PS1}"`, (err) => {
      if (err) console.warn('[DesktopBridge] Focus warning:', err.message);
    });
  }
}

/**
 * Launch Voxbay Phone with dialed number (RS Dialer v1.1 Master Implementation)
 */
export function dialNumber(phoneNumber) {
  const cleanNumber = String(phoneNumber).replace(/\D/g, '');
  if (!fs.existsSync(VOXBAY_EXE)) return false;

  console.log(`[DesktopBridge] Dialing ${cleanNumber} via Voxbay Phone (${VOXBAY_EXE})...`);
  focusSoftphone();
  exec(`"${VOXBAY_EXE}" ${cleanNumber}`, (err) => {
    if (err) console.warn('[DesktopBridge] Dial exec note:', err.message);
  });
  return true;
}

/**
 * Hangup / Terminate call on Voxbay Phone
 */
export function hangupCall() {
  if (!fs.existsSync(VOXBAY_EXE)) return false;

  console.log('[DesktopBridge] Executing Hangup across all softphone channels...');

  // Method 1: Command line switches
  exec(`"${VOXBAY_EXE}" -hangup`, () => {});
  exec(`"${VOXBAY_EXE}" /hangup`, () => {});
  exec(`"${VOXBAY_EXE}" -hangupall`, () => {});
  exec(`"${VOXBAY_EXE}" /hangupall`, () => {});

  // Method 2: Execute hangup.ps1
  if (fs.existsSync(HANGUP_PS1)) {
    exec(`powershell -NoProfile -ExecutionPolicy Bypass -File "${HANGUP_PS1}"`, (err) => {
      if (err) console.warn('[DesktopBridge] PS Hangup note:', err.message);
    });
  }

  return true;
}

export default {
  focusSoftphone,
  dialNumber,
  hangupCall
};