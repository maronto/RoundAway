const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  minimize:     ()     => ipcRenderer.send('window:minimize'),
  maximize:     ()     => ipcRenderer.send('window:maximize'),
  close:        ()     => ipcRenderer.send('window:close'),

  generateKeys: ()     => ipcRenderer.invoke('keys:generate'),
  loadKeys:     ()     => ipcRenderer.invoke('keys:load'),
  saveKeys:     (d)    => ipcRenderer.invoke('keys:save', d),
  keysExist:    ()     => ipcRenderer.invoke('keys:exists'),

  encryptText:  (o)    => ipcRenderer.invoke('crypto:encryptText', o),
  decryptText:  (o)    => ipcRenderer.invoke('crypto:decryptText', o),

  pickOpenFile: ()     => ipcRenderer.invoke('file:pickOpen'),
  pickSaveFile: (n)    => ipcRenderer.invoke('file:pickSave', n),
  encryptFile:  (o)    => ipcRenderer.invoke('crypto:encryptFile', o),
  decryptFile:  (o)    => ipcRenderer.invoke('crypto:decryptFile', o),
});