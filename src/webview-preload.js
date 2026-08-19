const { ipcRenderer } = require('electron');

// === MOUSE NAV ===
document.addEventListener('mouseup', (e) => {
  if (e.button === 3 || e.button === 4) {
    ipcRenderer.sendToHost('mouse-nav', e.button);
  }
});

// === CTRL+SCROLL ZOOM ===
document.addEventListener('wheel', (e) => {
  if (!e.ctrlKey) return;
  e.preventDefault();
  e.stopPropagation();
  const delta = e.deltaY > 0 ? -0.1 : 0.1;
  ipcRenderer.sendToHost('zoom', delta);
}, { passive: false });

// === STEALTH: Hide Electron from websites ===
try {
  // navigator.webdriver = false
  Object.defineProperty(navigator, 'webdriver', { get: () => false });

  // navigator.languages
  Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });

  // window.chrome object (sites check this to verify real Chrome)
  if (!window.chrome) {
    window.chrome = {};
  }
  if (!window.chrome.runtime) {
    window.chrome.runtime = {
      connect: function() {},
      sendMessage: function() {},
    };
  }

  // navigator.plugins — fake a few common Chrome plugins
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

  // navigator.platform
  Object.defineProperty(navigator, 'platform', { get: () => 'Win32' });

  // Override permissions query for notifications (some sites check this)
  const origQuery = window.Notification?.permission ? Notification.permission : 'default';
  if (window.Notification) {
    Object.defineProperty(Notification, 'permission', { get: () => origQuery });
  }

  // Remove automation-related properties
  delete navigator.__proto__.webdriver;
} catch (_) {}
