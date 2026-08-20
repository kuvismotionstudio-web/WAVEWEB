const { app, BrowserWindow, ipcMain, session, dialog, shell, Notification, webContents, clipboard } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const { autoUpdater } = require('electron-updater');

let mainWindow;

// ===== AUTO UPDATER =====
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

autoUpdater.on('checking-for-update', () => {
  if (mainWindow) mainWindow.webContents.send('update-checking');
});

autoUpdater.on('update-available', (info) => {
  if (mainWindow) mainWindow.webContents.send('update-available', {
    version: info.version,
    releaseDate: info.releaseDate,
    releaseNotes: info.releaseNotes || '',
  });
});

autoUpdater.on('update-not-available', () => {
  if (mainWindow) mainWindow.webContents.send('update-not-available');
});

autoUpdater.on('download-progress', (progress) => {
  if (mainWindow) mainWindow.webContents.send('update-download-progress', {
    percent: progress.percent,
    bytesPerSecond: progress.bytesPerSecond,
    transferred: progress.transferred,
    total: progress.total,
  });
});

autoUpdater.on('update-downloaded', (info) => {
  if (mainWindow) mainWindow.webContents.send('update-downloaded', {
    version: info.version,
    releaseDate: info.releaseDate,
  });
});

autoUpdater.on('error', (err) => {
  if (mainWindow) mainWindow.webContents.send('update-error', err.message);
});

// Single instance lock — prevent multiple windows when clicking external links
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
      const url = commandLine.find(a => a.startsWith('http://') || a.startsWith('https://') || a.startsWith('mailto:'));
      if (url) mainWindow.webContents.send('open-link-newtab', url);
    }
  });
}

// ===== DATA PATHS =====
const userDataPath = app.getPath('userData');
const downloadsPath = app.getPath('downloads');
const historyFile = path.join(userDataPath, 'history.json');
const bookmarksFile = path.join(userDataPath, 'bookmarks.json');
const settingsFile = path.join(userDataPath, 'settings.json');
const tabGroupsFile = path.join(userDataPath, 'tab-groups.json');
const clipboardFile = path.join(userDataPath, 'clipboard.json');
const userScriptsFile = path.join(userDataPath, 'user-scripts.json');

function getDownloadPath() {
  const s = loadJSON(settingsFile, {});
  return s.downloadPath || downloadsPath;
}

