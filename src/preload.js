const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Window
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  toggleFullscreen: () => ipcRenderer.send('window-toggle-fullscreen'),
  isFullscreen: () => ipcRenderer.invoke('window-is-fullscreen'),

  // History
  historyGet: () => ipcRenderer.invoke('history-get'),
  historyAdd: (entry) => ipcRenderer.send('history-add', entry),
  historyClear: () => ipcRenderer.send('history-clear'),

  // Bookmarks
  bookmarksGet: () => ipcRenderer.invoke('bookmarks-get'),
  bookmarksAdd: (bm) => ipcRenderer.send('bookmarks-add', bm),
  bookmarksRemove: (url) => ipcRenderer.send('bookmarks-remove', url),
  bookmarksExport: () => ipcRenderer.invoke('bookmarks-export'),
  bookmarksImport: () => ipcRenderer.invoke('bookmarks-import'),

  // Downloads
  downloadsGet: () => ipcRenderer.invoke('downloads-get'),
  downloadsClear: () => ipcRenderer.send('downloads-clear'),
  downloadsDeleteOne: (id) => ipcRenderer.send('downloads-delete-one', id),
  openFile: (p) => ipcRenderer.send('open-file', p),
  showInFolder: (p) => ipcRenderer.send('show-in-folder', p),
  downloadPause: (id) => ipcRenderer.send('download-pause', id),
  downloadResume: (id) => ipcRenderer.send('download-resume', id),
  downloadCancel: (id) => ipcRenderer.send('download-cancel', id),
  screenshotSave: (data) => ipcRenderer.invoke('screenshot-save', data),

  // Clear browsing data
  clearBrowsingData: (types) => ipcRenderer.invoke('clear-browsing-data', types),

  // Settings
  settingsGet: () => ipcRenderer.invoke('settings-get'),
  settingsSet: (s) => ipcRenderer.send('settings-set', s),
  selectDownloadPath: () => ipcRenderer.invoke('select-download-path'),

  // Context menu
  showContextMenu: (params) => ipcRenderer.send('show-context-menu', params),
  contextMenuAction: (action, arg) => ipcRenderer.send('context-menu-action', action, arg),
  registerWebview: (id) => ipcRenderer.send('register-webview', id),

  // System info
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),

  // Sessions
  sessionsList: () => ipcRenderer.invoke('sessions-list'),
  sessionGet: (id) => ipcRenderer.invoke('session-get', id),
  sessionSave: (s) => ipcRenderer.send('session-save', s),
  sessionDelete: (id) => ipcRenderer.send('session-delete', id),
  sessionSaveLast: (d) => ipcRenderer.send('session-save-last', d),
  sessionGetLast: () => ipcRenderer.invoke('session-get-last'),

  // AdBlock
  adblockStats: () => ipcRenderer.invoke('adblock-stats'),
  adblockResetStats: () => ipcRenderer.send('adblock-reset-stats'),
  adblockWhitelistGet: () => ipcRenderer.invoke('adblock-whitelist-get'),
  adblockWhitelistAdd: (d) => ipcRenderer.send('adblock-whitelist-add', d),
  adblockWhitelistRemove: (d) => ipcRenderer.send('adblock-whitelist-remove', d),
  adblockCustomFilters: () => ipcRenderer.invoke('adblock-custom-filters'),
  adblockCustomFilterAdd: (f) => ipcRenderer.send('adblock-custom-filter-add', f),
  adblockCustomFilterRemove: (f) => ipcRenderer.send('adblock-custom-filter-remove', f),
  adblockSetEnabled: (e) => ipcRenderer.send('adblock-set-enabled', e),
  adblockFilterCount: () => ipcRenderer.invoke('adblock-filter-count'),
  adblockSubscriptionsGet: () => ipcRenderer.invoke('adblock-subscriptions-get'),
  adblockSubscriptionAdd: (data) => ipcRenderer.invoke('adblock-subscription-add', data),
  adblockSubscriptionRemove: (id) => ipcRenderer.send('adblock-subscription-remove', id),
  adblockSubscriptionToggle: (id, enabled) => ipcRenderer.send('adblock-subscription-toggle', { id, enabled }),
  adblockSubscriptionUpdate: (id) => ipcRenderer.invoke('adblock-subscription-update', id),
  adblockSubscriptionsUpdateAll: () => ipcRenderer.invoke('adblock-subscriptions-update-all'),

  // Extensions
  extensionsList: () => ipcRenderer.invoke('extensions-list'),
  extensionToggle: (id, en) => ipcRenderer.send('extension-toggle', id, en),
  extensionReloadAll: () => ipcRenderer.send('extension-reload-all'),
  extStorageGet: (id, keys) => ipcRenderer.invoke('ext-storage-get', id, keys),
  extStorageSet: (id, items) => ipcRenderer.send('ext-storage-set', id, items),
  extensionReadFile: (extId, filePath) => ipcRenderer.invoke('extension-read-file', extId, filePath),

  // AI
  aiLoadModel: () => ipcRenderer.invoke('ai-load-model'),
  aiGenerate: (prompt, options) => ipcRenderer.invoke('ai-generate', prompt, options),

  // WavePass
  passwordsSetPin: (pin) => ipcRenderer.invoke('passwords-set-pin', pin),
  passwordsCheckPin: (pin) => ipcRenderer.invoke('passwords-check-pin', pin),
  passwordsIsUnlocked: () => ipcRenderer.invoke('passwords-is-unlocked'),
  passwordsLock: () => ipcRenderer.invoke('passwords-lock'),
  passwordsActivity: () => ipcRenderer.invoke('passwords-activity'),
  passwordsHasPin: () => ipcRenderer.invoke('passwords-has-pin'),
  passwordsGetAll: () => ipcRenderer.invoke('passwords-get-all'),
  passwordsGetForUrl: (url) => ipcRenderer.invoke('passwords-get-for-url', url),
  passwordsSave: (entry) => ipcRenderer.invoke('passwords-save', entry),
  passwordsDelete: (id) => ipcRenderer.invoke('passwords-delete', id),
  passwordsHasEntry: (url, username) => ipcRenderer.invoke('passwords-has-entry', url, username),

  // Tab Groups
  tabGroupsGet: () => ipcRenderer.invoke('tab-groups-get'),
  tabGroupsSave: (groups) => ipcRenderer.send('tab-groups-save', groups),

  // Clipboard Manager
  clipboardGetHistory: () => ipcRenderer.invoke('clipboard-get-history'),
  clipboardCopy: (text) => ipcRenderer.send('clipboard-copy', text),
  clipboardDelete: (id) => ipcRenderer.send('clipboard-delete', id),
  clipboardPin: (id) => ipcRenderer.send('clipboard-pin', id),
  clipboardClear: (unpinnedOnly) => ipcRenderer.send('clipboard-clear', unpinnedOnly),

  // Performance Monitor
  perfGetStats: () => ipcRenderer.invoke('perf-get-stats'),
  perfGetHistory: () => ipcRenderer.invoke('perf-get-history'),

  // User Scripts
  userScriptsGet: () => ipcRenderer.invoke('userscripts-get'),
  userScriptsSave: (scripts) => ipcRenderer.send('userscripts-save', scripts),
  userScriptsInject: (webviewId, url) => ipcRenderer.send('userscripts-inject', webviewId, url),

  // Tab Preview
  capturePage: (webviewId) => ipcRenderer.invoke('capture-page', webviewId),

  // Auto Updater
  updateCheck: () => ipcRenderer.send('update-check'),
  updateDownload: () => ipcRenderer.send('update-download'),
  updateInstall: () => ipcRenderer.send('update-install'),

  // Events from main
  on: (channel, cb) => {
    const allowed = [
      'download-started', 'download-progress', 'download-completed', 'download-failed',
      'open-link-newtab', 'search-selection', 'nav-back', 'nav-forward', 'nav-reload',
      'save-page', 'print-page', 'view-source', 'inspect-element', 'save-image',
      'before-quit-save', 'ad-blocked', 'extensions-reloaded', 'save-to-reading-list', 'show-context-menu-renderer', 'fullscreen-changed',
      'clipboard-new-entry',
      'adblock-subs-changed', 'adblock-sub-status',
      'update-checking', 'update-available', 'update-not-available', 'update-download-progress', 'update-downloaded', 'update-error',
      'ai-download-progress',
      'passwords-locked',
    ];
    if (allowed.includes(channel)) {
      ipcRenderer.on(channel, (event, ...args) => cb(...args));
    }
  },
});
