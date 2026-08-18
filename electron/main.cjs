const { app, BrowserWindow, session, ipcMain, Menu, Tray, nativeImage, shell } = require('electron');
const path = require('path');

// Enable WebRTC, Hardware Media Codecs & Autoplay for WhatsApp VoIP & Video Calling
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
app.commandLine.appendSwitch('enable-features', 'WebRTCPeerConnectionWithBlockIceAddresses,AudioServiceSandbox,CameraServiceSandbox');
app.commandLine.appendSwitch('enable-usermedia-screen-capturing');
app.commandLine.appendSwitch('disable-features', 'CrossOriginOpenerPolicy,CrossOriginEmbedderPolicy');

let mainWindow = null;

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

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1024,
    minHeight: 700,
    title: 'OmniFlow — Multi-Staff WhatsApp Web & Team CRM',
    backgroundColor: '#0b141a',
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

  // Load Dashboard URL (Local dev or Cloud production)
  const dashboardUrl = process.env.DASHBOARD_URL || 'http://localhost:5173';
  mainWindow.loadURL(dashboardUrl);

  // Handle external links safely
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
