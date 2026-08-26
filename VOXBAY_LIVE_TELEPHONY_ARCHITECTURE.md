# 📞 VOXBAY CALLING SYSTEM — A-TO-Z MASTER SETUP & ARCHITECTURE GUIDE

> **Production Setup Document**: OmniFlow EMS / WhatsApp CRM Telecalling Integration  
> **Date**: August 2026  
> **Status**: Verified & Working in Production (Live & Local)  
> **Live Web App**: [https://app.employeemanagementsystems.com](https://app.employeemanagementsystems.com)  
> **Live API Backend**: [https://api.employeemanagementsystems.com](https://api.employeemanagementsystems.com)  

---

## 1. 🏗️ ARCHITECTURAL OVERVIEW

```
┌────────────────────────────────────────────────────────────────────────────────┐
│                           1. CLIENT FRONTEND (Chrome)                          │
│               Domain: https://app.employeemanagementsystems.com                │
│             React + Vite UI | Web Dialer Pad | Live HUD & Timer                │
└───────────────────────┬────────────────────────────────┬───────────────────────┘
                        │                                │
                        │ A. Call Commands (Local)       │ B. Sync & Call Logs (Cloud)
                        ▼                                ▼
┌───────────────────────────────────────┐    ┌───────────────────────────────────┐
│     2. LOCAL DESKTOP BRIDGE DAEMON    │    │      3. UBUNTU VPS CLOUD API      │
│         http://127.0.0.1:9876         │    │ https://api.employeemanagementsystems.com │
│ (ems-dialer-bridge.js on Windows PC)  │    │  (Node.js + PM2 at /var/www/...)  │
└───────────────────┬───────────────────┘    └─────────────────┬─────────────────┘
                    │                                          │
                    │ Native Windows Command                   │ (Only in Mobile Mode)
                    ▼                                          ▼
┌───────────────────────────────────────┐    ┌───────────────────────────────────┐
│        4. VOXBAY PHONE (MicroSIP)     │    │       5. VOXBAY CLOUD TELEPHONY   │
│   Running Minimized in System Tray    │    │           x.voxbay.com            │
│       Extension: 2MaqwezO             │    │    Virtual DID: +91 8031496345    │
└───────────────────┬───────────────────┘    └─────────────────┬─────────────────┘
                    │                                          │
                    └───────────────────┬──────────────────────┘
                                        ▼
                        ┌───────────────────────────────┐
                        │    6. TELECOM CARRIER / PSTN  │
                        │    Customer: +91 8566883642   │
                        └───────────────────────────────┘
```

---

## 2. 🔌 CALLING MODES EXPLAINED

### Mode A: 🎧 Softphone Mode (Laptop VoIP)
* **How it works**:
  1. Agent clicks **"Call Now"** on the Web Dialer.
  2. Web Dialer sends `POST http://127.0.0.1:9876/dial` with `{ number }` to the local silent bridge.
  3. The local bridge triggers `VoxbayPhone.exe <number>` silently in the background.
  4. Audio is handled directly through your laptop's mic/speaker without any desktop window popup.
  5. The call is simultaneously logged to the cloud database with status `RINGING` -> `CONNECTED`.
* **How it disconnects**:
  1. Agent clicks **"End Call"** (Red Button) or **`(X)` Close**.
  2. Web Dialer sends `POST http://127.0.0.1:9876/hangup`.
  3. Local bridge sends native `SIP BYE` command switches (`-hangup`, `/hangupall`, `{ESC}`) to terminate the carrier call instantly.
  4. Duration and recording are synced to the Cloud CRM directory.

### Mode B: 📱 Mobile SIM Mode (Click-to-Call)
* **How it works**:
  1. Agent selects **"Mobile (6283513686)"** tab on top of Web Dialer.
  2. Agent clicks **"Call Now"**.
  3. Cloud API triggers Voxbay API: `https://x.voxbay.com/api/click_to_call?id_dept=0&uid=UID&upin=UPIN&user_no=2MaqwezO&destination=CUSTOMER_NUMBER&callerid=DID&source=AGENT_MOBILE&`.
  4. Voxbay Cloud dials Agent's Mobile Phone first.
  5. Once Agent answers, Voxbay dials Customer and bridges the audio.
  6. **Zero desktop software required** on the PC.

---

## 3. 📁 KEY PROJECT FILES & CONFIGURATIONS

| File Path | Description | Key Settings / Code |
| :--- | :--- | :--- |
| `D:\voxbay calling new\ems-dialer-bridge.js` | **Local Desktop Bridge** running on port `9876` | Handles `/dial` and `/hangup` silently with CORS enabled |
| `D:\AG Projects\whatsapp-crm\frontend\src\components\telecalling\VoxbayCloudDialerModal.jsx` | **Web Dialer Modal** in React | Pure cloud + local bridge integration without `tel:` popups |
| `D:\AG Projects\whatsapp-crm\backend\services\calling\CallingService.js` | **Telephony Dispatcher** on VPS | Prevents duplicate PBX ringing when softphone mode is active |
| `D:\AG Projects\whatsapp-crm\backend\services\calling\VoxbayProvider.js` | **Voxbay API Wrapper** | Click-to-call URL builder and Webhook parser |
| `%APPDATA%\Voxbay Phone\VoxbayPhone.ini` | **Voxbay Phone Desktop Config** | `bringToFrontOnIncoming=0`, `autoAnswer=all`, `minimized=1` |

---

## 4. ⚙️ VOXBAY PHONE (MicroSIP) INI CONFIGURATION

File Location: `C:\Users\Lenovo\AppData\Roaming\Voxbay Phone\VoxbayPhone.ini`

```ini
[Settings]
bringToFrontOnIncoming=0
autoAnswer=all
AA=1
minimized=1
hidden=0
enableLocalDTMF=1
denyIncoming=0

[Account1]
label=Voxbay
server=x.voxbay.com
domain=x.voxbay.com
username=2MaqwezO
authID=2MaqwezO
```

> **Why these settings matter**:
> * `bringToFrontOnIncoming=0`: Prevents Voxbay Phone from opening in front of your browser.
> * `autoAnswer=all` & `AA=1`: Automatically picks up SIP audio without manual clicking.
> * `minimized=1`: Starts and stays silently in the Windows taskbar tray.

---

## 5. 🚀 HOW TO START & RUN THE SERVICES

### A. Start Local Background Bridge (Laptop)
Open PowerShell or Command Prompt:
```powershell
node "D:\voxbay calling new\ems-dialer-bridge.js"
```
*Health Check*: Open [http://127.0.0.1:9876/status](http://127.0.0.1:9876/status) -> should return `{"status":"ready","softphoneInstalled":true}`.

### B. Update & Restart Cloud VPS Backend (Ubuntu VPS)
```bash
ssh root@api.employeemanagementsystems.com
cd /var/www/whatsapp-crm
git pull origin main
pm2 restart all
```

### C. Build & Deploy Frontend to Vercel Production
```powershell
cd "D:\AG Projects\whatsapp-crm\frontend"
npm run build
npx vercel --prod --yes --force
```

---

## 6. 🛠️ TROUBLESHOOTING & EMERGENCY RUNBOOK

### Issue 1: Call is not connecting when clicking "Call Now"
* **Check 1**: Is `ems-dialer-bridge.js` running on your laptop? Run `curl http://127.0.0.1:9876/status`. If it fails, start it with `node "D:\voxbay calling new\ems-dialer-bridge.js"`.
* **Check 2**: Is `VoxbayPhone.exe` running in the system tray? Look at the taskbar icon (must show green dot). If not, start `C:\Program Files (x86)\Voxbay Phone\VoxbayPhone.exe`.

### Issue 2: Windows shows "Select an app to open this 'tel' link"
* **Fix**: Ensure that `VoxbayCloudDialerModal.jsx` does not have any `tel:` or `window.location.href = 'tel:'` strings. In modern architecture, the dialer communicates directly via `http://127.0.0.1:9876/dial` so browser popups are 100% bypassed.

### Issue 3: Call does not cut when clicking "End Call"
* **Fix**: Run the instant hangup test in terminal:
  ```powershell
  curl.exe -X POST http://127.0.0.1:9876/hangup
  ```
  If this cuts the call, check if browser hard refresh (`Ctrl + Shift + R`) was done on `https://app.employeemanagementsystems.com`.

### Issue 4: Customer's phone continues ringing after softphone is hung up
* **Fix**: Check `CallingService.js` to make sure `isDirectSoftphone` is passed so the Cloud VPS does not dispatch a second duplicate Click-to-Call leg to Voxbay PBX.

---

## 7. 🔒 CREDENTIALS & PRODUCTION CONSTANTS

* **Voxbay Account UID**: `x97x4zzfz1`
* **Voxbay Account UPIN**: `8uqctamkgf`
* **Virtual DID Number**: `918031496345`
* **Default Agent Extension**: `2MaqwezO`
* **Default Agent Mobile SIM**: `6283513686`
* **Click-to-Call API URL**: `https://x.voxbay.com/api/click_to_call`
* **Call Recordings Base URL**: `https://x.voxbay.com:81/callcenter/`
* **Webhook Bridging Event URL**: `https://api.employeemanagementsystems.com/callcenterbridging`

---

*Document compiled and verified for OmniFlow EMS Telecalling Suite.*
