const { app, BrowserWindow, session, ipcMain, Menu, Tray, nativeImage, shell } = require('electron');
const path = require('path');
const http = require('http');

// Enable WebRTC, Hardware Media Codecs & Autoplay for WhatsApp VoIP & Video Calling
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
app.commandLine.appendSwitch('enable-features', 'WebRTCPeerConnectionWithBlockIceAddresses,AudioServiceSandbox,CameraServiceSandbox');
app.commandLine.appendSwitch('enable-usermedia-screen-capturing');
app.commandLine.appendSwitch('disable-features', 'CrossOriginOpenerPolicy,CrossOriginEmbedderPolicy');

let mainWindow = null;

// Single Instance Lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

// Clean Chrome 124 User-Agent (Strips any Electron identifiers so WhatsApp enables full calling)
const WHATSAPP_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

// Configure session headers & permissions for WhatsApp Web
function configureSession(ses) {
  ses.setUserAgent(WHATSAPP_USER_AGENT);

  // Auto-grant Microphone, Camera, Screen Sharing, Notifications & Audio Output
  ses.setPermissionCheckHandler((webContents, permission, requestingOrigin) => {
    return true;
  });

  ses.setPermissionRequestHandler((webContents, permission, callback) => {
    callback(true);
  });

  if (typeof ses.setDevicePermissionHandler === 'function') {
    ses.setDevicePermissionHandler(() => true);
  }

  ses.webRequest.onHeadersReceived((details, callback) => {
    const responseHeaders = Object.assign({}, details.responseHeaders);
    delete responseHeaders['x-frame-options'];
    delete responseHeaders['X-Frame-Options'];
    delete responseHeaders['content-security-policy'];
    delete responseHeaders['Content-Security-Policy'];
    delete responseHeaders['cross-origin-opener-policy'];
    delete responseHeaders['cross-origin-embedder-policy'];
    callback({ responseHeaders });
  });
}

// Helper to check if a local port is alive
function checkPort(port, callback) {
  const req = http.get(`http://localhost:${port}`, (res) => {
    callback(true);
  });
  req.on('error', () => {
    callback(false);
  });
  req.setTimeout(1000, () => {
    req.destroy();
    callback(false);
  });
}

function createWindow() {
  Menu.setApplicationMenu(null); // Clean window without default menu bar

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1024,
    minHeight: 700,
    title: 'OmniFlow — WhatsApp Web & CRM Workspace',
    backgroundColor: '#064e43',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webviewTag: true, // Enables native multi-session webview tags for WhatsApp Web
      preload: path.join(__dirname, 'preload.cjs')
    }
  });

  configureSession(session.defaultSession);

  // Auto-configure all partition sessions (persist:staff_*)
  app.on('session-created', (ses) => {
    configureSession(ses);
  });

  // Determine target URL: Check 5173 (Vite Dev Server) first, fallback to 5000 (Backend Production) or Cloud Production
  if (process.env.DASHBOARD_URL) {
    mainWindow.loadURL(process.env.DASHBOARD_URL);
  } else {
    checkPort(5173, (isDevRunning) => {
      if (isDevRunning) {
        mainWindow.loadURL('http://localhost:5173');
      } else {
        checkPort(5000, (isProdRunning) => {
          if (isProdRunning) {
            mainWindow.loadURL('http://localhost:5000');
          } else {
            // Live Cloud Production URL for standalone client installer
            mainWindow.loadURL('https://ems-crm-sandy.vercel.app');
          }
        });
      }
    });
  }

  // Handle connection errors gracefully with retry UI
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    if (errorCode === -102 || errorCode === -105 || errorCode === -106) {
      mainWindow.loadURL(`data:text/html;charset=utf-8,
        <html style="background:#064e43;font-family:system-ui,sans-serif;color:white;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
          <div style="text-align:center;padding:40px;background:rgba(255,255,255,0.08);border-radius:16px;border:1px solid rgba(255,255,255,0.15);max-width:500px;">
            <div style="font-size:48px;margin-bottom:16px;">⚡</div>
            <h2 style="margin:0 0 10px 0;">OmniFlow Desktop Server Initializing</h2>
            <p style="opacity:0.8;font-size:14px;line-height:1.5;margin-bottom:24px;">Waiting for local backend and CRM services to start...</p>
            <button onclick="location.reload()" style="background:#14d2cb;color:#064e43;border:none;padding:10px 24px;border-radius:8px;font-weight:bold;cursor:pointer;font-size:14px;">Retry Connection</button>
          </div>
        </html>
      `);
      setTimeout(() => {
        if (mainWindow) mainWindow.loadURL('http://localhost:5173');
      }, 3000);
    }
  });

  // Handle external links safely in default system browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:') || url.startsWith('http:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC Handlers for WhatsApp Web Bridge
ipcMain.handle('whatsapp-send-message', async (event, payload) => {
  const { phone, text } = payload || {};
  const cleanPhone = String(phone || '').replace(/\D/g, '');
  if (!cleanPhone || !text) {
    return { success: false, error: 'Phone number and message text are required' };
  }

  try {
    const { webContents } = require('electron');
    const allWebContents = webContents.getAllWebContents();
    const waWeb = allWebContents.find(wc => {
      const u = wc.getURL() || '';
      return u.includes('web.whatsapp.com');
    });

    if (!waWeb) {
      return { success: false, error: 'WhatsApp Webview not active. Please open WhatsApp tab once.' };
    }

    const script = `
      (function() {
        try {
          const cleanNumber = "${cleanPhone}";
          const messageText = ${JSON.stringify(text)};
          const targetUrl = 'https://web.whatsapp.com/send?phone=' + cleanNumber + '&text=' + encodeURIComponent(messageText);

          // Check if send button is immediately available in active chat
          const sendBtn = document.querySelector('button[aria-label="Send"], span[data-icon="send"], button span[data-icon="send"]');
          if (sendBtn) {
            sendBtn.click();
            return { status: 'sent', method: 'dom_click' };
          }

          // Navigate to direct send URL
          window.location.href = targetUrl;
          return { status: 'navigating', targetUrl };
        } catch (e) {
          return { status: 'error', error: e.message };
        }
      })()
    `;
    const res = await waWeb.executeJavaScript(script);
    return { success: true, data: res };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// App lifecycle
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

