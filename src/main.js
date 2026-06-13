const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path   = require('path');
const fs     = require('fs');
const crypto = require('crypto');

const baseAppDir = app.isPackaged 
  ? (process.env.PORTABLE_EXECUTABLE_DIR || path.dirname(process.execPath)) 
  : path.join(__dirname, '..');

const APP_CONFIG = {
  name:      'RoundAway',
  version:   '1.0.0',
  width:     1080,
  height:    700,
  minWidth:  880,
  minHeight: 580,
  icon:      path.join(__dirname, '..', 'icon.ico'),
  keysDir:   path.join(baseAppDir, 'keys'), 
};

let mainWindow;

function ensureKeysDir() {
  try {
    if (!fs.existsSync(APP_CONFIG.keysDir)) {
      fs.mkdirSync(APP_CONFIG.keysDir, { recursive: true });
    }
  } catch (err) {
    console.error("Не удалось создать папку keys:", err);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width:           APP_CONFIG.width,
    height:          APP_CONFIG.height,
    minWidth:        APP_CONFIG.minWidth,
    minHeight:       APP_CONFIG.minHeight,
    title:           APP_CONFIG.name,
    icon:            APP_CONFIG.icon,
    frame:           false,
    backgroundColor: '#080808',
    webPreferences: {
      nodeIntegration:  false,
      contextIsolation: true,
      preload:          path.join(__dirname, 'preload.js'),
    },
  });
  mainWindow.loadFile(path.join(__dirname, 'index.html'));
}

app.whenReady().then(() => { ensureKeysDir(); createWindow(); });
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

// ─── IPC: window controls ────────────────────────────────────
ipcMain.on('window:minimize', () => mainWindow.minimize());
ipcMain.on('window:maximize', () =>
  mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize());
ipcMain.on('window:close',    () => mainWindow.close());