function loadJSON(file, def) {
  try {
    if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {}
  return def;
}

function saveJSON(file, data) {
  try { fs.writeFileSync(file, JSON.stringify(data, null, 2)); } catch (e) {}
}

// ===== AD BLOCK PRO =====
let AD_PATTERNS = [];
let adBlockEnabled = true;
let adBlockStats = { total: 0, domains: {} };
let adWhitelist = [];
let customFilters = [];
const adblockFile = path.join(userDataPath, 'adblock.json');
const whitelistFile = path.join(userDataPath, 'ad-whitelist.json');

function loadAdBlockData() {
  const data = loadJSON(adblockFile, {});
  customFilters = data.customFilters || [];
  adWhitelist = loadJSON(whitelistFile, []);
}

function saveAdBlockData() {
  saveJSON(adblockFile, { customFilters });
}

function saveWhitelist() {
  saveJSON(whitelistFile, adWhitelist);
}

// Built-in pattern library (expanded)
const BUILTIN_PATTERNS = [
  // Ad networks
  /doubleclick\.net/, /googlesyndication\.com/, /googletagmanager\.com/,
  /googleadservices\.com/, /googleads\.g\.doubleclick\.net/, /adservice\.google\./,
  /pagead2\.googlesyndication/, /ad\.google\.com/,
  /facebook\.com\/tr/, /connect\.facebook\.net\/.*\/analytics/,
  /ads\.twitter\.com/, /t\.co\//,
  /amazon-adsystem\.com/, /adtago\.s3\.amazonaws\.com/,
  
  // Ad exchanges & DSPs
  /adnxs\.com/, /adsrvr\.org/, /advertising\.com/, /adbrite\.com/,
  /adcolony\.com/, /admob\.com/, /moatads\.com/, /rubiconproject\.com/,
  /pubmatic\.com/, /openx\.net/, /criteo\.com/, /casalemedia\.com/,
  /contextweb\.com/, /dotomi\.com/, /exelator\.com/, /mathtag\.com/,
  /media\.net/, /outbrain\.com/, /taboola\.com/, /tidaltv\.com/,
  /tremorhub\.com/, /triplelift\.com/, /undertone\.com/, /yieldmo\.com/,
  /yieldmanager\.com/, /yieldlab\.net/, /spotx\.tv/, /indexww\.com/,
  /sovrn\.com/, /sharethrough\.com/, /adzerk\.net/, /reachmod\.com/,
  /krxd\.net/, /rlcdn\.com/, /agkn\.com/, /demdex\.net/,
  /adsafeprotected\.com/, /moat\.com/, /integral\.ad/,
  
  // Analytics & tracking
  /scorecardresearch\.com/, /quantserve\.com/, /comscore\.com/,
  /bing\.com\/bat\.js/, /bat\.bing\.com/,
  /hotjar\.com/, /mixpanel\.com/, /segment\.com\/analytics/,
  /amplitude\.com/, /fullstory\.com/, /heap\.io/, /mouseflow\.com/,
  /clicky\.com/, /statcounter\.com/, /histats\.com/,
  /googletagmanager\.com\/ns\.html/,
  
  // Content & recommendation
  /taboola\.com\/.*\/widget/, /outbrain\.com\/.*\/widget/,
  /revcontent\.com/, /contentad\.com/, /mgid\.com/,
  
  // Remarketing / retargeting
  /adroll\.com/, /criteo\.com\/.*\/retargeting/, /perfectaudience\.com/,
  /addthis\.com/, /addtoany\.com/, /sharethis\.com/,
  
  // Popunders / popups
  /popads\.net/, /popcash\.net/, /propellerads\.com/,
  /trafficjunky\.net/, /exoclick\.com/, /juicyads\.com/,
  /adsterra\.com/, /clickadu\.com/, /adbucks\.pw/,
  
  // Malvertising / unwanted
  /adf\.ly/, /shorte\.st/, /linkbucks\.com/, /adfly\.com/,
  /adfoc\.us/, /bc\.vc/, /destyy\.com/, /ow\.ly\/.*\/sess/,
  
  // Social widgets & buttons (tracking)
  /platform\.twitter\.com\/widgets/, /platform\.linkedin\.com\/in\/?/,
  /apis\.google\.com\/js\/plusone\.js/, /connect\.facebook\.net\/en_US\/sdk/,
  
  // Generic ad patterns
  /\/ads\//, /\/adz\//, /\/banners?\//, /\/sponsor/,
  /\/analytics\//, /\/pixel\//, /\/beacon\//,
  /ad\.js/, /ad\.php/, /ads\.js/, /analytics\.js/,
  /\.ads\b/, /\b_ad\b/, /\badframe/,
  
  // Common CDN ad patterns
  /cdn\.adpushup\.com/, /cdn\.taboola\.com/, /cdn\.outbrain\.com/,
  /cdn\.criteo\.net/, /cdn\.moat\.com/, /cdn\.adsafeprotected\.com/,
  
  // Crypto miners (detection)
  /coinhive\.com/, /miner\./, /cryptoloot\.pro/,
];

function rebuildPatterns() {
  const patterns = [...BUILTIN_PATTERNS];
  customFilters.forEach(f => {
    try {
      // Support basic patterns: domain.com, ||domain.com^, /regex/
      if (f.startsWith('/') && f.endsWith('/')) {
        patterns.push(new RegExp(f.slice(1, -1), 'i'));
      } else {
        const domain = f.replace(/^\|\|/, '').replace(/\^$/, '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        patterns.push(new RegExp(domain, 'i'));
      }
    } catch(e) {}
  });
  AD_PATTERNS = patterns;
}

loadAdBlockData();
rebuildPatterns();

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#0f0f13',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true,
      spellcheck: true,
    },
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  // Spoof user-agent to look like regular Chrome (avoid site blocks)
  const defaultUA = mainWindow.webContents.getUserAgent();
  const chromiumVersion = defaultUA.match(/Chrome\/([\d.]+)/)?.[1] || '136.0.0.0';
  const cleanUA = `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromiumVersion} Safari/537.36`;
  session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    details.requestHeaders['User-Agent'] = cleanUA;
    callback({ requestHeaders: details.requestHeaders });
  });

  mainWindow.on('enter-full-screen', () => {
    mainWindow.webContents.send('fullscreen-changed', true);
  });
  mainWindow.on('leave-full-screen', () => {
    mainWindow.webContents.send('fullscreen-changed', false);
  });

  // ===== PERMISSION HANDLER =====
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    const allowed = ['media', 'microphone', 'camera', 'notifications', 'clipboard-read', 'clipboard-sanitized-write', 'fullscreen', 'geolocation', 'idle-detection'];
    if (allowed.includes(permission)) {
      callback(true);
    } else {
      callback(false);
    }
  });

  // ===== AD BLOCKER =====
  adBlockEnabled = loadJSON(settingsFile, {}).adBlock !== false;

  session.defaultSession.webRequest.onBeforeRequest({ urls: ['*://*/*'] }, (details, callback) => {
    if (adBlockEnabled && mainWindow) {
      const url = details.url;
      // Check whitelist
      const isWhitelisted = adWhitelist.some(d => url.includes(d));
      if (isWhitelisted) { callback({}); return; }

      if (AD_PATTERNS.some(r => r.test(url))) {
        // Track stats
        adBlockStats.total++;
        try {
          const host = new URL(url).hostname;
          adBlockStats.domains[host] = (adBlockStats.domains[host] || 0) + 1;
        } catch(e) {}
        // Send event to renderer
        try {
          mainWindow.webContents.send('ad-blocked', { url, total: adBlockStats.total });
        } catch(e) {}
        callback({ cancel: true });
      } else {
        callback({});
      }
    } else {
      callback({});
    }
  });

  // ===== DOWNLOAD MANAGER =====
  const activeDownloads = {};

  session.defaultSession.on('will-download', (event, item) => {
    const dlDir = getDownloadPath();
    const savePath = path.join(dlDir, item.getFilename());
    item.setSavePath(savePath);

    const downloadId = Date.now().toString();
    activeDownloads[downloadId] = item;

    try {
      mainWindow.webContents.send('download-started', {
        id: downloadId,
        filename: item.getFilename(),
        url: item.getURL(),
        totalBytes: item.getTotalBytes(),
        savePath,
        canPause: typeof item.canPause === 'function' && item.canPause(),
        canResume: typeof item.canResume === 'function' && item.canResume(),
      });
    } catch (_) {}

    item.on('updated', (event, state) => {
      if (state === 'progressing') {
        try {
          const canPause = typeof item.canPause === 'function' && item.canPause();
          const canResume = typeof item.canResume === 'function' && item.canResume();
          mainWindow.webContents.send('download-progress', {
            id: downloadId,
            receivedBytes: item.getReceivedBytes(),
            totalBytes: item.getTotalBytes(),
            speed: item.getCurrentBytesPerSecond(),
            state,
            canPause,
            canResume,
          });
        } catch (_) {}
      } else if (state === 'interrupted') {
        mainWindow.webContents.send('download-failed', { id: downloadId });
      }
    });

    item.once('done', (event, state) => {
      delete activeDownloads[downloadId];
      if (state === 'completed') {
        mainWindow.webContents.send('download-completed', {
          id: downloadId,
          filename: item.getFilename(),
          savePath,
          totalBytes: item.getTotalBytes(),
        });
        // Save to download history
        const dlHistory = loadJSON(path.join(userDataPath, 'downloads.json'), []);
        dlHistory.unshift({
          id: downloadId,
          filename: item.getFilename(),
          url: item.getURL(),
          savePath,
          size: item.getTotalBytes(),
          date: new Date().toISOString(),
        });
        saveJSON(path.join(userDataPath, 'downloads.json'), dlHistory.slice(0, 500));
      } else {
        mainWindow.webContents.send('download-failed', { id: downloadId });
      }
    });
  });

  // Download pause/resume IPC
  ipcMain.on('download-pause', (e, id) => {
    try {
      const item = activeDownloads[id];
      if (item && typeof item.canPause === 'function' && item.canPause()) item.pause();
    } catch (_) {}
  });
  ipcMain.on('download-resume', (e, id) => {
    try {
      const item = activeDownloads[id];
      if (item && typeof item.canResume === 'function' && item.canResume()) item.resume();
    } catch (_) {}
  });
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ===== IPC HANDLERS =====

