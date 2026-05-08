const { contextBridge, ipcRenderer } = require('electron');

console.log('Preload script loaded');

contextBridge.exposeInMainWorld('electron', {
  loadResonators: () => ipcRenderer.invoke('load-resonators'),
  saveDeck: (deckName, data) => ipcRenderer.invoke('save-deck', { deckName, data }),
  minimizeWindow: () => ipcRenderer.invoke('window-minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window-maximize'),
  closeWindow: () => ipcRenderer.invoke('window-close'),
});