// ─── IPC: keys ───────────────────────────────────────────────
ipcMain.handle('keys:generate', async () => {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength:      4096,
    publicKeyEncoding:  { type: 'spki',  format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  fs.writeFileSync(path.join(APP_CONFIG.keysDir, 'private.pem'), privateKey, { mode: 0o600 });
  fs.writeFileSync(path.join(APP_CONFIG.keysDir, 'public.pem'),  publicKey);
  return { privateKey, publicKey };
});

ipcMain.handle('keys:load', async () => {
  const priv = path.join(APP_CONFIG.keysDir, 'private.pem');
  const pub  = path.join(APP_CONFIG.keysDir, 'public.pem');
  return {
    privateKey: fs.existsSync(priv) ? fs.readFileSync(priv, 'utf8') : null,
    publicKey:  fs.existsSync(pub)  ? fs.readFileSync(pub,  'utf8') : null,
    keysDir:    APP_CONFIG.keysDir,
    hasKeys:    fs.existsSync(priv) && fs.existsSync(pub),
  };
});

ipcMain.handle('keys:save', async (_e, { privateKey, publicKey }) => {
  if (privateKey) fs.writeFileSync(path.join(APP_CONFIG.keysDir, 'private.pem'), privateKey, { mode: 0o600 });
  if (publicKey)  fs.writeFileSync(path.join(APP_CONFIG.keysDir, 'public.pem'),  publicKey);
  return true;
});

ipcMain.handle('keys:exists', async () => {
  const priv = path.join(APP_CONFIG.keysDir, 'private.pem');
  const pub  = path.join(APP_CONFIG.keysDir, 'public.pem');
  return fs.existsSync(priv) && fs.existsSync(pub);
});

// ─── IPC: text crypto ────────────────────────────────────────
ipcMain.handle('crypto:encryptText', async (_e, { text, algorithm, password }) => {
  const { encrypted, iv, tag, salt } = encryptData(Buffer.from(text, 'utf8'), algorithm, password);
  return { encrypted: encrypted.toString('base64'), iv, tag, salt };
});

ipcMain.handle('crypto:decryptText', async (_e, { encrypted, algorithm, password, iv, tag, salt }) => {
  const buf = decryptData(Buffer.from(encrypted, 'base64'), algorithm, password, iv, tag, salt);
  return buf.toString('utf8');
});

// ─── IPC: file crypto ────────────────────────────────────────
ipcMain.handle('file:pickOpen', async () => {
  const { filePaths } = await dialog.showOpenDialog(mainWindow, { properties: ['openFile'] });
  return filePaths[0] || null;
});

ipcMain.handle('file:pickSave', async (_e, defaultName) => {
  const { filePath } = await dialog.showSaveDialog(mainWindow, { defaultPath: defaultName });
  return filePath || null;
});

ipcMain.handle('crypto:encryptFile', async (_e, { inputPath, outputPath, algorithm, password }) => {
  const data = fs.readFileSync(inputPath);
  const { encrypted, iv, tag, salt } = encryptData(data, algorithm, password);
  const meta    = Buffer.from(JSON.stringify({ iv, tag, salt, algorithm }));
  const metaLen = Buffer.alloc(4);
  metaLen.writeUInt32BE(meta.length, 0);
  fs.writeFileSync(outputPath, Buffer.concat([metaLen, meta, encrypted]));
  return true;
});

ipcMain.handle('crypto:decryptFile', async (_e, { inputPath, outputPath, password }) => {
  const raw     = fs.readFileSync(inputPath);
  const metaLen = raw.readUInt32BE(0);
  const meta    = JSON.parse(raw.slice(4, 4 + metaLen).toString());
  const encrypted = raw.slice(4 + metaLen);
  const decrypted = decryptData(encrypted, meta.algorithm, password, meta.iv, meta.tag, meta.salt);
  fs.writeFileSync(outputPath, decrypted);
  return true;
});

// ─── CRYPTO HELPERS ─────────────────────────────────────────
const ALGO_MAP = {
  'AES-256-GCM':  { keyLen: 32, ivLen: 12, mode: 'aes-256-gcm'       },
  'AES-192-GCM':  { keyLen: 24, ivLen: 12, mode: 'aes-192-gcm'       },
  'AES-128-GCM':  { keyLen: 16, ivLen: 12, mode: 'aes-128-gcm'       },
  'AES-256-CBC':  { keyLen: 32, ivLen: 16, mode: 'aes-256-cbc'       },
  'AES-192-CBC':  { keyLen: 24, ivLen: 16, mode: 'aes-192-cbc'       },
  'AES-128-CBC':  { keyLen: 16, ivLen: 16, mode: 'aes-128-cbc'       },
  'CAMELLIA-256': { keyLen: 32, ivLen: 16, mode: 'camellia-256-cbc'  },
  'ChaCha20':     { keyLen: 32, ivLen: 12, mode: 'chacha20-poly1305' },
};

function deriveKey(password, salt, keyLen) {
  return crypto.pbkdf2Sync(password, salt, 200_000, keyLen, 'sha512');
}

function encryptData(data, algorithmName, password) {
  const cfg     = ALGO_MAP[algorithmName] || ALGO_MAP['AES-256-GCM'];
  const salt    = crypto.randomBytes(32).toString('hex');
  const iv      = crypto.randomBytes(cfg.ivLen).toString('hex');
  const key     = deriveKey(password, salt, cfg.keyLen);
  const isAuth  = cfg.mode.includes('gcm') || cfg.mode === 'chacha20-poly1305';
  const cipher  = crypto.createCipheriv(cfg.mode, key, Buffer.from(iv, 'hex'), isAuth ? { authTagLength: 16 } : undefined);
  const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
  const tag = isAuth ? cipher.getAuthTag().toString('hex') : null;
  return { encrypted, iv, tag, salt };
}

function decryptData(encrypted, algorithmName, password, iv, tag, salt) {
  const cfg      = ALGO_MAP[algorithmName] || ALGO_MAP['AES-256-GCM'];
  const key      = deriveKey(password, salt, cfg.keyLen);
  const isAuth   = cfg.mode.includes('gcm') || cfg.mode === 'chacha20-poly1305';
  const decipher = crypto.createDecipheriv(cfg.mode, key, Buffer.from(iv, 'hex'), isAuth ? { authTagLength: 16 } : undefined);
  if (isAuth && tag) decipher.setAuthTag(Buffer.from(tag, 'hex'));
  return Buffer.concat([decipher.update(encrypted), decipher.final()]);
}