// Auto Updater
ipcMain.on('update-check', () => {
  autoUpdater.checkForUpdates().catch(() => {});
});
ipcMain.on('update-download', () => {
  autoUpdater.downloadUpdate().catch(() => {});
});
ipcMain.on('update-install', () => {
  autoUpdater.quitAndInstall(false, true);
});

// Window controls
ipcMain.on('window-minimize', () => mainWindow?.minimize());
ipcMain.on('window-maximize', () => {
  if (!mainWindow) return;
  if (mainWindow.isMaximized()) mainWindow.unmaximize();
  else mainWindow.maximize();
});
ipcMain.on('window-close', () => mainWindow?.close());
ipcMain.on('window-toggle-fullscreen', () => {
  if (!mainWindow) return;
  mainWindow.setFullScreen(!mainWindow.isFullScreen());
});
ipcMain.handle('window-is-fullscreen', () => mainWindow?.isFullScreen() ?? false);

// History
ipcMain.handle('history-get', () => loadJSON(historyFile, []));
ipcMain.on('history-add', (e, entry) => {
  const history = loadJSON(historyFile, []);
  history.unshift({ ...entry, date: new Date().toISOString() });
  saveJSON(historyFile, history.slice(0, 5000));
});
ipcMain.on('history-clear', () => saveJSON(historyFile, []));

// Clear browsing data
ipcMain.handle('clear-browsing-data', async (e, types) => {
  const ses = session.defaultSession;
  if (types.history) saveJSON(historyFile, []);
  if (types.cache) await ses.clearCache();
  if (types.cookies) await ses.clearStorageData({ storages: ['cookies', 'localStorage', 'sessionStorage'] });
  if (types.downloads) saveJSON(path.join(userDataPath, 'downloads.json'), []);
  return true;
});

// Bookmarks
ipcMain.handle('bookmarks-get', () => loadJSON(bookmarksFile, []));
ipcMain.on('bookmarks-add', (e, bookmark) => {
  const bookmarks = loadJSON(bookmarksFile, []);
  if (!bookmarks.find(b => b.url === bookmark.url)) {
    bookmarks.unshift({ ...bookmark, date: new Date().toISOString() });
    saveJSON(bookmarksFile, bookmarks);
  }
});
ipcMain.on('bookmarks-remove', (e, url) => {
  const bookmarks = loadJSON(bookmarksFile, []).filter(b => b.url !== url);
  saveJSON(bookmarksFile, bookmarks);
});
ipcMain.handle('bookmarks-export', async () => {
  const bookmarks = loadJSON(bookmarksFile, []);
  const lines = [
    '<!DOCTYPE NETSCAPE-Bookmark-file-1>',
    '<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">',
    '<TITLE>Bookmarks</TITLE>',
    '<H1>Bookmarks</H1>',
    '<DL><p>',
  ];
  bookmarks.forEach(b => {
    const ts = b.date ? Math.floor(new Date(b.date).getTime() / 1000) : Math.floor(Date.now() / 1000);
    const icon = b.favicon ? ` ICON="${b.favicon.replace(/"/g, '&quot;')}"` : '';
    lines.push(`  <DT><A HREF="${b.url.replace(/"/g, '&quot;')}" ADD_DATE="${ts}"${icon}>${b.title || b.url}</A>`);
  });
  lines.push('</DL><p>');
  const content = lines.join('\n');
  const { filePath: result } = await dialog.showSaveDialog(mainWindow, {
    defaultPath: 'bookmarks.html',
    filters: [{ name: 'Bookmark HTML', extensions: ['html', 'htm'] }],
  });
  if (result) {
    try { fs.writeFileSync(result, content, 'utf8'); return true; } catch(e) {}
  }
  return false;
});
ipcMain.handle('bookmarks-import', async () => {
  const { filePaths } = await dialog.showOpenDialog(mainWindow, {
    filters: [{ name: 'Bookmark HTML', extensions: ['html', 'htm'] }],
    properties: ['openFile'],
  });
  if (!filePaths?.length) return 0;
  try {
    const html = fs.readFileSync(filePaths[0], 'utf8');
    const bookmarks = loadJSON(bookmarksFile, []);
    const regex = /<A\s+HREF="([^"]*)"[^>]*>([^<]*)<\/A>/gi;
    let match, count = 0;
    while ((match = regex.exec(html)) !== null) {
      const url = match[1];
      const title = match[2].trim() || url;
      if (!bookmarks.find(b => b.url === url)) {
        bookmarks.unshift({ url, title, date: new Date().toISOString() });
        count++;
      }
    }
    if (count > 0) saveJSON(bookmarksFile, bookmarks);
    return count;
  } catch(e) { return 0; }
});

