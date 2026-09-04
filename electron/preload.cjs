const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isDesktopApp: true,
  platform: process.platform,
  sendNotification: (title, body) => {
    ipcRenderer.send('desktop-notify', { title, body });
  },
  reloadIframe: () => {
    ipcRenderer.send('reload-frame');
  },
  sendWhatsAppMessage: (payload) => {
    return ipcRenderer.invoke('whatsapp-send-message', payload);
  }
});
