// === POPUP WINDOW STEALTH ===
// Auth / social-login popups are real BrowserWindows (not webviews). Hide
// Electron automation fingerprints so Google & co. don't refuse the login,
// while keeping cross-session cookie sharing intact.
try {
  Object.defineProperty(navigator, 'webdriver', { get: () => false });
  delete navigator.__proto__.webdriver;

  Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });

  if (!window.chrome) window.chrome = {};
  if (!window.chrome.runtime) {
    window.chrome.runtime = { connect() {}, sendMessage() {} };
  }

  if (!window.chrome.csi) {
    window.chrome.csi = () => {};
  }
  if (!window.chrome.loadTimes) {
    window.chrome.loadTimes = () => {};
  }

  Object.defineProperty(navigator, 'plugins', {
    get: () => {
      const plugins = [
        { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
        { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai', description: '' },
        { name: 'Native Client', filename: 'internal-nacl-plugin', description: '' },
      ];
      plugins.length = 3;
      return plugins;
    },
  });

  Object.defineProperty(navigator, 'platform', { get: () => 'Win32' });
} catch (_) {}