// Downloads history
ipcMain.handle('downloads-get', () => loadJSON(path.join(userDataPath, 'downloads.json'), []));
ipcMain.on('downloads-clear', () => saveJSON(path.join(userDataPath, 'downloads.json'), []));

// Open file in system
ipcMain.on('open-file', (e, filePath) => {
  shell.openPath(filePath);
});
ipcMain.on('show-in-folder', (e, filePath) => {
  shell.showItemInFolder(filePath);
});

// Settings
ipcMain.handle('settings-get', () => loadJSON(settingsFile, { adBlock: true, theme: 'dark', searchEngine: 'google' }));
ipcMain.on('settings-set', (e, settings) => {
  saveJSON(settingsFile, settings);
});

// Download path selector
ipcMain.handle('select-download-path', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    defaultPath: getDownloadPath(),
    properties: ['openDirectory']
  });
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

// AdBlock IPC
ipcMain.handle('adblock-stats', () => ({ ...adBlockStats }));
ipcMain.on('adblock-reset-stats', () => { adBlockStats = { total: 0, domains: {} }; });
ipcMain.handle('adblock-whitelist-get', () => [...adWhitelist]);
ipcMain.on('adblock-whitelist-add', (e, domain) => {
  if (!adWhitelist.includes(domain)) { adWhitelist.push(domain); saveWhitelist(); }
});
ipcMain.on('adblock-whitelist-remove', (e, domain) => {
  adWhitelist = adWhitelist.filter(d => d !== domain);
  saveWhitelist();
});
ipcMain.handle('adblock-custom-filters', () => [...customFilters]);
ipcMain.on('adblock-custom-filter-add', (e, filter) => {
  if (!customFilters.includes(filter)) { customFilters.push(filter); saveAdBlockData(); rebuildPatterns(); }
});
ipcMain.on('adblock-custom-filter-remove', (e, filter) => {
  customFilters = customFilters.filter(f => f !== filter);
  saveAdBlockData();
  rebuildPatterns();
});
ipcMain.on('adblock-set-enabled', (e, enabled) => {
  adBlockEnabled = enabled;
});
ipcMain.handle('adblock-filter-count', () => AD_PATTERNS.length);

// Context menu for webview
ipcMain.on('show-context-menu', (e, params) => {
  const items = [];

  if (params.linkURL) {
    items.push(
      { label: 'Open link in new tab', icon: '↗', action: 'open-link-newtab', arg: params.linkURL },
      { label: 'Copy link address', icon: '📎', action: 'copy-text', arg: params.linkURL },
      { label: 'Save link to reading list', icon: '⏱', action: 'save-to-reading-list', arg: { url: params.linkURL, title: params.linkText || params.linkURL } },
      { separator: true }
    );
  }

  if (params.selectionText) {
    items.push(
      { label: `Search "${params.selectionText.substring(0, 25)}..."`, icon: '🔎', action: 'search-selection', arg: params.selectionText },
      { label: 'Copy', icon: '📋', action: 'copy-text', arg: params.selectionText },
      { separator: true }
    );
  }

  if (params.mediaType === 'image') {
    items.push(
      { label: 'Save image as...', icon: '💾', action: 'save-image', arg: params.srcURL },
      { label: 'Copy image address', icon: '📎', action: 'copy-text', arg: params.srcURL },
      { separator: true }
    );
  }

  items.push(
    { label: 'Back', icon: '◀', action: 'nav-back' },
    { label: 'Forward', icon: '▶', action: 'nav-forward' },
    { label: 'Reload', icon: '🔄', action: 'nav-reload' },
    { separator: true },
    { label: 'Save page as...', icon: '💾', action: 'save-page' },
    { label: 'Print...', icon: '🖨', action: 'print-page' },
    { label: 'View page source', icon: '📄', action: 'view-source' },
    { separator: true },
    { label: 'Inspect element', icon: '🔍', action: 'inspect-element' },
  );

  if (items.length > 0 && mainWindow) {
    mainWindow.webContents.send('show-context-menu-renderer', { items, x: params.x, y: params.y });
  }
});

// Context menu action relay
ipcMain.on('context-menu-action', async (e, action, arg) => {
  if (!mainWindow) return;
  if (action === 'copy-text') {
    require('electron').clipboard.writeText(arg);
  } else if (action === 'save-image') {
    mainWindow.webContents.downloadURL(arg);
  } else if (action === 'save-page') {
    const { dialog } = require('electron');
    const result = await dialog.showSaveDialog(mainWindow, {
      defaultPath: 'page.html',
      filters: [{ name: 'HTML', extensions: ['html'] }, { name: 'Web Page, Complete', extensions: ['htm', 'html'] }]
    });
    if (!result.canceled && result.filePath) {
      mainWindow.webContents.downloadURL(arg);
    }
  } else {
    mainWindow.webContents.send(action, arg);
  }
});

// Webview window.open handler (replaces new-window event)
ipcMain.on('register-webview', (e, webviewId) => {
  const wc = webContents.fromId(webviewId);
  if (!wc) return;
  wc.setWindowOpenHandler(({ url }) => {
    mainWindow?.webContents.send('open-link-newtab', url);
    return { action: 'deny' };
  });
});

// Tab preview — capture webview thumbnail
ipcMain.handle('capture-page', async (e, webviewId) => {
  try {
    const wc = webContents.fromId(webviewId);
    if (!wc) return null;
    const image = await wc.capturePage({ x: 0, y: 0, width: 1280, height: 720 });
    return image.toDataURL({ mimeType: 'image/jpeg', quality: 0.7 });
  } catch (_) {
    return null;
  }
});

// Print
ipcMain.on('print-page', () => {
  const wins = BrowserWindow.getAllWindows();
  if (wins.length > 0) wins[0].webContents.print();
});

// Sessions
const sessionsFile = path.join(userDataPath, 'sessions.json');
const lastSessionFile = path.join(userDataPath, 'last-session.json');

ipcMain.handle('sessions-list', () => loadJSON(sessionsFile, []));
ipcMain.handle('session-get', (e, id) => {
  const sessions = loadJSON(sessionsFile, []);
  return sessions.find(s => s.id === id) || null;
});
ipcMain.on('session-save', (e, session) => {
  const sessions = loadJSON(sessionsFile, []);
  const existing = sessions.findIndex(s => s.id === session.id);
  if (existing >= 0) sessions[existing] = session;
  else sessions.unshift(session);
  saveJSON(sessionsFile, sessions.slice(0, 50));
});
ipcMain.on('session-delete', (e, id) => {
  const sessions = loadJSON(sessionsFile, []).filter(s => s.id !== id);
  saveJSON(sessionsFile, sessions);
});
ipcMain.on('session-save-last', (e, data) => {
  saveJSON(lastSessionFile, data);
});
ipcMain.handle('session-get-last', () => loadJSON(lastSessionFile, null));

// Auto-save last session on quit + clear data on exit
app.on('before-quit', async () => {
  if (mainWindow) {
    mainWindow.webContents.send('before-quit-save');
    // Give renderer time to persist session
    await new Promise(r => setTimeout(r, 300));
    const settings = loadJSON(settingsFile, {});
    if (settings.clearOnExit) {
      const ses = session.defaultSession;
      await ses.clearCache();
      saveJSON(historyFile, []);
      saveJSON(path.join(userDataPath, 'downloads.json'), []);
      await ses.clearStorageData({ storages: ['cookies', 'localStorage', 'sessionStorage'] });
    }
  }
});

// ===== EXTENSIONS SYSTEM =====
const extensionsDir = path.join(userDataPath, 'extensions');
const extensionsStateFile = path.join(userDataPath, 'extensions-state.json');
let extensions = [];
let extensionAPIs = {};

function ensureExtensionsDir() {
  if (!fs.existsSync(extensionsDir)) {
    fs.mkdirSync(extensionsDir, { recursive: true });
  }
}

function loadExtensions() {
  ensureExtensionsDir();
  const state = loadJSON(extensionsStateFile, {});
  extensions = [];
  extensionAPIs = {};

  try {
    const dirs = fs.readdirSync(extensionsDir, { withFileTypes: true })
      .filter(d => d.isDirectory());

    dirs.forEach(dir => {
      const extDir = path.join(extensionsDir, dir.name);
      const manifestPath = path.join(extDir, 'manifest.json');
      if (!fs.existsSync(manifestPath)) return;

      try {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        const ext = {
          id: dir.name,
          dir: extDir,
          manifest,
          enabled: state[dir.name] !== false,
          bgWindow: null,
          bgReady: false,
        };
        extensions.push(ext);
      } catch(e) {
        console.error(`Failed to load extension ${dir.name}:`, e.message);
      }
    });
  } catch(e) {}

  // Initialize background scripts for enabled extensions
  extensions.filter(e => e.enabled).forEach(ext => {
    if (ext.manifest.background?.scripts?.length) {
      initBackgroundScript(ext);
    }
  });
}

function initBackgroundScript(ext) {
  // Create hidden webview for background script
  const bgHtml = `
    <!DOCTYPE html><html><body>
    <script>
      const chrome = ${generateChromeAPI(ext.id)};
      ${ext.manifest.background.scripts.map(s => {
        try { return fs.readFileSync(path.join(ext.dir, s), 'utf8'); } catch(e) { return ''; }
      }).join('\n')}
    <\/script>
    </body></html>
  `;

  // Inject chrome API into renderer for webviews
  extensionAPIs[ext.id] = {
    manifest: ext.manifest,
    contentScripts: ext.manifest.content_scripts || [],
    chromeAPI: generateChromeAPI(ext.id),
  };
}

function generateChromeAPI(extId) {
  return `
    (function() {
      const _extId = '${extId}';
      const _listeners = {};
      const _storage = {};
      const _tabData = {};

      const chrome = {
        runtime: {
          id: _extId,
          sendMessage: function(msg, cb) {
            // Will be handled via IPC
            window.__extSendMessage(_extId, msg, cb);
          },
          onMessage: {
            addListener: function(cb) {
              window.__extOnMessage = cb;
            }
          },
          onInstalled: {
            addListener: function(cb) {
              // Fire immediately for now
              setTimeout(() => cb({ reason: 'install' }), 100);
            }
          }
        },
        tabs: {
          query: function(q, cb) {
            window.__extTabsQuery(_extId, q, cb);
          },
          create: function(opts, cb) {
            window.__extTabsCreate(_extId, opts, cb);
          },
          sendMessage: function(tabId, msg, cb) {
            window.__extTabsSendMessage(_extId, tabId, msg, cb);
          }
        },
        storage: {
          local: {
            get: function(keys, cb) {
              window.__extStorageGet(_extId, keys, cb);
            },
            set: function(items, cb) {
              window.__extStorageSet(_extId, items, cb);
            }
          }
        },
        action: {
          onClicked: {
            addListener: function(cb) {
              window.__extActionOnClicked = cb;
            }
          },
          setBadgeText: function(opts) {
            window.__extSetBadge(_extId, opts.text || '');
          }
        }
      };

      window.chrome = chrome;
      return chrome;
    })();
  `;
}

function injectContentScripts(webContents, url) {
  extensions.filter(e => e.enabled).forEach(ext => {
    const csList = ext.manifest.content_scripts || [];
    csList.forEach(cs => {
      const matches = cs.matches || [];
      if (!matches.some(m => matchPattern(m, url))) return;

      // Inject CSS
      (cs.css || []).forEach(cssFile => {
        try {
          const css = fs.readFileSync(path.join(ext.dir, cssFile), 'utf8');
          webContents.insertCSS(css);
        } catch(e) {}
      });

      // Inject JS
      (cs.js || []).forEach(jsFile => {
        try {
          const js = fs.readFileSync(path.join(ext.dir, jsFile), 'utf8');
          const wrapped = `
            (function() {
              const chrome = ${generateChromeAPI(ext.id)};
              ${js}
            })();
          `;
          webContents.executeJavaScript(wrapped).catch(() => {});
        } catch(e) {}
      });
    });
  });
}

function matchPattern(pattern, url) {
  if (pattern === '<all_urls>') return true;
  try {
    new URL(url);
    // Convert Chrome match pattern to regex
    let reStr = pattern;
    // Handle protocol part first (before * gets replaced by .*)
    if (reStr.startsWith('http://')) {
      reStr = '^http:\\/\\/' + reStr.slice(7);
    } else if (reStr.startsWith('https://')) {
      reStr = '^https:\\/\\/' + reStr.slice(8);
    } else if (reStr.startsWith('*://')) {
      reStr = '^.*:\\/\\/' + reStr.slice(4);
    }
    // Escape special regex chars (but not * which we want as wildcard)
    reStr = reStr.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
    // Replace remaining * with .*
    reStr = reStr.replace(/\*/g, '.*');
    return new RegExp(reStr, 'i').test(url);
  } catch(e) { return false; }
}

function saveExtensionsState() {
  const state = {};
  extensions.forEach(e => { state[e.id] = e.enabled; });
  saveJSON(extensionsStateFile, state);
}

// Extension IPC
ipcMain.handle('extensions-list', () => extensions.map(e => ({
  id: e.id,
  name: e.manifest.name || e.id,
  version: e.manifest.version || '0.0.1',
  description: e.manifest.description || '',
  enabled: e.enabled,
  hasBackground: !!e.manifest.background,
  contentScripts: (e.manifest.content_scripts || []).map(cs => ({
    matches: cs.matches || [],
    js: cs.js || [],
    css: cs.css || [],
  })),
})));

ipcMain.on('extension-toggle', (e, extId, enabled) => {
  const ext = extensions.find(x => x.id === extId);
  if (ext) {
    ext.enabled = enabled;
    saveExtensionsState();
    // Reload will be needed for content scripts to take effect
  }
});

ipcMain.on('extension-reload-all', () => {
  loadExtensions();
  // Notify renderer
  if (mainWindow) mainWindow.webContents.send('extensions-reloaded');
});

// Load extensions on startup
loadExtensions();

// Inject content scripts into webviews when they navigate
ipcMain.on('extension-inject-content', (e, webviewId, url) => {
  // Find the webview webContents - this runs from renderer
  // Content scripts are injected from renderer side
});

// Extension: read file for content script injection
ipcMain.handle('extension-read-file', (e, extId, filePath) => {
  const ext = extensions.find(x => x.id === extId);
  if (!ext) return null;
  try {
    const fullPath = path.join(ext.dir, filePath);
    if (fs.existsSync(fullPath)) {
      return fs.readFileSync(fullPath, 'utf8');
    }
  } catch(e) {}
  return null;
});

// Extension storage handlers
const extStorageFile = path.join(userDataPath, 'ext-storage.json');
ipcMain.handle('ext-storage-get', (e, extId, keys) => {
  const all = loadJSON(extStorageFile, {});
  const store = all[extId] || {};
  if (keys === null) return store;
  if (typeof keys === 'string') return { [keys]: store[keys] };
  if (Array.isArray(keys)) {
    const result = {};
    keys.forEach(k => { result[k] = store[k]; });
    return result;
  }
  return store;
});
ipcMain.on('ext-storage-set', (e, extId, items) => {
  const all = loadJSON(extStorageFile, {});
  if (!all[extId]) all[extId] = {};
  Object.assign(all[extId], items);
  saveJSON(extStorageFile, all);
});

// Get system info for settings
ipcMain.handle('get-system-info', () => ({
  platform: process.platform,
  version: app.getVersion(),
  electronVersion: process.versions.electron,
  chromiumVersion: process.versions.chrome,
  nodeVersion: process.versions.node,
  downloadsPath: getDownloadPath(),
  defaultDownloadsPath: downloadsPath,
  userDataPath,
  memory: Math.round(os.totalmem() / 1024 / 1024 / 1024) + ' GB',
  webviewPreload: path.join(__dirname, 'webview-preload.js'),
}));

// ===== AI (Transformers.js) =====
let _aiPipeline = null;
let _aiPipelinePromise = null;

async function getAIPipeline() {
  if (_aiPipeline) return _aiPipeline;
  if (_aiPipelinePromise) return _aiPipelinePromise;
  _aiPipelinePromise = (async () => {
    const { pipeline } = await import('@huggingface/transformers');
    _aiPipeline = await pipeline('text-generation', 'Xenova/Phi-3-mini-4k-instruct');
    return _aiPipeline;
  })();
  return _aiPipelinePromise;
}

// ===== WAVEPASS (Password Manager) =====
const passwordsFile = path.join(userDataPath, 'passwords.enc');
let _vaultKey = null; // Buffer: AES key derived from PIN, held in memory only

function deriveKey(pin, salt) {
  return crypto.pbkdf2Sync(pin, salt, 100000, 32, 'sha512');
}

function hashKey(key) {
  return crypto.createHash('sha256').update(key).digest('hex');
}

function encryptVault(data, key) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const plain = Buffer.from(JSON.stringify(data), 'utf8');
  const enc = Buffer.concat([cipher.update(plain), cipher.final()]);
  const tag = cipher.getAuthTag();
  return { iv: iv.toString('base64'), data: enc.toString('base64'), tag: tag.toString('base64') };
}

function decryptVault(encrypted, key) {
  try {
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(encrypted.iv, 'base64'));
    decipher.setAuthTag(Buffer.from(encrypted.tag, 'base64'));
    const dec = Buffer.concat([decipher.update(Buffer.from(encrypted.data, 'base64')), decipher.final()]);
    return JSON.parse(dec.toString('utf8'));
  } catch (_) { return null; }
}

ipcMain.handle('passwords-set-pin', (e, pin) => {
  const salt = crypto.randomBytes(32).toString('base64');
  const key = deriveKey(pin, Buffer.from(salt, 'base64'));
  const hash = hashKey(key);
  _vaultKey = key;
  const settings = loadJSON(settingsFile, {});
  settings.wavepass = { salt, hash };
  saveJSON(settingsFile, settings);
  // Reset vault on PIN change
  if (fs.existsSync(passwordsFile)) fs.unlinkSync(passwordsFile);
  return true;
});

ipcMain.handle('passwords-check-pin', (e, pin) => {
  const settings = loadJSON(settingsFile, {});
  const wp = settings.wavepass;
  if (!wp?.salt || !wp?.hash) return false;
  const key = deriveKey(pin, Buffer.from(wp.salt, 'base64'));
  if (hashKey(key) !== wp.hash) return false;
  _vaultKey = key;
  return true;
});

ipcMain.handle('passwords-is-unlocked', () => _vaultKey !== null);

ipcMain.handle('passwords-lock', () => { _vaultKey = null; return true; });

ipcMain.handle('passwords-has-pin', () => {
  const settings = loadJSON(settingsFile, {});
  return !!(settings.wavepass?.salt && settings.wavepass?.hash);
});

ipcMain.handle('passwords-get-all', () => {
  if (!_vaultKey) return [];
  if (!fs.existsSync(passwordsFile)) return [];
  try {
    const raw = JSON.parse(fs.readFileSync(passwordsFile, 'utf8'));
    const data = decryptVault(raw, _vaultKey);
    return data || [];
  } catch (_) { return []; }
});

ipcMain.handle('passwords-get-for-url', (e, url) => {
  if (!_vaultKey) return [];
  if (!fs.existsSync(passwordsFile)) return [];
  try {
    const raw = JSON.parse(fs.readFileSync(passwordsFile, 'utf8'));
    const data = decryptVault(raw, _vaultKey);
    if (!data) return [];
    const host = new URL(url).hostname;
    return data.filter(p => {
      try { return new URL(p.url).hostname === host; } catch(_) { return false; }
    });
  } catch (_) { return []; }
});

ipcMain.handle('passwords-save', (e, entry) => {
  if (!_vaultKey) return false;
  let data = [];
  if (fs.existsSync(passwordsFile)) {
    try {
      const raw = JSON.parse(fs.readFileSync(passwordsFile, 'utf8'));
      data = decryptVault(raw, _vaultKey) || [];
    } catch (_) { data = []; }
  }
  // Check for existing entry for same URL+username, update if found
  const idx = data.findIndex(p => p.url === entry.url && p.username === entry.username);
  const newEntry = { ...entry, id: Date.now().toString(), updated: new Date().toISOString() };
  if (idx >= 0) data[idx] = newEntry;
  else data.unshift(newEntry);
  const encrypted = encryptVault(data, _vaultKey);
  fs.writeFileSync(passwordsFile, JSON.stringify(encrypted));
  return true;
});

ipcMain.handle('passwords-delete', (e, id) => {
  if (!_vaultKey) return false;
  if (!fs.existsSync(passwordsFile)) return false;
  try {
    const raw = JSON.parse(fs.readFileSync(passwordsFile, 'utf8'));
    const data = decryptVault(raw, _vaultKey) || [];
    const filtered = data.filter(p => p.id !== id);
    const encrypted = encryptVault(filtered, _vaultKey);
    fs.writeFileSync(passwordsFile, JSON.stringify(encrypted));
    return true;
  } catch (_) { return false; }
});

ipcMain.handle('passwords-has-entry', (e, url, username) => {
  if (!_vaultKey) return false;
  if (!fs.existsSync(passwordsFile)) return false;
  try {
    const raw = JSON.parse(fs.readFileSync(passwordsFile, 'utf8'));
    const data = decryptVault(raw, _vaultKey) || [];
    return data.some(p => p.url === url && p.username === username);
  } catch (_) { return false; }
});

ipcMain.handle('ai-load-model', async () => {
  await getAIPipeline();
  return true;
});

ipcMain.handle('ai-generate', async (event, prompt, options) => {
  const pipe = await getAIPipeline();
  const result = await pipe(prompt, options || {
    max_new_tokens: 300,
    temperature: 0.3,
    top_p: 0.9,
    do_sample: true,
    repetition_penalty: 1.1,
  });
  return result;
});

// ===== TAB GROUPS =====
ipcMain.handle('tab-groups-get', () => loadJSON(tabGroupsFile, {}));
ipcMain.on('tab-groups-save', (e, groups) => {
  saveJSON(tabGroupsFile, groups);
});

// ===== CLIPBOARD MANAGER =====
let clipboardHistory = loadJSON(clipboardFile, []);
let _lastClipboard = clipboard.readText();

function pollClipboard() {
  const text = clipboard.readText();
  if (text && text !== _lastClipboard && text.trim().length > 0) {
    _lastClipboard = text;
    const entry = {
      id: Date.now().toString(),
      text: text.length > 5000 ? text.slice(0, 5000) : text,
      preview: text.slice(0, 120).replace(/\n/g, ' '),
      timestamp: new Date().toISOString(),
      pinned: false,
    };
    clipboardHistory.unshift(entry);
    clipboardHistory = clipboardHistory.slice(0, 200);
    saveJSON(clipboardFile, clipboardHistory);
    if (mainWindow) {
      try { mainWindow.webContents.send('clipboard-new-entry', entry); } catch (_) {}
    }
  }
}
setInterval(pollClipboard, 1000);

ipcMain.handle('clipboard-get-history', () => clipboardHistory);
ipcMain.on('clipboard-copy', (e, text) => {
  clipboard.writeText(text);
});
ipcMain.on('clipboard-delete', (e, id) => {
  clipboardHistory = clipboardHistory.filter(c => c.id !== id);
  saveJSON(clipboardFile, clipboardHistory);
});
ipcMain.on('clipboard-pin', (e, id) => {
  const entry = clipboardHistory.find(c => c.id === id);
  if (entry) entry.pinned = !entry.pinned;
  saveJSON(clipboardFile, clipboardHistory);
});
ipcMain.on('clipboard-clear', (e, unpinnedOnly) => {
  if (unpinnedOnly) {
    clipboardHistory = clipboardHistory.filter(c => c.pinned);
  } else {
    clipboardHistory = [];
  }
  saveJSON(clipboardFile, clipboardHistory);
});

// ===== PERFORMANCE MONITOR =====
let _perfHistory = [];
function collectPerfStats() {
  const mem = process.memoryUsage();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const cpus = os.cpus();
  const loadAvg = os.loadavg();
  const stats = {
    timestamp: Date.now(),
    electron: {
      rss: mem.rss,
      heapUsed: mem.heapUsed,
      heapTotal: mem.heapTotal,
      external: mem.external,
    },
    system: {
      totalMem,
      freeMem,
      usedMem: totalMem - freeMem,
      memPercent: ((totalMem - freeMem) / totalMem * 100).toFixed(1),
      cpuModel: cpus[0]?.model || 'Unknown',
      cpuCores: cpus.length,
      loadAvg1: loadAvg[0].toFixed(2),
      loadAvg5: loadAvg[1].toFixed(2),
      loadAvg15: loadAvg[2].toFixed(2),
      uptime: os.uptime(),
      platform: os.platform(),
      arch: os.arch(),
    },
  };
  _perfHistory.push(stats);
  if (_perfHistory.length > 60) _perfHistory.shift();
  return stats;
}
setInterval(collectPerfStats, 2000);

ipcMain.handle('perf-get-stats', () => collectPerfStats());
ipcMain.handle('perf-get-history', () => _perfHistory);

// ===== USER SCRIPTS =====
ipcMain.handle('userscripts-get', () => loadJSON(userScriptsFile, []));
ipcMain.on('userscripts-save', (e, scripts) => {
  saveJSON(userScriptsFile, scripts);
});
ipcMain.on('userscripts-inject', async (e, webviewId, url) => {
  const scripts = loadJSON(userScriptsFile, []).filter(s => s.enabled && !s.deleted);
  const matches = scripts.filter(s => {
    if (!s.pattern || s.pattern === '*') return true;
    try {
      const pattern = s.pattern.replace(/\*/g, '.*');
      return new RegExp('^' + pattern + '$', 'i').test(url);
    } catch (_) { return false; }
  });
  if (matches.length === 0) return;
  try {
    const wc = webContents.fromId(webviewId);
    if (!wc) return;
    for (const s of matches) {
      if (s.type === 'css') {
        wc.insertCSS(s.code).catch(() => {});
      } else {
        wc.executeJavaScript(s.code).catch(() => {});
      }
    }
  } catch (_) {}
});
