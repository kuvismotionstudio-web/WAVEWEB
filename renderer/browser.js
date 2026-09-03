// ===== WAVEWEB Browser =====
'use strict';

// ===== DOM REFS =====
const $ = id => document.getElementById(id);
const tabsContainer = $('tabs-container');
const webviewContainer = $('webview-container');
const newtabPage = $('newtab-page');
const urlBar = $('url-bar');
const securityIcon = $('security-icon');
const loadingBar = $('loading-bar');
const urlTooltip = $('url-tooltip');
const findBar = $('find-bar');
const findInput = $('find-input');
const findCount = $('find-count');
const zoomIndicator = $('zoom-indicator');

const btnBack = $('btn-back');
const btnForward = $('btn-forward');
const btnReload = $('btn-reload');
const btnHome = $('btn-home');
const btnBookmarkPage = $('btn-bookmark-page');
const btnDownloads = $('btn-downloads');
const btnHistory = $('btn-history');
const btnBookmarksPanel = $('btn-bookmarks-panel');
const btnAISidebar = $('btn-ai-sidebar');
const btnSettings = $('btn-settings');
const dlBadge = $('dl-badge');
const btnClipboard = $('btn-clipboard');
const btnPerf = $('btn-perf');
const btnScripts = $('btn-scripts');

// Panels
const panelDownloads = $('panel-downloads');
const panelPasswords = $('panel-passwords');
const btnPasswords = $('btn-passwords');
const panelHistory = $('panel-history');
const panelBookmarks = $('panel-bookmarks');
const panelSettingsEl = $('panel-settings');
const aiSidebar = $('ai-sidebar');

const PANELS = {
  downloads: panelDownloads,
  passwords: panelPasswords,
  history: panelHistory,
  bookmarks: panelBookmarks,
  settings: panelSettingsEl,
  'ai-sidebar': aiSidebar,
  clipboard: $('panel-clipboard'),
  perf: $('panel-perf'),
  scripts: $('panel-scripts'),
};

// ===== STATE =====
let tabs = [];
let activeTabId = null;
let activePanel = null;
let aiModel = 'local';
let aiPipeline = null;
let aiLoading = false;
let settings = { adBlock: true, saveHistory: true, searchEngine: 'google', homepage: '', zoom: 1, showBookmarksBar: false, safetyScreen: true };
let adsBlockedCount = parseInt(localStorage.getItem('ww_ads_blocked') || '0');
let zoomHideTimeout;
let _webviewPreloadPath = null;
let activeDownloads = {};
let downloadHistoryCount = 0;
let closedTabs = JSON.parse(localStorage.getItem('ww_closed_tabs') || '[]');

// ===== SEARCH ENGINES =====
const SEARCH_ENGINES = {
  google: 'https://www.google.com/search?q=',
  bing: 'https://www.bing.com/search?q=',
  duckduckgo: 'https://duckduckgo.com/?q=',
  brave: 'https://search.brave.com/search?q=',
  ecosia: 'https://www.ecosia.org/search?q=',
};

// ===== SAFETY SCREEN =====
const SAFETY_CATEGORIES = {
  adult: {
    icon: '🔞',
    title: 'Wykryto treści dla dorosłych',
    reason: 'Ta strona zawiera treści dla dorosłych, które mogą nie być odpowiednie dla wszystkich odbiorców.',
    domains: [
      'pornhub.com', 'xvideos.com', 'xnxx.com', 'xhamster.com', 'redtube.com',
      'youporn.com', 'brazzers.com', 'bangbros.com', 'realitykings.com', 'mofos.com',
      'naughtyamerica.com', 'digitalplayground.com', 'team-skeet.com', 'blacked.com',
      'briansclub.cm', 'onlyfans.com', 'fansly.com', 'manyvids.com', 'chaturbate.com',
      'stripchat.com', 'bongacams.com', 'livejasmin.com', 'camsoda.com', 'flirt4free.com',
      'spankbang.com', 'eporner.com', 'tube8.com', 'tnaflix.com', 'porntube.com',
      'fuq.com', 'youjizz.com', 'beeg.com', 'daftsex.com', 'sxyprn.com',
      'hentaihaven.xxx', 'nhentai.net', 'hanime.tv', 'hentaidude.com', 'hentai-manga.org',
      'pornoxo.com', 'thumbzilla.com', 'xtube.com', 'tnaflix.com', 'youporn.com',
      'motherless.com', 'efukt.com', 'bestgore.com', 'rule34.xxx', 'e621.net',
    ],
  },
  gambling: {
    icon: '🎰',
    title: 'Wykryto witrynę hazardową',
    reason: 'Ta strona wydaje się być platformą hazardową online. Hazard może być uzależniający i powodować szkody finansowe.',
    domains: [
      'bet365.com', 'paddypower.com', 'williamhill.com', 'ladbrokes.com', 'coral.co.uk',
      'betfair.com', 'skybet.com', 'bwin.com', 'unibet.com', 'betway.com',
      '888.com', '888casino.com', '888sport.com', 'pokerstars.com', 'partypoker.com',
      'partycasino.com', 'casumo.com', 'leovegas.com', 'mr-green.com', 'royal-panda.com',
      'casino.com', 'slotomania.com', 'chumba-casino.com', 'luckynuggetcasino.com',
      'roobet.com', 'stake.com', 'stake.us', 'bc.game', 'rollbit.com',
      'bitstarz.com', 'mbitcasino.com', 'cloudbet.com', 'fortunejack.com',
      'draftkings.com', 'fanduel.com', 'betmgm.com', 'caesarscasino.com',
      'wynnbet.com', 'barstoolsportsbook.com', 'pointsbet.com',
      'ggpoker.com', 'wsop.com', 'globalpoker.com', 'clubwpt.com',
    ],
  },
  phishing: {
    icon: '🎣',
    title: 'Wykryto witrynę phishingową / oszustwo',
    reason: 'Ta strona została zidentyfikowana jako potencjalne oszustwo phishingowe. Podawanie danych osobowych może zagrażać Twojemu bezpieczeństwu.',
    domains: [
      'paypa1.com', 'g00gle.com', 'amaz0n.com', 'appld.com', 'micr0soft.com',
      'faceb00k.com', 'tw1tter.com', '1nstagram.com', 'linkedln.com',
      'secure-bankofamerica.com', 'verify-paypal.com', 'apple-id-verify.com',
      'account-chase.com', 'signin-wellsfargo.com', 'secure-citibank.com',
      'login-coinbase.com', 'verify-crypto.com', 'blockchain-wallet.com',
      'free-iphone.com', 'free-giftcards.com', 'congratulations-you-won.com',
      'nigerianprince.com', 'lotterywinner.com', 'claim-reward.com',
    ],
  },
  malware: {
    icon: '🦠',
    title: 'Wykryto złośliwą / niebezpieczną witrynę',
    reason: 'Ta strona jest znana z rozpowszechniania złośliwego oprogramowania lub innych zagrożeń bezpieczeństwa.',
    domains: [
      'cracksnow.com', 'keygenguru.com', 'warezworld.com', 'piratebaymirror.com',
      'megaupload-link.com', 'rapidshare-hack.com', 'free-torrents.com',
      'crackzip.com', 'serialkeysoftware.com', 'freeactivators.com',
    ],
  },
  drugs: {
    icon: '💊',
    title: 'Wykryto witrynę z nielegalnymi substancjami',
    reason: 'Ta strona wydaje się być związana ze sprzedażą lub dystrybucją nielegalnych substancji.',
    domains: [
      'silkroad.com', 'silkroad6berutulxyl.onion', 'dreammarket.com',
      'wallstreetmarket.com', 'dark0de.com', 'versus-market.com',
    ],
  },
};

const _safetyWhitelisted = new Set();

function checkSafetyScreen(url) {
  if (!settings.safetyScreen) return null;
  try {
    const hostname = new URL(url).hostname.toLowerCase().replace(/^www\./, '');
    for (const [category, data] of Object.entries(SAFETY_CATEGORIES)) {
      if (_safetyWhitelisted.has(hostname)) continue;
      for (const domain of data.domains) {
        if (hostname === domain || hostname.endsWith('.' + domain)) {
          return { category, ...data, url };
        }
      }
    }
  } catch (_) {}
  return null;
}

function showSafetyScreen(info) {
  const el = $('safety-screen');
  if (!el) return;
  $('safety-icon').textContent = info.icon;
  $('safety-title').textContent = info.title;
  $('safety-reason').textContent = info.reason;
  $('safety-url').textContent = info.url;
  el.classList.remove('hidden');
  el._safetyUrl = info.url;
  el._safetyDomain = (() => { try { return new URL(info.url).hostname; } catch(_) { return ''; } })();
}

function hideSafetyScreen() {
  const el = $('safety-screen');
  if (el) el.classList.add('hidden');
}

function initSafetyScreen() {
  const el = $('safety-screen');
  if (!el) return;
  $('safety-go-back').addEventListener('click', () => {
    hideSafetyScreen();
    const tab = tabs.find(t => t.id === activeTabId);
    if (tab?.webview) {
      try { if (tab.webview.canGoBack()) tab.webview.goBack(); else tab.webview.src = 'about:blank'; } catch(_) {}
    }
  });
  $('safety-proceed').addEventListener('click', () => {
    const domain = el._safetyDomain;
    if (domain) _safetyWhitelisted.add(domain);
    hideSafetyScreen();
  });
}
initSafetyScreen();

// ===== FILE TYPE ICONS =====
const FILE_ICONS = {
  pdf: '📄', zip: '🗜️', rar: '🗜️', '7z': '🗜️', tar: '🗜️', gz: '🗜️',
  mp3: '🎵', wav: '🎵', flac: '🎵', ogg: '🎵', m4a: '🎵',
  mp4: '🎬', mkv: '🎬', avi: '🎬', mov: '🎬', webm: '🎬',
  jpg: '🖼️', jpeg: '🖼️', png: '🖼️', gif: '🖼️', webp: '🖼️', svg: '🖼️',
  exe: '⚙️', msi: '⚙️', dmg: '💿', pkg: '📦', deb: '📦', rpm: '📦',
  doc: '📝', docx: '📝', xls: '📊', xlsx: '📊', ppt: '📊', pptx: '📊',
  txt: '📃', json: '📋', xml: '📋', csv: '📊',
  js: '🟨', ts: '🔷', py: '🐍', java: '☕',
};

function getFileIcon(filename) {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  return FILE_ICONS[ext] || '📎';
}

function formatBytes(bytes) {
  if (!bytes) return '—';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB';
  return (bytes / 1073741824).toFixed(2) + ' GB';
}

function formatSpeed(bps) {
  if (!bps) return '';
  if (bps < 1024) return bps + ' B/s';
  if (bps < 1048576) return (bps / 1024).toFixed(0) + ' KB/s';
  return (bps / 1048576).toFixed(1) + ' MB/s';
}

function timeAgo(dateStr) {
  const d = new Date(dateStr);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
  if (diff < 604800) return Math.floor(diff / 86400) + 'd ago';
  return d.toLocaleDateString();
}

// ===== GENERATE ID =====
const fallbackFavicon = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Ccircle cx='12' cy='12' r='9' fill='%23444'/%3E%3C/svg%3E";
function uid() {
  return Math.random().toString(36).slice(2, 11);
}

// ===== DARK MODE FOR WEBSITES =====
const DARK_MODE_CSS = `
html { filter: invert(0.88) hue-rotate(180deg) !important; }
img, video, canvas, svg, iframe, embed, object, [style*="background-image"] { filter: invert(1) hue-rotate(180deg) !important; }
`;

function applyDarkMode(wv) {
  if (!wv || !settings.darkMode) return;
  try {
    wv.executeJavaScript(`
      (function() {
        let style = document.getElementById('ww-dark-mode');
        if (style) return;
        style = document.createElement('style');
        style.id = 'ww-dark-mode';
        style.textContent = ${JSON.stringify(DARK_MODE_CSS)};
        document.documentElement.appendChild(style);
      })();
    `);
  } catch (_) {}
}

function removeDarkMode(wv) {
  if (!wv) return;
  try {
    wv.executeJavaScript(`
      document.getElementById('ww-dark-mode')?.remove();
    `);
  } catch (_) {}
}

// ===== CALCULATOR =====
function calcMath(expr) {
  // Only safe chars
  if (!/^[\d+\-*/.()%^ ,e]+$/.test(expr.trim())) return null;
  // Must contain at least one operator
  if (!/[+\-*/%^]/.test(expr)) return null;
  try {
    const sanitized = expr.replace(/\^/g, '**').replace(/,/g, '.');
    const result = Function('"use strict"; return (' + sanitized + ')')();
    if (typeof result === 'number' && isFinite(result)) {
      return Number.isInteger(result) ? result : parseFloat(result.toFixed(4));
    }
  } catch (_) {}
  return null;
}

// ===== SETTINGS INIT =====
async function initSettings() {
  const s = await window.electronAPI.settingsGet();
  settings = { ...settings, ...s };

  $('setting-search-engine').value = settings.searchEngine || 'google';
  $('setting-homepage').value = settings.homepage || '';
  $('setting-adblock').checked = settings.adBlock !== false;
  $('setting-history').checked = settings.saveHistory !== false;
  $('setting-show-bookmarks-bar').checked = settings.showBookmarksBar === true;
  $('setting-clear-on-exit').checked = settings.clearOnExit === true;
  $('setting-zoom').value = settings.zoom || 1;
  $('setting-dark-mode').checked = settings.darkMode === true;
  $('setting-safety-screen').checked = settings.safetyScreen !== false;

  // Download path
  updateDownloadPathLabel(settings.downloadPath);

  // System info
  try {
    const info = await window.electronAPI.getSystemInfo();
    _webviewPreloadPath = (info && info.webviewPreload) || null;
    const infoEl = $('system-info-content');
    const rows = [
      ['Wersja', '1.0.0'],
      ['Electron', (info && info.electronVersion) || 'nieznane'],
      ['Chromium', (info && info.chromiumVersion) || 'nieznane'],
      ['Node', (info && info.nodeVersion) || 'nieznane'],
      ['Platforma', (info && info.platform) || 'nieznane'],
      ['RAM', (info && info.memory) || 'nieznane'],
      ['Katalog pobierania', (info && info.downloadsPath) || 'nieznane'],
    ];
    if (infoEl) {
      infoEl.innerHTML = rows.map(([k, v]) =>
        `<div class="system-info-row"><span>${k}</span><span>${v}</span></div>`
      ).join('');
    }
  } catch (_) {}
}

function saveSettings() {
  settings.searchEngine = $('setting-search-engine').value;
  settings.homepage = $('setting-homepage').value;
  settings.adBlock = $('setting-adblock').checked;
  settings.saveHistory = $('setting-history').checked;
  settings.clearOnExit = $('setting-clear-on-exit').checked;
  settings.showBookmarksBar = $('setting-show-bookmarks-bar').checked;
  settings.zoom = parseFloat($('setting-zoom').value);
  settings.aiModel = $('setting-ai-model').value;
  settings.darkMode = $('setting-dark-mode').checked;
  settings.safetyScreen = $('setting-safety-screen').checked;
  window.electronAPI.settingsSet(settings);
  loadBookmarksBar();
  // Apply/remove dark mode from all webviews
  tabs.forEach(t => {
    if (settings.darkMode) applyDarkMode(t.webview);
    else removeDarkMode(t.webview);
  });
}

// Auto-save settings on change
document.querySelectorAll('#settings-content select, #settings-content input[type=checkbox]')
  .forEach(el => el.addEventListener('change', saveSettings));

$('setting-homepage').addEventListener('blur', saveSettings);

function updateDownloadPathLabel(path) {
  const label = $('download-path-label');
  if (!label) return;
  if (path) {
    const parts = path.replace(/\\/g, '/').split('/');
    const short = parts.length > 2 ? '.../' + parts.slice(-2).join('/') : path;
    label.textContent = short;
    label.title = path;
  } else {
    label.textContent = 'Domyślny folder pobierania';
    label.title = '';
  }
}

$('btn-change-download-path').addEventListener('click', async () => {
  const chosen = await window.electronAPI.selectDownloadPath();
  if (chosen) {
    settings.downloadPath = chosen;
    updateDownloadPathLabel(chosen);
    saveSettings();
  }
});

// Settings search & category filter
$('settings-search')?.addEventListener('input', function () {
  const q = this.value.toLowerCase().trim();
  const activeCat = document.querySelector('.set-cat.active')?.dataset.cat || 'general';
  document.querySelectorAll('.settings-section').forEach(section => {
    const catMatch = activeCat === 'all' || section.dataset.category === activeCat;
    if (!q) {
      section.classList.toggle('hidden-by-search', false);
      section.classList.toggle('hidden-by-cat', !catMatch);
      return;
    }
    const text = section.textContent.toLowerCase();
    const matches = text.includes(q);
    section.classList.toggle('hidden-by-search', !matches);
    section.classList.toggle('hidden-by-cat', !catMatch && !matches);
  });
});

// Category tabs
document.querySelectorAll('.set-cat').forEach(btn => {
  btn.addEventListener('click', function () {
    document.querySelectorAll('.set-cat').forEach(b => b.classList.remove('active'));
    this.classList.add('active');
    const cat = this.dataset.cat;
    document.querySelectorAll('.settings-section').forEach(section => {
      const match = cat === 'all' || section.dataset.category === cat;
      section.classList.toggle('hidden-by-cat', !match);
      section.classList.toggle('hidden-by-search', false);
    });
    // Clear search
    if ($('settings-search')) $('settings-search').value = '';
  });
});

// Accent color picker
document.querySelectorAll('.accent-opt').forEach(btn => {
  btn.addEventListener('click', function () {
    document.querySelectorAll('.accent-opt').forEach(b => b.classList.remove('active'));
    this.classList.add('active');
    const color = this.dataset.color;
    document.documentElement.style.setProperty('--accent', '#' + color);
    localStorage.setItem('ww_accent_color', color);
    // Also update accent2 to a complementary shade
    const complement = color === '6c63ff' ? 'ff4444' :
                       color === '0078d4' ? '4dc9f6' :
                       color === '00d4a0' ? 'ff1a35' :
                       color === 'ff1a35' ? 'ff8844' :
                       color === 'ff8844' ? 'ffd060' :
                       color === 'ffd060' ? 'ff8844' : 'ff4444';
    document.documentElement.style.setProperty('--accent2', '#' + complement);
  });
});

// Load saved accent color
const savedAccent = localStorage.getItem('ww_accent_color');
if (savedAccent) {
  document.documentElement.style.setProperty('--accent', '#' + savedAccent);
  document.querySelectorAll('.accent-opt').forEach(b => {
    b.classList.toggle('active', b.dataset.color === savedAccent);
  });
}

// ===== CLOCK =====
function updateClock() {
  const now = new Date();
  const h = now.getHours().toString().padStart(2, '0');
  const m = now.getMinutes().toString().padStart(2, '0');
  const s = now.getSeconds().toString().padStart(2, '0');
  const date = now.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
  const clockEl = $('newtab-clock');
  if (clockEl) {
    clockEl.innerHTML = `<span class="clock-time"><span class="clock-hh">${h}</span><span class="clock-colon">:</span><span class="clock-mm">${m}</span><span class="clock-sec">${s}</span></span><span class="clock-date">${esc(date)}</span>`;
  }
}
updateClock();
setInterval(updateClock, 1000);

// ===== STATS =====
function updateStats() {
  const blockedEl = $('stat-blocked-count');
  const tabsEl = $('stat-tabs-count');
  if (blockedEl) blockedEl.textContent = adsBlockedCount;
  if (tabsEl) tabsEl.textContent = tabs.length;
  // Update newtab widgets
  const wBlocked = $('widget-blocked-count');
  const wTabs = $('widget-tab-count');
  if (wBlocked) wBlocked.textContent = adsBlockedCount;
  if (wTabs) wTabs.textContent = tabs.length;
}

// ===== TOP SITES =====
const DEFAULT_SITES = [
  { url: 'https://google.com', title: 'Google', icon: 'G', cl: 'ql-g' },
  { url: 'https://youtube.com', title: 'YouTube', icon: '▶', cl: 'ql-yt' },
  { url: 'https://github.com', title: 'GitHub', icon: '<svg width=20 height=20 viewBox="0 0 24 24" fill=currentColor><path d="M12 2C6.48 2 2 6.48 2 12c0 4.42 2.87 8.17 6.84 9.5.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.1-1.47-1.1-1.47-.9-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.89 1.52 2.34 1.08 2.91.83.09-.65.35-1.08.63-1.33-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02A9.56 9.56 0 0 1 12 6.8c.85 0 1.71.11 2.51.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.69-4.57 4.93.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10.01 10.01 0 0 0 22 12c0-5.52-4.48-10-10-10z"/></svg>', cl: 'ql-gh' },
  { url: 'https://chatgpt.com', title: 'ChatGPT', icon: 'AI', cl: 'ql-ai' },
  { url: 'https://x.com', title: 'X', icon: '𝕏', cl: 'ql-x' },
  { url: 'https://reddit.com', title: 'Reddit', icon: 'R', cl: 'ql-rd' },
  { url: 'https://wikipedia.org', title: 'Wikipedia', icon: 'W', cl: 'ql-wp' },
  { url: 'https://netflix.com', title: 'Netflix', icon: 'N', cl: 'ql-nf' },
];

function getPinnedSites() {
  const raw = localStorage.getItem('ww_pinned_sites');
  if (raw) {
    try { return JSON.parse(raw); } catch(_) {}
  }
  return [...DEFAULT_SITES];
}

function savePinnedSites(sites) {
  localStorage.setItem('ww_pinned_sites', JSON.stringify(sites));
}

function addPinnedSite(url, title) {
  const sites = getPinnedSites();
  const initial = (title || url)[0].toUpperCase();
  sites.push({ url, title: title || url, icon: initial, cl: '' });
  savePinnedSites(sites);
  renderTopSites();
}

function removePinnedSite(index) {
  const sites = getPinnedSites();
  sites.splice(index, 1);
  savePinnedSites(sites);
  renderTopSites();
}

function trackTopSite(url, title, favicon) {
  try {
    const host = new URL(url).hostname;
    let sites = JSON.parse(localStorage.getItem('ww_topsites') || '{}');
    if (!sites[host]) sites[host] = { url, title: title || url, favicon: favicon || '', count: 0 };
    sites[host].count = (sites[host].count || 0) + 1;
    sites[host].title = title || sites[host].title;
    sites[host].favicon = favicon || sites[host].favicon;
    const entries = Object.entries(sites).sort((a, b) => b[1].count - a[1].count).slice(0, 100);
    localStorage.setItem('ww_topsites', JSON.stringify(Object.fromEntries(entries)));
  } catch(e) {}
}

function showAddSiteModal() {
  let existing = $('add-site-modal-wrap');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'add-site-modal-wrap';
  overlay.className = 'as-overlay';
  overlay.innerHTML = `
    <div class="as-card" role="dialog" aria-modal="true">
      <div class="as-card-glow"></div>
      <div class="as-icon">＋</div>
      <h3 class="as-title">Add site</h3>
      <p class="as-sub">Pin a shortcut to your start page</p>
      <div class="as-field">
        <label class="as-label" for="add-site-url">URL</label>
        <div class="as-input-wrap">
          <img id="as-favicon" class="as-favicon" src="" alt="" hidden />
          <input id="add-site-url" type="text" placeholder="https://example.com" autocomplete="off" spellcheck="false" />
        </div>
      </div>
      <div class="as-field">
        <label class="as-label" for="add-site-title">Name</label>
        <div class="as-input-wrap">
          <input id="add-site-title" type="text" placeholder="My Site" autocomplete="off" spellcheck="false" />
        </div>
      </div>
      <div class="as-actions">
        <button id="add-site-cancel" class="as-btn as-btn-ghost">Cancel</button>
        <button id="add-site-confirm" class="as-btn as-btn-primary">Add site</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const favicon = overlay.querySelector('#as-favicon');
  const urlInput = overlay.querySelector('#add-site-url');
  const titleInput = overlay.querySelector('#add-site-title');

  function updateFavicon() {
    let raw = urlInput.value.trim();
    let domain = '';
    try {
      domain = new URL(/^https?:\/\//i.test(raw) ? raw : 'https://' + raw).hostname;
    } catch (_) {}
    if (!domain) { favicon.hidden = true; return; }
    favicon.src = 'https://www.google.com/s2/favicons?domain=' + encodeURIComponent(domain) + '&sz=64';
    favicon.hidden = false;
  }
  let favTimer = null;
  urlInput.addEventListener('input', () => {
    if (favTimer) clearTimeout(favTimer);
    favTimer = setTimeout(updateFavicon, 250);
  });

  function close() { overlay.remove(); }
  overlay.querySelector('#add-site-cancel').addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  overlay.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  overlay.querySelector('#add-site-confirm').addEventListener('click', () => {
    let url = urlInput.value.trim();
    let title = titleInput.value.trim();
    if (!url) {
      urlInput.parentElement.classList.remove('as-error');
      void urlInput.parentElement.offsetWidth;
      urlInput.parentElement.classList.add('as-error');
      urlInput.focus();
      return;
    }
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    let host = url;
    try { host = new URL(url).hostname; } catch (_) {}
    addPinnedSite(url, title || host);
    close();
  });
  urlInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); titleInput.focus(); }
  });
  titleInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); overlay.querySelector('#add-site-confirm').click(); }
  });
  urlInput.focus();
}

function renderTopSites() {
  const container = $('newtab-top-sites');
  if (!container) return;
  try {
    const sites = getPinnedSites();
    container.innerHTML = sites.map((s, i) => {
      const icon = s.favicon ? `<img src="${esc(s.favicon)}" width=20 height=20 onerror="this.style.display='none'" />` : `<div class="ql-icon">${(s.icon || s.title || '?')[0].toUpperCase()}</div>`;
      return `<div class="top-site" data-url="${esc(s.url)}" data-index="${i}">
        ${icon}
        <span class="top-site-title">${esc(s.title)}</span>
        <button class="top-site-remove" data-index="${i}" title="Usuń">✕</button>
      </div>`;
    }).join('') + `<div class="top-site top-site-add" id="top-site-add-btn" title="Dodaj stronę">
      <div class="ql-icon">+</div>
      <span class="top-site-title">Add</span>
    </div>`;

    container.querySelectorAll('.top-site:not(.top-site-add)').forEach(el => {
      el.addEventListener('click', (e) => {
        if (e.target.classList.contains('top-site-remove')) return;
        navigate(el.dataset.url);
      });
      el.addEventListener('auxclick', e => { if (e.button === 1) { e.preventDefault(); createTab(el.dataset.url); } });
    });

    container.querySelectorAll('.top-site-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        removePinnedSite(parseInt(btn.dataset.index));
      });
    });

    const addBtn = $('top-site-add-btn');
    if (addBtn) addBtn.addEventListener('click', showAddSiteModal);
  } catch(e) {}
}

// ===== NEWTAB QUOTE =====
const MOTIVATIONAL_QUOTES = [
  "Jedynym sposobem na wykonanie wielkiej pracy jest pokochanie tego, co robisz.",
  "Bądź głodny, bądź szalony.",
  "Nieważne, jak wolno idziesz, ważne żebyś nie przestawał.",
  "Przyszłość należy do tych, którzy wierzą w piękno swoich marzeń.",
  "W trudnościach kryje się szansa.",
  "Uwierz, że możesz, a będziesz w połowie drogi.",
  "Sukces to nie koniec, porażka to nie koniec — liczy się odwaga, by kontynuować.",
  "To co za nami i to co przed nami to drobnostki wobec tego, co w nas.",
  "Najlepszy czas na zasadzenie drzewa był 20 lat temu. Drugi najlepszy jest teraz.",
  "Wszystko, czego pragniesz, jest po drugiej stronie strachu.",
  "Rób to, co możesz, z tym co masz, tam gdzie jesteś.",
  "Zachowuj się tak, jakby to co robisz miało znaczenie. Bo ma.",
  "To, co osiągamy wewnętrznie, zmieni zewnętrzną rzeczywistość.",
  "Jedyna niemożliwa podróż to ta, której nigdy nie rozpoczniesz.",
  "Umysł to wszystko. Czym myślisz, tym się stajesz.",
  "Twój czas jest ograniczony, nie marnuj go żyjąc cudzym życiem.",
  "Najlepsza zemsta to spektakularny sukces.",
  "Czasem później oznacza nigdy. Zrób to teraz.",
  "Wielkie umysły dyskutują o ideach, przeciętne o wydarzeniach, małe o ludziach.",
  "Bądź zmianą, którą chcesz widzieć w świecie.",
  "Jeśli spojrzysz na to, co masz w życiu, zawsze będziesz miał więcej.",
  "Życie dzieje się, gdy jesteś zajęty snuciem innych planów.",
  "Zabieraj się do życia albo zabieraj się do umierania.",
  "Nie trafiasz w 100% strzałów, których nie oddajesz.",
  "Czy myślisz, że możesz, czy myślisz, że nie możesz — i tak masz rację.",
  "Jedyną osobą, którą masz się stać, jest ta, którą zdecydujesz się być.",
  "Idź śmiało w kierunku swoich marzeń. Żyj życiem, które sobie wyobraziłeś.",
  "Sekretem sukcesu jest zacząć.",
  "Nie poniosłem porażki. Odkryłem 10 000 sposobów, które nie działają.",
  "Nie to, czy upadniesz, ale czy podniesiesz się, ma znaczenie.",
  "Podróż tysiąca mil zaczyna się od pierwszego kroku.",
  "Wiedzieć to za mało, trzeba stosować. Chcieć to za mało, trzeba działać.",
  "Wyobraźnia jest ważniejsza niż wiedza.",
  "Jeśli potrafisz to wyśnić, potrafisz tego dokonać.",
  "Nie dąż do bycia sukcesem, ale do bycia wartością.",
  "Kreatywność to inteligencja, która się bawi.",
  "Jedyną granicą naszego jutra będą nasze dzisiejsze wątpliwości.",
  "Nie czekaj, aż żelazo będzie gorące — rozgrzej je uderzając.",
  "To, co zyskujesz osiągając cele, jest mniej ważne niż to, kim się stajesz.",
  "Sposób na rozpoczęcie to przestać gadać i zacząć działać.",
  "Przyszłość zależy od tego, co robisz dzisiaj.",
  "Nie pozwól, by wczoraj zajęło zbyt wiele z dzisiaj.",
  "Możemy napotkać wiele porażek, ale nie możemy dać się pokonać.",
  "Jedyny sposób odkrycia granic możliwego to przekroczyć je w kierunku niemożliwego.",
  "Skoncentruj się na byciu produktywnym, nie tylko zajętym.",
  "Jeśli chcesz się podnieść, podnieś kogoś innego.",
  "Ograniczenia istnieją tylko w naszych umysłach. Gdy używamy wyobraźni, możliwości stają się nieograniczone.",
  "Największa chwała w życiu nie leży w tym, że nigdy nie upadamy, ale w tym, że podnosimy się za każdym razem.",
  "Zacznij tam, gdzie jesteś. Użyj tego, co masz. Zrób, co możesz.",
  "Wytrwałość to nie jeden długi wyścig — to wiele krótkich wyścigów jeden po drugim.",
  "Nie da się wypić oceanu jednym łykiem. Pij po trochu, krok po kroku.",
  "97% myśli to powtórki. Działanie kończy spirale, bo rusza rzeczy naprzód.",
  "Overthinking wie co jest złe, a nie co jest dobre. Przestań szukać problemów — zacznij szukać rozwiązań.",
  "Nie myśl o tym, co mogłoby pójść źle. Pomyśl o tym, co możesz zrobić dobrze.",
  "Umysł to wspaniały sługa, ale okropny pan. Nie pozwól mu przejąć sterów.",
  "Twoje myśli to nie fakty. To tylko odgłosy mózgu.",
  "Cisza w głowie nie jest celem. Celem jest spokój, że robisz wszystko, co możesz.",
  "Kiedy zamartwiać się zaczyna, zacznij działać. Działanie rozprasza ciemność.",
  "Idealny plan to ten, który zaczynasz dziś — nie ten, który dogrywasz we własnej głowie.",
  "Analiza paraliżuje. Podjęcie decyzji uwalnia.",
  "Możesz rozważyć gałąź po gałęzi, albo wejść na drzewo. Wybierz wejście.",
  "Troska o szczegóły jest dobra, dopóki nie zabija całości. Zrób pierwszy krok.",
  "Świat nie ustawi się po Twojej myśli, ale Ty możesz ustawić swoją myśl na działaniu.",
  "Cokolwiek byś nie przemyślał po raz setny, prawdopodobne, że masz już odpowiedź.",
];

function renderNewtabQuote() {
  const el = $('newtab-quote');
  if (!el) return;
  const idx = Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length);
  el.textContent = MOTIVATIONAL_QUOTES[idx];
}

// ===== PANELS =====
let closePanelsTimer = null;

function closeAllPanels(clearActive = true) {
  if (closePanelsTimer) {
    clearTimeout(closePanelsTimer);
    closePanelsTimer = null;
  }
  Object.values(PANELS).forEach(p => {
    if (!p.classList.contains('hidden')) {
      p.classList.remove('open');
      p.classList.add('closing');
    }
  });
  closePanelsTimer = setTimeout(() => {
    Object.values(PANELS).forEach(p => {
      p.classList.add('hidden');
      p.classList.remove('closing', 'open');
    });
    closePanelsTimer = null;
  }, 300);
  if (clearActive) {
    activePanel = null;
    [btnDownloads, btnHistory, btnBookmarksPanel, btnSettings, btnAISidebar, $('btn-notes'), btnPasswords, btnClipboard, btnPerf, btnScripts]
      .forEach(b => b?.classList.remove('active'));
  }
}

function openPanel(name) {
  if (activePanel === name) {
    closeAllPanels();
    return;
  }
  if (closePanelsTimer) {
    clearTimeout(closePanelsTimer);
    closePanelsTimer = null;
  }

  const prevName = activePanel;
  const prev = prevName ? PANELS[prevName] : null;

  activePanel = name;

  // Show new panel (removes display:none, element starts at hidden transform)
  if (PANELS[name]) {
    PANELS[name].classList.remove('hidden', 'closing');
  }
  // Force reflow so browser registers visible element before transitioning
  void PANELS[name]?.offsetHeight;
  // Trigger slide-in transition
  if (PANELS[name]) {
    PANELS[name].classList.add('open');
  }

  // Animate old panel out (overlaps with new panel opening)
  if (prev && prev !== PANELS[name] && !prev.classList.contains('hidden')) {
    prev.classList.remove('open');
    prev.classList.add('closing');
    setTimeout(() => {
      prev.classList.add('hidden');
      prev.classList.remove('closing');
    }, 300);
  }

  // Highlight active btn
  const btns = {
    downloads: btnDownloads, passwords: btnPasswords,
    history: btnHistory,
    bookmarks: btnBookmarksPanel, settings: btnSettings,
    'ai-sidebar': btnAISidebar,
    'notes': $('btn-notes'),
    clipboard: btnClipboard,
    perf: btnPerf,
    scripts: btnScripts,
  };
  Object.values(btns).forEach(b => b?.classList.remove('active'));
  if (btns[name]) btns[name].classList.add('active');

  // Load panel data
  if (name === 'history') loadHistoryPanel();
  if (name === 'bookmarks') loadBookmarksPanel();
  if (name === 'downloads') { renderActiveSection(); _refreshDlSummary(); loadDownloadsHistory(); }
  if (name === 'passwords') loadPasswordsPanel();
  if (name === 'ai-sidebar') {
    if (aiPipeline) $('ai-api-setup').classList.add('hidden');
    else $('ai-api-setup').classList.remove('hidden');
  }
}

// Panel close buttons
document.querySelectorAll('.panel-close-btn').forEach(btn => {
  btn.addEventListener('click', () => closeAllPanels());
});

// Panel buttons
btnDownloads.addEventListener('click', () => openPanel('downloads'));
btnHistory.addEventListener('click', () => openPanel('history'));
btnBookmarksPanel.addEventListener('click', () => openPanel('bookmarks'));
btnSettings.addEventListener('click', () => openPanel('settings'));
btnAISidebar.addEventListener('click', () => openPanel('ai-sidebar'));
$('btn-notes')?.addEventListener('click', () => { openPanel('notes'); renderNotesList(); });
btnPasswords.addEventListener('click', () => { openPanel('passwords'); loadPasswordsPanel(); });
btnClipboard.addEventListener('click', () => { openPanel('clipboard'); renderClipboardPanel(); });
btnPerf.addEventListener('click', () => { openPanel('perf'); renderPerfPanel(); });
$('perf-refresh')?.addEventListener('click', () => renderPerfPanel());
btnScripts.addEventListener('click', () => { openPanel('scripts'); renderScriptsPanel(); });

// ===== TAB MANAGEMENT =====
function createTab(url = null) {
  const id = uid();
  const tab = {
    id,
    url: url || '',
    title: 'Nowa karta',
    favicon: null,
    webview: null,
    loading: false,
    zoom: settings.zoom || 1,
    canGoBack: false,
    canGoForward: false,
    pinned: false,
    group: '',
  };

  tabs.push(tab);

  const tabEl = document.createElement('div');
  tabEl.className = 'tab';
  tabEl.dataset.tabId = id;
  tabEl.draggable = true;
  tabEl.innerHTML = `
    <img class="tab-favicon" src="${defaultFavicon()}" />
    <span class="tab-title">New Tab</span>
    <button class="tab-close" title="Zamknij (Ctrl+W)">✕</button>
  `;

  tabEl.addEventListener('click', e => {
    if (!e.target.classList.contains('tab-close')) switchTab(id);
  });

  // Tab preview on hover
  let previewTimeout = null;
  tabEl.addEventListener('mouseenter', e => {
    if (e.target.classList.contains('tab-close')) return;
    previewTimeout = setTimeout(() => showTabPreview(id, tabEl), 450);
  });
  tabEl.addEventListener('mouseleave', () => {
    clearTimeout(previewTimeout);
    hideTabPreview();
  });

  tabEl.addEventListener('auxclick', e => {
    if (e.button === 1) { e.preventDefault(); closeTab(id); }
  });

  tabEl.querySelector('.tab-close').addEventListener('click', e => {
    e.stopPropagation();
    closeTab(id);
  });

  // Context menu on tab
  tabEl.addEventListener('contextmenu', e => {
    e.preventDefault();
    showTabContextMenu(id, e.clientX, e.clientY);
  });

  // Drag events for tab reordering
  tabEl.addEventListener('dragstart', e => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
    tabEl.classList.add('dragging');
    _dragSourceId = id;
  });

  tabEl.addEventListener('dragend', () => {
    tabEl.classList.remove('dragging');
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('drop-left', 'drop-right'));
    _dragSourceId = null;
  });

  tabsContainer.appendChild(tabEl);

  // scroll the new tab into view
  requestAnimationFrame(() => {
    const scroll = document.getElementById('tabs-scroll');
    if (scroll) scroll.scrollLeft = scroll.scrollWidth;
  });

  if (url) {
    attachWebview(tab, url);
  }

  switchTab(id);
  updateStats();
  updateTabGroups();
  return id;
}

function defaultFavicon() {
  return `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><circle cx='12' cy='12' r='9' fill='%23444'/></svg>`;
}

function attachWebview(tab, url) {
  const wv = document.createElement('webview');
  if (_webviewPreloadPath) wv.setAttribute('preload', _webviewPreloadPath);
  wv.setAttribute('src', url);
  wv.setAttribute('allowpopups', '');
  wv.setAttribute('webpreferences', 'contextIsolation=yes');
  wv.style.position = 'absolute';
  wv.style.inset = '0';
  wv.style.width = '100%';
  wv.style.height = '100%';
  wv.style.display = 'none';

  tab.webview = wv;
  tab.url = url;

  // Password manager — listener added once per webview
  wv.addEventListener('console-message', (e) => {
    if (e.message.startsWith('__WW_LOGIN__')) {
      try {
        const data = JSON.parse(e.message.slice(12));
        if (tab.url) showSavePasswordPrompt(wv, tab.url, data.username, data.password);
      } catch (_) {}
    }
  });

  // Mouse back/forward buttons & zoom (via ipc-message from webview-preload)
  wv.addEventListener('ipc-message', e => {
    if (e.channel === 'mouse-nav') {
      const btn = e.args[0];
      if (btn === 3 && tab.webview?.canGoBack()) tab.webview.goBack();
      if (btn === 4 && tab.webview?.canGoForward()) tab.webview.goForward();
    }
    if (e.channel === 'zoom') {
      const delta = e.args[0];
      if (tab.id === activeTabId) setZoom(delta);
    }
  });

  wv.addEventListener('did-start-loading', () => onStartLoading(tab.id));
  wv.addEventListener('did-stop-loading', () => {
    onStopLoading(tab.id);
    applyDarkMode(wv);
  });
  wv.addEventListener('did-fail-load', (e) => {
    if (e.errorCode === -3) return; // Aborted, ignore
    onStopLoading(tab.id);
    const errorPageHtml = `<!DOCTYPE html><html><head><style>
      body{margin:0;display:flex;align-items:center;justify-content:center;height:100vh;background:#0f0f13;color:#eee;font-family:system-ui,sans-serif;text-align:center}
      .err{max-width:440px;padding:32px}
      .err h2{font-size:20px;margin:0 0 8px;color:#ff4444}
      .err p{font-size:13px;color:#888;margin:0 0 16px;line-height:1.5}
      .err code{font-size:11px;color:#666;background:#1a1a22;padding:4px 10px;border-radius:6px;display:inline-block}
      .err button{background:#ff1a35;color:#fff;border:none;padding:10px 24px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;margin-top:8px}
      .err button:hover{background:#ff3355}
    </style></head><body><div class="err">
      <h2>⚠️ Page failed to load</h2>
      <p>${esc(e.errorDescription || 'An error occurred while loading this page.')}</p>
      <code>Error ${e.errorCode}: ${esc(e.validatedURL || tab.url || '')}</code><br>
      <button onclick="location.reload()">Try Again</button>
    </div></body></html>`;
    wv.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(errorPageHtml));
  });
  wv.addEventListener('page-title-updated', e => {
    setTabTitle(tab.id, e.title);
  });
  wv.addEventListener('page-favicon-updated', e => {
    if (e.favicons?.[0]) setTabFavicon(tab.id, e.favicons[0]);
  });
  wv.addEventListener('did-navigate', e => {
    onNavigated(tab.id, e.url);
    if (e.url && !e.url.startsWith('about:')) {
      watchLoginForm(wv, e.url);
      autofillPasswords(wv, e.url);
      applyDarkMode(wv);
    }
    const safetyBlock = checkSafetyScreen(e.url);
    if (safetyBlock) {
      showSafetyScreen(safetyBlock);
    } else {
      hideSafetyScreen();
    }
  });
  wv.addEventListener('did-navigate-in-page', e => {
    onNavigated(tab.id, e.url, false);
    if (e.url && !e.url.startsWith('about:')) autofillPasswords(wv, e.url);
    const safetyBlock = checkSafetyScreen(e.url);
    if (safetyBlock) {
      showSafetyScreen(safetyBlock);
    } else {
      hideSafetyScreen();
    }
  });

  // URL tooltip on hover
  wv.addEventListener('update-target-url', e => {
    if (e.url) {
      urlTooltip.textContent = e.url;
      urlTooltip.classList.add('visible');
    } else {
      urlTooltip.classList.remove('visible');
    }
  });

  // Context menu
  wv.addEventListener('context-menu', e => {
    const p = e.params || {};
    window.electronAPI.showContextMenu({
      x: p.x, y: p.y,
      pageURL: tab?.url || '',
      linkURL: p.linkURL || '',
      linkText: p.linkText || '',
      selectionText: p.selectionText || '',
      mediaType: p.mediaType || '',
      srcURL: p.srcURL || '',
      canGoBack: tab?.webview?.canGoBack() ? true : false,
      canGoForward: tab?.webview?.canGoForward() ? true : false,
      hasVideo: !!p.hasVideoContents,
      misspelledWord: p.misspelledWord || '',
      dictionarySuggestions: p.dictionarySuggestions || [],
    });
  });

  webviewContainer.appendChild(wv);

  // Use main process setWindowOpenHandler instead of new-window event
  function setupWindowOpen() {
    try {
      const wid = wv.getWebContentsId();
      if (wid) { window.electronAPI.registerWebview(wid); return true; }
    } catch(e) {}
    return false;
  }
  if (!setupWindowOpen()) {
    wv.addEventListener('dom-ready', setupWindowOpen, { once: true });
  }
}

function switchTab(id) {
  activeTabId = id;

  document.querySelectorAll('.tab').forEach(el => el.classList.remove('active'));
  const tabEl = document.querySelector(`[data-tab-id="${id}"]`);
  if (tabEl) tabEl.classList.add('active');

  document.querySelectorAll('webview').forEach(wv => { wv.style.display = 'none'; wv.classList.remove('active'); });

  const tab = tabs.find(t => t.id === id);
  if (!tab) return;

  if (tab.webview) {
    tab.webview.style.display = 'flex';
    tab.webview.classList.add('active');
    newtabPage.classList.remove('active');
    setUrlBar(tab.url);
    updateNavButtons(tab);
    checkBookmarkState(tab.url);
  } else {
    newtabPage.classList.add('active');
    hideSafetyScreen();
    urlBar.value = '';
    setSecurityIcon('');
    btnBack.disabled = true;
    btnForward.disabled = true;
    btnBookmarkPage.classList.remove('bookmarked');
    newtabPage.querySelector('#newtab-input')?.focus();
    renderTopSites();
    renderNewtabQuote();
    renderSearchHistory();
  }
}

function closeTab(id) {
  const idx = tabs.findIndex(t => t.id === id);
  if (idx === -1) return;

  const tab = tabs[idx];
  if (tab.pinned) return; // Don't close pinned tabs via button

  // Save to recently closed (if not incognito and has URL)
  if (tab.url && !tab.incognito) {
    closedTabs.unshift({ url: tab.url, title: tab.title || 'Nowa karta' });
    if (closedTabs.length > 30) closedTabs.length = 30;
    localStorage.setItem('ww_closed_tabs', JSON.stringify(closedTabs));
  }

  const tabEl = document.querySelector(`[data-tab-id="${id}"]`);
  if (tabEl) {
    tabEl.classList.add('closing');
    tabEl.addEventListener('animationend', () => {
      tabEl.remove();
    }, { once: true });
  }
  if (tab.webview) tab.webview.remove();
  tabs.splice(idx, 1);

  if (tabs.length === 0) { createTab(); return; }

  if (activeTabId === id) {
    switchTab(tabs[Math.min(idx, tabs.length - 1)].id);
  }
  updateStats();
  updateTabGroups();
}

function reopenClosedTab() {
  const entry = closedTabs.shift();
  if (entry) {
    localStorage.setItem('ww_closed_tabs', JSON.stringify(closedTabs));
    createTab(entry.url);
  } else {
    showToast('Brak ostatnio zamkniętych kart', 1500);
  }
}

function setTabTitle(id, title) {
  const tab = tabs.find(t => t.id === id);
  if (tab) tab.title = title || 'Bez tytułu';
  const el = document.querySelector(`[data-tab-id="${id}"] .tab-title`);
  if (el) el.textContent = title || 'Bez tytułu';
}

function setTabFavicon(id, url) {
  const tab = tabs.find(t => t.id === id);
  if (tab) tab.favicon = url;
  const el = document.querySelector(`[data-tab-id="${id}"] .tab-favicon`);
  if (el) {
    el.src = url;
    el.onerror = () => { el.src = defaultFavicon(); };
  }
}

// ===== NAVIGATION =====
function navigate(url, tabId = null) {
  const resolved = resolveUrl(url);
  if (!resolved) return;

  const id = tabId || activeTabId;
  const tab = tabs.find(t => t.id === id);
  if (!tab) return;

  if (tab.webview) {
    tab.webview.src = resolved;
  } else {
    attachWebview(tab, resolved);
    newtabPage.classList.remove('active');
    tab.webview.style.display = 'flex';
    tab.webview.classList.add('active');
  }
  tab.url = resolved;
  if (id === activeTabId) setUrlBar(resolved);
}

function resolveUrl(input) {
  input = (input || '').trim();
  if (!input) return '';
  if (/^https?:\/\//i.test(input)) return input;
  if (/^localhost(:\d+)?/i.test(input) || /^\d{1,3}\.\d{1,3}\.\d{1,3}/.test(input)) return 'http://' + input;
  if (/^[\w-]+\.[\w]{2,}(\/|$)/.test(input) && !input.includes(' ')) return 'https://' + input;
  const engine = SEARCH_ENGINES[settings.searchEngine] || SEARCH_ENGINES.google;
  return engine + encodeURIComponent(input);
}

function setUrlBar(url) {
  urlBar.value = url;
  setSecurityIcon(url);
}

const PHISHING_KEYWORDS = ['login', 'signin', 'verify', 'account', 'secure', 'update', 'confirm', 'password', 'banking', 'paypal'];
const PHISHING_TLDS = ['.tk', '.ml', '.ga', '.cf', '.gq', '.buzz', '.xyz', '.top', '.club', '.online', '.site', '.click', '.link', '.download', '.racing'];

function detectPhishing(url) {
  try {
    const { hostname, pathname } = new URL(url);
    const host = hostname.toLowerCase().replace(/^www\./, '');

    // Check for IP address instead of domain
    if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(host)) return true;

    // Check for suspicious TLDs
    if (PHISHING_TLDS.some(tld => host.endsWith(tld))) return true;

    // Check for excessive subdomains (e.g. paypal.login.evil.com)
    const parts = host.split('.');
    if (parts.length > 3) return true;

    // Check for homograph attacks (cyrillic in domain)
    if (/[а-яА-ЯёЁ]/.test(host)) return true;

    // Check for brand name + phishing keywords in path
    const pathLower = pathname.toLowerCase();
    const knownBrands = ['paypal', 'apple', 'google', 'microsoft', 'amazon', 'netflix', 'facebook', 'instagram', 'bank', 'wellsfargo', 'chase', 'citibank', 'coinbase'];
    if (knownBrands.some(b => host.includes(b)) && PHISHING_KEYWORDS.some(k => pathLower.includes(k))) return true;

    return false;
  } catch (_) { return false; }
}

function setSecurityIcon(url) {
  const wrap = $('url-bar-wrapper');
  if (!url) { securityIcon.innerHTML = ''; wrap?.classList.remove('phishing'); return; }

  if (detectPhishing(url)) {
    securityIcon.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M12 3L2 21h20L12 3z" stroke="#ff4444" stroke-width="2" stroke-linejoin="round"/><line x1="12" y1="10" x2="12" y2="14" stroke="#ff4444" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="17" r="0.8" fill="#ff4444"/></svg>`;
    securityIcon.title = '⚠ Wykryto potencjalną witrynę phishingową';
    wrap?.classList.add('phishing');
  } else if (url.startsWith('https://')) {
    securityIcon.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none"><rect x="5" y="11" width="14" height="10" rx="2" stroke="#00d4a0" stroke-width="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4" stroke="#00d4a0" stroke-width="2" stroke-linecap="round"/></svg>`;
    securityIcon.title = 'Bezpieczne połączenie (HTTPS)';
    wrap?.classList.remove('phishing');
  } else {
    securityIcon.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none"><rect x="5" y="11" width="14" height="10" rx="2" stroke="#ff8844" stroke-width="2"/><path d="M8 11V7a4 4 0 0 1 8 0" stroke="#ff8844" stroke-width="2" stroke-linecap="round"/></svg>`;
    securityIcon.title = 'Niezabezpieczone połączenie';
    wrap?.classList.remove('phishing');
  }
}

function updateNavButtons(tab) {
  if (!tab?.webview) {
    btnBack.disabled = true;
    btnForward.disabled = true;
    return;
  }
  try {
    btnBack.disabled = !tab.webview.canGoBack();
    btnForward.disabled = !tab.webview.canGoForward();
  } catch (_) {
    btnBack.disabled = true;
    btnForward.disabled = true;
  }
}

function onNavigated(id, url, saveToHistory = true) {
  const tab = tabs.find(t => t.id === id);
  if (!tab) return;
  tab.url = url;

  if (id === activeTabId) {
    setUrlBar(url);
    updateNavButtons(tab);
    checkBookmarkState(url);
  }

  // Save to search history for newtab widget
  if (tab.url && !tab.incognito && !tab.url.startsWith('chrome://') && !tab.url.startsWith('about:')) {
    saveSearchHistory(tab.url, tab.title);
  }

  // Reset translate state on manual nav
  if (translateActive && !url.startsWith('https://translate.google.com/translate?')) {
    translateActive = false;
    translateOriginalUrl = '';
    $('btn-translate')?.classList.remove('active');
  }

  if (saveToHistory && settings.saveHistory && !tab.incognito && url && !url.startsWith('about:')) {
    window.electronAPI.historyAdd({
      url,
      title: tab.title || url,
      favicon: tab.favicon || '',
    });
  }

  // Track top sites
  if (url && !url.startsWith('about:')) {
    trackTopSite(url, tab.title || url, tab.favicon);
  }
}

// ===== LOADING =====
let _loadProgress = 0;
let _loadTimer;

function onStartLoading(id) {
  const tabEl = document.querySelector(`[data-tab-id="${id}"]`);
  if (tabEl) tabEl.classList.add('loading');

  if (id !== activeTabId) return;
  clearInterval(_loadTimer);
  _loadProgress = 5;
  loadingBar.style.width = '5%';
  loadingBar.style.opacity = '1';
  _loadTimer = setInterval(() => {
    if (_loadProgress < 75) {
      _loadProgress += Math.random() * 8 + 2;
      loadingBar.style.width = Math.min(_loadProgress, 75) + '%';
    }
  }, 180);
}

function onStopLoading(id) {
  const tabEl = document.querySelector(`[data-tab-id="${id}"]`);
  if (tabEl) tabEl.classList.remove('loading');

  if (id !== activeTabId) return;
  clearInterval(_loadTimer);
  loadingBar.style.width = '100%';
  setTimeout(() => {
    loadingBar.style.opacity = '0';
    setTimeout(() => { loadingBar.style.width = '0'; }, 300);
  }, 300);

  const tab = tabs.find(t => t.id === id);
  if (tab) updateNavButtons(tab);
}

// ===== URL BAR EVENTS =====
urlBar.addEventListener('focus', () => urlBar.select());
urlBar.addEventListener('blur', () => {
  const tab = tabs.find(t => t.id === activeTabId);
  if (tab?.url) urlBar.value = tab.url;
});
urlBar.addEventListener('keydown', e => {
  if (e.key === 'Enter') { navigate(urlBar.value); urlBar.blur(); }
  if (e.key === 'Escape') { urlBar.blur(); }
});

// Nav buttons
btnBack.addEventListener('click', () => {
  const tab = tabs.find(t => t.id === activeTabId);
  if (tab?.webview?.canGoBack()) tab.webview.goBack();
});
btnForward.addEventListener('click', () => {
  const tab = tabs.find(t => t.id === activeTabId);
  if (tab?.webview?.canGoForward()) tab.webview.goForward();
});
btnReload.addEventListener('click', () => {
  const tab = tabs.find(t => t.id === activeTabId);
  if (tab?.webview) {
    if (tab.loading) tab.webview.stop();
    else tab.webview.reload();
  }
});
btnHome.addEventListener('click', () => {
  const hp = settings.homepage || 'about:blank';
  if (hp === 'about:blank' || hp === '') {
    const tab = tabs.find(t => t.id === activeTabId);
    if (tab) {
      if (tab.webview) { tab.webview.remove(); tab.webview = null; }
      tab.url = '';
      tab.title = 'Nowa karta';
      setTabTitle(tab.id, 'Nowa karta');
      setTabFavicon(tab.id, defaultFavicon());
      newtabPage.classList.add('active');
      hideSafetyScreen();
      urlBar.value = '';
    }
  } else {
    navigate(hp);
  }
});

function goHome() {
  const hp = settings.homepage || 'about:blank';
  if (hp === 'about:blank' || hp === '') {
    const tab = tabs.find(t => t.id === activeTabId);
    if (tab) {
      if (tab.webview) { tab.webview.remove(); tab.webview = null; }
      tab.url = '';
      tab.title = 'Nowa karta';
      setTabTitle(tab.id, 'Nowa karta');
      setTabFavicon(tab.id, defaultFavicon());
      newtabPage.classList.add('active');
      hideSafetyScreen();
      urlBar.value = '';
    }
  } else {
    navigate(hp);
  }
}

// ===== NEW TAB =====
$('new-tab-btn').addEventListener('click', () => createTab());

$('newtab-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') navigate($('newtab-input').value);
});
$('newtab-go').addEventListener('click', () => navigate($('newtab-input').value));

document.querySelectorAll('.quick-link').forEach(el => {
  el.addEventListener('click', () => navigate(el.dataset.url));
});

// ===== BOOKMARKS =====
async function checkBookmarkState(url) {
  if (!url) { btnBookmarkPage.classList.remove('bookmarked'); return; }
  const bookmarks = await window.electronAPI.bookmarksGet();
  if (bookmarks.find(b => b.url === url)) {
    btnBookmarkPage.classList.add('bookmarked');
    btnBookmarkPage.title = 'Usuń z zakładek';
  } else {
    btnBookmarkPage.classList.remove('bookmarked');
    btnBookmarkPage.title = 'Zapisz stronę w zakładkach';
  }
}

btnBookmarkPage.addEventListener('click', async () => {
  const tab = tabs.find(t => t.id === activeTabId);
  if (!tab?.url) return;
  const bookmarks = await window.electronAPI.bookmarksGet();
  if (bookmarks.find(b => b.url === tab.url)) {
    window.electronAPI.bookmarksRemove(tab.url);
    btnBookmarkPage.classList.remove('bookmarked');
    btnBookmarkPage.title = 'Zapisz stronę w zakładkach';
    showToast('Usunięto z zakładek');
  } else {
    window.electronAPI.bookmarksAdd({ url: tab.url, title: tab.title, favicon: tab.favicon });
    btnBookmarkPage.classList.add('bookmarked');
    btnBookmarkPage.title = 'Usuń z zakładek';
    showToast('Zapisano w zakładkach ⭐');
  }
  if (activePanel === 'bookmarks') loadBookmarksPanel();
  loadBookmarksBar();
});

// ===== TRANSLATE =====
const TRANSLATE_LANGS = [
  { code: 'pl', name: 'Polski' },
  { code: 'en', name: 'English' },
  { code: 'de', name: 'Deutsch' },
  { code: 'fr', name: 'Fran\u00e7ais' },
  { code: 'es', name: 'Espa\u00f1ol' },
  { code: 'it', name: 'Italiano' },
  { code: 'pt', name: 'Portugu\u00eas' },
  { code: 'ru', name: '\u0420\u0443\u0441\u0441\u043a\u0438\u0439' },
  { code: 'ja', name: '\u65e5\u672c\u8a9e' },
  { code: 'ko', name: '\ud55c\uad6d\uc5b4' },
  { code: 'zh-CN', name: '\u4e2d\u6587' },
  { code: 'ar', name: '\u0627\u0644\u0639\u0631\u0628\u064a\u0629' },
];
let translateActive = false;
let translateOriginalUrl = '';

function renderTranslateLangs() {
  const container = $('translate-langs');
  if (!container) return;
  container.innerHTML = TRANSLATE_LANGS.map(l => `
    <button class="tp-lang" data-lang="${l.code}">
      <span class="tp-lang-name">${l.name}</span>
      <span class="tp-lang-code">${l.code}</span>
    </button>
  `).join('');
  container.querySelectorAll('.tp-lang').forEach(btn => {
    btn.addEventListener('click', () => {
      translatePage(btn.dataset.lang);
      hideTranslatePopup();
    });
  });
}

$('btn-translate')?.addEventListener('click', e => {
  e.stopPropagation();
  const popup = $('translate-popup');
  if (!popup) return;
  if (translateActive) { showOriginal(); hideTranslatePopup(); return; }
  if (!popup.classList.contains('hidden')) { hideTranslatePopup(); return; }
  const tab = tabs.find(t => t.id === activeTabId);
  if (!tab?.url || tab.url.startsWith('about:') || tab.url.startsWith('chrome')) {
    showToast('Nie można przetłumaczyć tej strony');
    return;
  }
  renderTranslateLangs();
  popup.classList.remove('hidden');
  setTimeout(() => document.addEventListener('click', hideTranslatePopup, { once: true }), 10);
});

function hideTranslatePopup() {
  const popup = $('translate-popup');
  if (popup) popup.classList.add('hidden');
}

$('btn-translate-original')?.addEventListener('click', () => {
  showOriginal();
  hideTranslatePopup();
});

function translatePage(targetLang) {
  const tab = tabs.find(t => t.id === activeTabId);
  if (!tab?.url) return;
  translateOriginalUrl = tab.url;
  translateActive = true;
  $('btn-translate')?.classList.add('active');
  const proxyUrl = `https://translate.google.com/translate?hl=${targetLang}&sl=auto&u=${encodeURIComponent(tab.url)}`;
  navigate(proxyUrl);
}

function showOriginal() {
  if (!translateActive || !translateOriginalUrl) return;
  const tab = tabs.find(t => t.id === activeTabId);
  if (!tab) return;
  translateActive = false;
  $('btn-translate')?.classList.remove('active');
  navigate(translateOriginalUrl);
  translateOriginalUrl = '';
}

// Bookmarks search & import/export
// ===== READING LIST =====
function getReadingList() {
  try { return JSON.parse(localStorage.getItem('ww_readinglist') || '[]'); } catch(e) { return []; }
}
function saveReadingList(list) {
  localStorage.setItem('ww_readinglist', JSON.stringify(list));
}
function toggleReadingList(url, title, favicon) {
  let list = getReadingList();
  const idx = list.findIndex(item => item.url === url);
  if (idx >= 0) { list.splice(idx, 1); showToast('Usunięto z listy do przeczytania'); }
  else { list.unshift({ url, title: title || url, favicon: favicon || '', date: Date.now() }); showToast('Zapisano na listę do przeczytania 📖'); }
  saveReadingList(list);
  renderReadingList();
}
function renderReadingList() {
  const container = $('reading-list');
  if (!container) return;
  const list = getReadingList();
  if (!list.length) { container.innerHTML = ''; return; }
  container.innerHTML = `<div style="padding:6px 14px;font-size:10px;font-weight:700;color:var(--text-3);text-transform:uppercase;letter-spacing:0.07em">Lista do przeczytania</div>` +
    list.map(item => `
    <div class="panel-item" data-url="${esc(item.url)}">
      <div class="panel-item-icon">${item.favicon ? `<img src="${esc(item.favicon)}" width="16" height="16" onerror="this.style.display='none'" />` : '📖'}</div>
      <div class="panel-item-info">
        <div class="panel-item-title">${esc(item.title)}</div>
        <div class="panel-item-sub">${esc(item.url)}</div>
      </div>
      <div class="panel-item-actions">
        <button class="panel-item-btn danger" data-action="del-rl" data-url="${esc(item.url)}" title="Usuń">✕</button>
      </div>
    </div>
  `).join('');
  container.querySelectorAll('.panel-item').forEach(el => {
    el.addEventListener('click', e => {
      if (e.target.dataset.action === 'del-rl') {
        let list = getReadingList().filter(i => i.url !== e.target.dataset.url);
        saveReadingList(list);
        renderReadingList();
        return;
      }
      navigate(el.dataset.url);
      closeAllPanels();
    });
  });
}
$('btn-read-later').addEventListener('click', () => {
  const tab = tabs.find(t => t.id === activeTabId);
  if (tab?.url && !tab.url.startsWith('about:')) toggleReadingList(tab.url, tab.title, tab.favicon);
});
$('bookmarks-search').addEventListener('input', async function () {
  const all = await window.electronAPI.bookmarksGet();
  renderFilteredBookmarks(all, this.value);
});
$('history-search').addEventListener('input', async function () {
  const all = await window.electronAPI.historyGet();
  renderFilteredHistory(all, this.value);
});
$('bm-export-btn').addEventListener('click', async () => {
  const ok = await window.electronAPI.bookmarksExport();
  showToast(ok ? 'Zakładki wyeksportowane' : 'Eksport anulowany');
});
$('bm-import-btn').addEventListener('click', async () => {
  const count = await window.electronAPI.bookmarksImport();
  showToast(count > 0 ? `Zaimportowano ${count} zakładek` : 'Nie znaleziono nowych zakładek');
  loadBookmarksPanel();
  loadBookmarksBar();
});

async function loadBookmarksPanel() {
  const bookmarks = await window.electronAPI.bookmarksGet();
  const q = $('bookmarks-search').value;
  renderFilteredBookmarks(bookmarks, q);
  renderReadingList();
}

function renderFilteredBookmarks(bookmarks, q) {
  const list = $('bookmarks-list');
  const filtered = q ? bookmarks.filter(b => b.title?.toLowerCase().includes(q.toLowerCase()) || b.url?.toLowerCase().includes(q.toLowerCase())) : bookmarks;

  if (!filtered.length) {
    list.innerHTML = `<div class="panel-empty"><div class="panel-empty-icon">⭐</div><span>Brak zakładek.<br>Kliknij gwiazdkę na pasku adresu, aby zapisywać strony.</span></div>`;
    return;
  }
  list.innerHTML = filtered.map(b => `
    <div class="panel-item" data-url="${esc(b.url)}">
      <div class="panel-item-icon">
        ${b.favicon ? `<img src="${esc(b.favicon)}" width="18" height="18" onerror="this.style.display='none'" />` : '⭐'}
      </div>
      <div class="panel-item-info">
        <div class="panel-item-title">${esc(b.title || b.url)}</div>
        <div class="panel-item-sub">${esc(b.url)}</div>
      </div>
      <div class="panel-item-actions">
        <button class="panel-item-btn danger" data-action="del-bm" data-url="${esc(b.url)}" title="Usuń">🗑</button>
      </div>
    </div>
  `).join('');

  list.querySelectorAll('.panel-item').forEach(el => {
    el.addEventListener('click', e => {
      if (e.target.dataset.action === 'del-bm') {
        window.electronAPI.bookmarksRemove(e.target.dataset.url);
        loadBookmarksPanel();
        loadBookmarksBar();
        checkBookmarkState(tabs.find(t => t.id === activeTabId)?.url);
        return;
      }
      navigate(el.dataset.url);
      closeAllPanels();
    });
  });
}

// ===== BOOKMARKS BAR =====
function loadBookmarksBar() {
  const listEl = $('bookmarks-bar-list');
  const bar = $('bookmarks-bar');
  const show = settings.showBookmarksBar;
  bar.classList.toggle('hidden', !show);
  if (!show) return;

  window.electronAPI.bookmarksGet().then(bookmarks => {
    if (!bookmarks.length) {
      listEl.innerHTML = `<span class="bb-drop-hint">Przeciągnij adresy URL tutaj, aby dodać do zakładek</span>`;
      return;
    }
    listEl.innerHTML = bookmarks.slice(0, 30).map(b => `
      <div class="bb-item" data-url="${esc(b.url)}" title="${esc(b.title || b.url)}">
        ${b.favicon
          ? `<img class="bb-favicon" src="${esc(b.favicon)}" onerror="this.style.display='none'" />`
          : `<span class="bb-favicon-fallback">⭐</span>`
        }
        <span class="bb-label">${esc(b.title || b.url).replace(/(.{30})..+/, '$1…')}</span>
        <button class="bb-remove" data-url="${esc(b.url)}" title="Usuń">✕</button>
      </div>
    `).join('');

    listEl.querySelectorAll('.bb-item').forEach(el => {
      el.addEventListener('click', e => {
        if (e.target.classList.contains('bb-remove')) {
          e.stopPropagation();
          window.electronAPI.bookmarksRemove(e.target.dataset.url);
          loadBookmarksBar();
          checkBookmarkState(tabs.find(t => t.id === activeTabId)?.url);
          return;
        }
        navigate(el.dataset.url);
      });
      el.addEventListener('auxclick', e => {
        if (e.button === 1) { e.preventDefault(); createTab(el.dataset.url); }
      });
    });
  });
}

// Drag URLs onto bookmarks bar to save
const bookmarksBar = $('bookmarks-bar');
bookmarksBar.addEventListener('dragover', e => {
  e.preventDefault();
  bookmarksBar.classList.add('drag-over');
});
bookmarksBar.addEventListener('dragleave', () => {
  bookmarksBar.classList.remove('drag-over');
});
bookmarksBar.addEventListener('drop', e => {
  e.preventDefault();
  bookmarksBar.classList.remove('drag-over');
  const url = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain');
  if (url && /^https?:\/\//i.test(url)) {
    window.electronAPI.bookmarksAdd({ url, title: url, favicon: '' });
    loadBookmarksBar();
    showToast('⭐ Dodano do zakładek');
  }
});

// ===== ADBLOCK PRO =====
PANELS['adblock'] = $('panel-adblock');
let adblockTotalBlocked = adsBlockedCount;

// Ad-blocked event from main
window.electronAPI.on('ad-blocked', (data) => {
  adblockTotalBlocked = data.total;
  adsBlockedCount = data.total;
  localStorage.setItem('ww_ads_blocked', String(data.total));
  updateAdblockStats();
  updateStats();
});

function updateAdblockStats() {
  $('ab-total-blocked').textContent = adblockTotalBlocked;
  window.electronAPI.adblockStats().then(stats => {
    const domainCount = Object.keys(stats.domains || {}).length;
    $('ab-domains-blocked').textContent = domainCount;
    window.electronAPI.adblockFilterCount().then(c => { $('ab-filters-count').textContent = c; });

    // Top domains
    const topEl = $('ab-top-domains');
    const sorted = Object.entries(stats.domains || {}).sort((a, b) => b[1] - a[1]).slice(0, 15);
    const maxCount = sorted.length ? sorted[0][1] : 1;
    topEl.innerHTML = sorted.length
      ? sorted.map(([domain, count]) => `
        <div class="ab-domain-bar-wrap">
          <span>${esc(domain)}</span>
          <div class="ab-domain-bar-track">
            <div class="ab-domain-bar-fill" style="width:${(count / maxCount * 100).toFixed(0)}%"></div>
          </div>
          <span class="ab-domain-count">${count}</span>
        </div>
      `).join('')
      : `<div style="padding:12px;text-align:center;color:var(--text-3);font-size:11px">Brak danych — przeglądaj internet, aby zobaczyć zablokowane domeny</div>`;
  });
}

// AdBlock enable toggle
$('ab-enabled')?.addEventListener('change', function () {
  window.electronAPI.adblockSetEnabled(this.checked);
  settings.adBlock = this.checked;
  window.electronAPI.settingsSet(settings);
});

// Reset stats
$('ab-reset-stats')?.addEventListener('click', () => {
  window.electronAPI.adblockResetStats();
  adblockTotalBlocked = 0;
  adsBlockedCount = 0;
  localStorage.setItem('ww_ads_blocked', '0');
  updateAdblockStats();
  showToast('Zresetowano statystyki');
});

// Whitelist
function loadWhitelist() {
  window.electronAPI.adblockWhitelistGet().then(list => {
    const el = $('ab-whitelist');
    if (!list.length) {
      el.innerHTML = '<div style="padding:6px;font-size:10px;color:var(--text-3)">Brak stron na białej liście</div>';
      return;
    }
    el.innerHTML = list.map(d => `
      <div class="ab-list-item"><span>${esc(d)}</span><button data-domain="${esc(d)}" title="Usuń">✕</button></div>
    `).join('');
    el.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', () => {
        window.electronAPI.adblockWhitelistRemove(btn.dataset.domain);
        loadWhitelist();
      });
    });
  });
}

$('ab-whitelist-add')?.addEventListener('click', () => {
  const val = $('ab-whitelist-input').value.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  if (val) {
    window.electronAPI.adblockWhitelistAdd(val);
    $('ab-whitelist-input').value = '';
    loadWhitelist();
    showToast(`Dodano do białej listy: ${val}`);
  }
});
$('ab-whitelist-input')?.addEventListener('keydown', e => {
  if (e.key === 'Enter') $('ab-whitelist-add')?.click();
});

// Custom filters
function loadCustomFilters() {
  window.electronAPI.adblockCustomFilters().then(list => {
    const el = $('ab-custom-filters');
    if (!list.length) {
      el.innerHTML = '<div style="padding:6px;font-size:10px;color:var(--text-3)">Brak własnych filtrów</div>';
      return;
    }
    el.innerHTML = list.map(f => `
      <div class="ab-list-item"><span>${esc(f)}</span><button data-filter="${esc(f)}" title="Usuń">✕</button></div>
    `).join('');
    el.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', () => {
        window.electronAPI.adblockCustomFilterRemove(btn.dataset.filter);
        loadCustomFilters();
      });
    });
  });
}

$('ab-filter-add')?.addEventListener('click', () => {
  const val = $('ab-filter-input').value.trim();
  if (val) {
    window.electronAPI.adblockCustomFilterAdd(val);
    $('ab-filter-input').value = '';
    loadCustomFilters();
    showToast('Dodano filtr');
  }
});
$('ab-filter-input')?.addEventListener('keydown', e => {
  if (e.key === 'Enter') $('ab-filter-add')?.click();
});

// Filter subscriptions (EasyList/uBlock lists)
const SUBSCRIPTION_PRESETS = [
  { name: 'EasyList', url: 'https://easylist.to/easylist/easylist.txt', desc: 'Reklamy (EN)' },
  { name: 'EasyPrivacy', url: 'https://easylist.to/easylist/easyprivacy.txt', desc: 'Trackery' },
  { name: 'uBlock filters – Ads', url: 'https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/filters.min.txt', desc: 'Reklamy uBO' },
  { name: 'uBlock filters – Badware', url: 'https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/badware.txt', desc: 'Złośliwe oprogramowanie/phishing' },
  { name: 'Polskie Filtry', url: 'https://raw.githubusercontent.com/MajkiIT/polish-ads-filter/master/polish-adblock-filters/adblock.txt', desc: 'Polskie reklamy' },
];

function populateSubPresets() {
  const sel = $('ab-sub-preset');
  if (!sel) return;
  sel.innerHTML = '<option value="">— Wybierz listę —</option>' +
    SUBSCRIPTION_PRESETS.map(p => `<option value="${esc(p.url)}">${esc(p.name)} · ${esc(p.desc)}</option>`).join('');
}
populateSubPresets();

const subStatuses = {}; // id -> {status, error}

function renderSubscriptions(subs) {
  const el = $('ab-subscriptions');
  if (!el) return;
  if (!subs || !subs.length) {
    el.innerHTML = '<div style="padding:6px;font-size:10px;color:var(--text-3)">Brak dodanych list filtrów</div>';
    return;
  }
  el.innerHTML = subs.map(s => {
    const st = subStatuses[s.id];
    const statusTxt = st?.status === 'updating' ? 'Aktualizowanie…'
      : st?.status === 'error' ? `⚠ ${esc(st.error || 'Błąd')}`
      : s.lastUpdate ? `${s.rules.toLocaleString()} reguł · ${timeAgo(new Date(s.lastUpdate).toISOString())}`
      : s.updating ? 'Aktualizowanie…' : `${s.rules.toLocaleString()} reguł · Nie pobrano`;
    return `
      <div class="ab-sub-item ${st?.status === 'error' ? 'error' : ''}" data-id="${s.id}">
        <div class="ab-sub-main">
          <div class="ab-sub-name">${esc(s.name)}</div>
          <div class="ab-sub-meta" data-meta="${s.id}">${statusTxt}</div>
        </div>
        <div class="ab-sub-actions">
          <button class="panel-item-btn" data-act="update" data-id="${s.id}" title="Zaktualizuj teraz">↻</button>
          <label class="toggle mini" title="Włącz">
            <input type="checkbox" data-act="toggle" data-id="${s.id}" ${s.enabled ? 'checked' : ''}/>
            <span class="toggle-slider"></span>
          </label>
          <button class="panel-item-btn danger" data-act="remove" data-id="${s.id}" title="Usuń">✕</button>
        </div>
      </div>`;
  }).join('');

  el.querySelectorAll('button[data-act]').forEach(btn => {
    btn.addEventListener('click', async (ev) => {
      ev.stopPropagation();
      const id = btn.dataset.id;
      if (btn.dataset.act === 'update') {
        subStatuses[id] = { status: 'updating' };
        updateSubItemMeta(id);
        await window.electronAPI.adblockSubscriptionUpdate(id);
      } else if (btn.dataset.act === 'remove') {
        window.electronAPI.adblockSubscriptionRemove(id);
        showToast('Usunięto listę filtrów');
      }
    });
  });
  el.querySelectorAll('input[data-act="toggle"]').forEach(tgl => {
    tgl.addEventListener('change', () => {
      window.electronAPI.adblockSubscriptionToggle(tgl.dataset.id, tgl.checked);
    });
  });
}

function updateSubItemMeta(id) {
  const metaEl = document.querySelector(`[data-meta="${id}"]`);
  if (!metaEl) return;
  const st = subStatuses[id];
  if (st?.status === 'updating') metaEl.textContent = 'Aktualizowanie…';
}

async function loadSubscriptions() {
  const subs = await window.electronAPI.adblockSubscriptionsGet();
  renderSubscriptions(subs);
}

$('ab-sub-add-preset')?.addEventListener('click', async () => {
  const url = $('ab-sub-preset').value;
  if (!url) { showToast('Najpierw wybierz listę'); return; }
  const preset = SUBSCRIPTION_PRESETS.find(p => p.url === url);
  const res = await window.electronAPI.adblockSubscriptionAdd({ name: preset?.name, url });
  showToast(res.ok ? `Dodano: ${preset?.name}` : res.error || 'Nie udało się');
});

$('ab-sub-add-custom')?.addEventListener('click', async () => {
  const url = $('ab-sub-custom-url').value.trim();
  if (!url) return;
  const res = await window.electronAPI.adblockSubscriptionAdd({ name: '', url });
  if (res.ok) $('ab-sub-custom-url').value = '';
  showToast(res.ok ? 'Dodano listę filtrów' : res.error || 'Nie udało się');
});
$('ab-sub-custom-url')?.addEventListener('keydown', e => {
  if (e.key === 'Enter') $('ab-sub-add-custom')?.click();
});

$('ab-sub-update-all')?.addEventListener('click', async () => {
  showToast('Aktualizowanie wszystkich list filtrów…');
  await window.electronAPI.adblockSubscriptionsUpdateAll();
  showToast('✓ Zaktualizowano listy filtrów');
});

window.electronAPI.on('adblock-sub-status', (data) => {
  subStatuses[data.id] = { status: data.status, error: data.error };
  updateSubItemMeta(data.id);
  if (data.status === 'ok') {
    setTimeout(() => { delete subStatuses[data.id]; loadSubscriptions(); updateAdblockStats(); }, 1200);
  } else if (data.status === 'error') {
    loadSubscriptions();
  }
});

window.electronAPI.on('adblock-subs-changed', () => {
  loadSubscriptions();
  updateAdblockStats();
});

// Add adblock button to navbar
const btnAdblock = (() => {
  const btn = document.createElement('button');
  btn.className = 'nav-btn';
  btn.id = 'btn-adblock';
  btn.title = 'Ad Blocker';
  btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2l9 4v6c0 5-3.5 9.7-9 11-5.5-1.3-9-6-9-11V6l9-4z" stroke="currentColor" stroke-width="1.8" fill="none"/><path d="M8 12l3 3 5-5" stroke="#00d4a0" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  btn.addEventListener('click', () => { openPanel('adblock'); updateAdblockStats(); loadWhitelist(); loadCustomFilters(); loadSubscriptions(); });
  // Insert before settings
  const settingsBtn = $('btn-settings');
  if (settingsBtn) settingsBtn.parentNode.insertBefore(btn, settingsBtn);
  else $('nav-right')?.appendChild(btn);
  return btn;
})();

// Listen for panel open
const _origOpenPanelAd = openPanel;
openPanel = function(name) {
  _origOpenPanelAd(name);
  if (name === 'adblock') {
    updateAdblockStats();
    loadWhitelist();
    loadCustomFilters();
    loadSubscriptions();
  }
};

// ===== HISTORY =====
async function loadHistoryPanel() {
  const history = await window.electronAPI.historyGet();
  renderFilteredHistory(history, '');
}

function histGroupLabel(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = Date.now() - d.getTime();
  if (d.toDateString() === now.toDateString()) return 'Dziś';
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Wczoraj';
  if (diff < 7 * 86400000) return d.toLocaleDateString(undefined, { weekday: 'long' });
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
}

function histTimeLabel(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = Date.now() - d.getTime();
  if (diff < 3600000) {
    const mins = Math.floor(diff / 60000);
    return mins < 1 ? 'just now' : mins + 'm ago';
  }
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) {
    return 'Yesterday ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' ' +
    d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function hlText(text, q) {
  if (!q) return esc(text);
  const safe = esc(text);
  const re = new RegExp('(' + q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
  return safe.replace(re, '<b class="hist-hl">$1</b>');
}

function renderFilteredHistory(history, q) {
  const list = $('history-list');
  const filtered = q
    ? history.filter(h => h.title?.toLowerCase().includes(q.toLowerCase()) || h.url?.toLowerCase().includes(q.toLowerCase()))
    : history;

  const todayCount = history.filter(h => new Date(h.date).toDateString() === new Date().toDateString()).length;
  const statsEl = $('history-stats');
  if (statsEl) statsEl.textContent = history.length + ' łącznie' + (todayCount ? ' · ' + todayCount + ' dziś' : '');

  if (!filtered.length) {
    const msg = q ? `Brak wyników dla „${esc(q)}"` : 'Brak historii przeglądania.';
    list.innerHTML = `<div class="panel-empty"><div class="panel-empty-icon">🕐</div><span>${msg}</span></div>`;
    return;
  }

  const groups = {};
  const groupOrder = [];
  filtered.forEach(h => {
    const label = histGroupLabel(h.date);
    if (!groups[label]) { groups[label] = []; groupOrder.push(label); }
    groups[label].push(h);
  });

  list.innerHTML = groupOrder.map(day => {
    const items = groups[day];
    return `
      <div class="panel-group-label"><span>${esc(day)}</span><span class="hist-group-count">${items.length}</span></div>
      ${items.map(h => {
        const title = hlText(h.title || h.url, q);
        const urlText = hlText(h.url || '', q);
        const time = histTimeLabel(h.date);
        const initial = (h.title || h.url || '?')[0]?.toUpperCase() || '?';
        return `<div class="panel-item hist-item" data-url="${esc(h.url)}" data-date="${esc(h.date)}">
          <div class="panel-item-icon hist-icon">
            ${h.favicon ? `<img src="${esc(h.favicon)}" width="18" height="18" onerror="this.style.display='none';this.parentElement.classList.add('hist-icon-text')" />` : ''}
            <span class="hist-icon-letter" ${h.favicon ? 'style="display:none"' : ''}>${initial}</span>
          </div>
          <div class="panel-item-info">
            <div class="panel-item-title">${title}</div>
            <div class="panel-item-sub">${urlText}</div>
          </div>
          <span class="hist-time">${time}</span>
          <div class="panel-item-actions">
            <button class="panel-item-btn" data-action="open-new" title="Otwórz w nowej karcie">🚀</button>
            <button class="panel-item-btn" data-action="copy" title="Kopiuj adres URL">🔗</button>
            <button class="panel-item-btn danger" data-action="delete" title="Usuń">🗑</button>
          </div>
        </div>`;
      }).join('')}
    `;
  }).join('');

  list.querySelectorAll('.hist-item').forEach(el => {
    el.addEventListener('click', (e) => {
      if (e.target.closest('.panel-item-btn')) return;
      navigate(el.dataset.url);
      closeAllPanels();
    });
    el.querySelectorAll('.panel-item-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const url = el.dataset.url;
        const action = btn.dataset.action;
        if (action === 'open-new') {
          createTab(url);
          closeAllPanels();
          showToast('Otwarto w nowej karcie');
        } else if (action === 'copy') {
          await navigator.clipboard.writeText(url);
          showToast('Skopiowano adres URL');
        } else if (action === 'delete') {
          await window.electronAPI.historyDelete(url);
          el.style.opacity = '0';
          el.style.transform = 'translateX(30px)';
          setTimeout(() => el.remove(), 200);
          showToast('Usunięto wpis');
        }
      });
    });
  });
  list.querySelectorAll('.hist-icon-text img[onerror]').forEach(img => {
    img.addEventListener('error', () => {
      img.style.display = 'none';
      const letter = img.nextElementSibling;
      if (letter) letter.style.display = '';
    });
  });
}

$('history-search').addEventListener('input', async function () {
  const all = await window.electronAPI.historyGet();
  renderFilteredHistory(all, this.value);
});

$('history-clear-btn').addEventListener('click', async () => {
  const existing = $('hist-clear-modal');
  if (existing) existing.remove();
  const overlay = document.createElement('div');
  overlay.id = 'hist-clear-modal';
  overlay.className = 'as-overlay';
  overlay.innerHTML = `
    <div class="as-card hist-clear-card" role="dialog" aria-modal="true">
      <div class="as-card-glow"></div>
      <div class="as-icon">🗑</div>
      <h3 class="as-title">Wyczyść historię</h3>
      <p class="as-sub">Wybierz, co usunąć z historii przeglądania</p>
      <div class="hist-clear-opts">
        <button class="as-btn as-btn-ghost" data-range="3600000">Ostatnia godzina</button>
        <button class="as-btn as-btn-ghost" data-range="86400000">Ostatnie 24 godziny</button>
        <button class="as-btn as-btn-ghost" data-range="604800000">Ostatnie 7 dni</button>
        <button class="as-btn as-btn-ghost" data-range="2592000000">Ostatnie 30 dni</button>
        <button class="as-btn as-btn-danger" data-range="all">Wyczyść wszystko</button>
      </div>
      <div class="as-actions">
        <button class="as-btn as-btn-ghost" id="hist-clear-cancel">Anuluj</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  function close() { overlay.remove(); }
  overlay.querySelector('#hist-clear-cancel').addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  overlay.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  overlay.querySelectorAll('[data-range]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const range = btn.dataset.range;
      if (range === 'all') {
        await window.electronAPI.historyClear();
      } else {
        await window.electronAPI.historyClearRange(parseInt(range, 10));
      }
      close();
      loadHistoryPanel();
      showToast('Wyczyszczono historię');
    });
  });
});

// ===== DOWNLOADS =====
let _dlFilter = 'all';
let _dlSearchTerm = '';

function getFileMeta(filename) {
  const ext = (filename.split('.').pop() || '').toLowerCase();
  const types = {
    audio: ['mp3','wav','flac','ogg','m4a','aac'],
    video: ['mp4','mkv','avi','mov','webm','flv'],
    image: ['jpg','jpeg','png','gif','webp','svg','ico','bmp','heic'],
    archive: ['zip','rar','7z','tar','gz','bz2','xz'],
    doc: ['pdf','doc','docx','txt','md','rtf','odt','xls','xlsx','csv','ppt','pptx','json','xml'],
    app: ['exe','msi','dmg','pkg','deb','rpm','apk'],
  };
  const type = Object.keys(types).find(k => types[k].includes(ext)) || 'other';
  const colors = {
    audio: '#8b5cf6', video: '#ec4899', image: '#f59e0b', archive: '#10b981',
    doc: '#3b82f6', app: '#f43f5e', other: '#64748b',
  };
  return { ext, type, color: colors[type] };
}

function formatETA(seconds) {
  if (!seconds || !isFinite(seconds) || seconds < 0) return '';
  if (seconds < 60) return Math.round(seconds) + 's left';
  const m = Math.floor(seconds / 60);
  if (m < 60) return m + 'm left';
  const h = Math.floor(m / 60);
  return h + 'h ' + (m % 60) + 'm left';
}

// Receive events from main
window.electronAPI.on('download-started', (dl) => {
  activeDownloads[dl.id] = { ...dl, progress: 0, speed: 0, startedAt: Date.now(), paused: false, canPause: dl.canPause, canResume: dl.canResume };
  renderActiveDownload(dl.id);
  showDownloadToast(dl.id);
  updateDlBadge();
  _refreshDlSummary();
  if (!panelDownloads.classList.contains('hidden')) renderDownloadsPanel();
});

window.electronAPI.on('download-progress', (data) => {
  if (activeDownloads[data.id]) {
    activeDownloads[data.id].receivedBytes = data.receivedBytes;
    activeDownloads[data.id].totalBytes = data.totalBytes;
    activeDownloads[data.id].speed = data.speed;
    if (typeof data.canPause === 'boolean') activeDownloads[data.id].canPause = data.canPause;
    if (typeof data.canResume === 'boolean') activeDownloads[data.id].canResume = data.canResume;
    const pct = data.totalBytes > 0 ? Math.round((data.receivedBytes / data.totalBytes) * 100) : 0;
    activeDownloads[data.id].progress = pct;
    updateActiveDownloadUI(data.id, pct, data.speed, data.receivedBytes, data.totalBytes);
    syncDownloadButtons(data.id);
    updateToastProgress(data.id, pct, data.speed);
    _refreshDlSummary();
  }
});

window.electronAPI.on('download-completed', (data) => {
  delete activeDownloads[data.id];
  removeActiveDownloadUI(data.id);
  finishToast(data.id, data.filename, data.savePath);
  updateDlBadge();
  _refreshDlSummary();
  if (activePanel === 'downloads') renderDownloadsPanel();
});

window.electronAPI.on('download-failed', (data) => {
  delete activeDownloads[data.id];
  removeActiveDownloadUI(data.id);
  failToast(data.id);
  updateDlBadge();
  _refreshDlSummary();
  if (activePanel === 'downloads') renderDownloadsPanel();
});

function updateDlBadge() {
  const count = Object.keys(activeDownloads).length;
  if (count > 0) {
    dlBadge.textContent = count;
    dlBadge.classList.remove('hidden');
  } else {
    dlBadge.classList.add('hidden');
  }
}

function _refreshDlSummary() {
  const active = Object.values(activeDownloads).filter(d => !d.paused);
  const totalSpeed = active.reduce((s, d) => s + (d.speed || 0), 0);
  const activeCount = Object.keys(activeDownloads).length;
  const num = id => { const el = $(id); if (el) el.textContent = id === 'dl-sum-speed' ? (activeCount ? formatSpeed(totalSpeed) : '—') : String(id === 'dl-sum-total' ? 0 : activeCount); };
  num('dl-sum-active');
  num('dl-sum-speed');
  const totalEl = $('dl-sum-total');
  if (totalEl) window.electronAPI.downloadsGet().then(h => { totalEl.textContent = String((h || []).length); }).catch(() => {});
}

function renderActiveDownload(id) {
  const dl = activeDownloads[id];
  const container = $('active-downloads');
  const meta = getFileMeta(dl.filename);
  const el = document.createElement('div');
  el.className = 'dl-active-item';
  el.id = `dl-active-${id}`;
  el.setAttribute('data-id', id);
  el.innerHTML = `
    <div class="dl-active-header">
      <span class="dl-status-icon" style="border-color:${meta.color}55;background:${meta.color}14">${getFileIcon(dl.filename)}</span>
      <div class="dl-active-main">
        <div class="dl-active-name" title="${esc(dl.filename)}">${esc(dl.filename)}</div>
        <div class="dl-active-meta">
          <span id="dl-sz-${id}">—</span>
          <span id="dl-speed-${id}">Starting…</span>
          <span id="dl-eta-${id}" class="dl-eta"></span>
        </div>
      </div>
      <div class="dl-pct-big" id="dl-pct-${id}">0%</div>
    </div>
    <div class="dl-progress-track">
      <div class="dl-progress-fill" id="dl-pf-${id}" style="width:0%"></div>
      <div class="dl-progress-dot" id="dl-pd-${id}" style="left:0%"></div>
    </div>
    <div class="dl-active-actions">
      <button class="dl-ctl-btn" id="dl-pause-${id}"><svg viewBox="0 0 24 24" width="14" fill="currentColor"><path d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg></button>
      <button class="dl-ctl-btn danger" id="dl-cancel-${id}" title="Cancel"><svg viewBox="0 0 24 24" width="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
    </div>
  `;
  container.prepend(el);

  $(`dl-pause-${id}`).addEventListener('click', () => toggleDownloadPause(id));
  $(`dl-cancel-${id}`).addEventListener('click', () => cancelDownload(id));
  syncDownloadButtons(id);
}

function toggleDownloadPause(id) {
  const dl = activeDownloads[id];
  if (!dl || dl.paused === undefined) return;
  if (dl.paused) {
    window.electronAPI.downloadResume(id);
    dl.paused = false;
  } else {
    window.electronAPI.downloadPause(id);
    dl.paused = true;
  }
  syncDownloadButtons(id);
  _refreshDlSummary();
}

function cancelDownload(id) {
  window.electronAPI.downloadCancel(id);
  delete activeDownloads[id];
  removeActiveDownloadUI(id);
  updateDlBadge();
  _refreshDlSummary();
  showToast('Anulowano pobieranie');
}

function syncDownloadButtons(id) {
  const dl = activeDownloads[id];
  if (!dl) return;
  const btn = $(`dl-pause-${id}`);
  const fill = $(`dl-pf-${id}`);
  const dot = $(`dl-pd-${id}`);
  const speedEl = $(`dl-speed-${id}`);
  const etaEl = $(`dl-eta-${id}`);
  const item = $(`dl-active-${id}`);
  if (btn) {
    btn.innerHTML = dl.paused
      ? '<svg viewBox="0 0 24 24" width="14" fill="currentColor"><path d="M6 4l14 8-14 8z"/></svg>'
      : '<svg viewBox="0 0 24 24" width="14" fill="currentColor"><path d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg>';
    btn.title = dl.paused ? 'Wznów' : 'Wstrzymaj';
    btn.classList.toggle('is-paused', !!dl.paused);
    btn.disabled = dl.paused ? !dl.canResume : !dl.canPause;
    btn.setAttribute('data-label', dl.paused ? 'resume' : 'pause');
  }
  if (fill) fill.classList.toggle('paused', !!dl.paused);
  if (dot) dot.classList.toggle('paused', !!dl.paused);
  if (item) item.classList.toggle('is-paused', !!dl.paused);
  if (speedEl && dl.paused) speedEl.textContent = 'Wstrzymano';
  if (etaEl) etaEl.textContent = dl.paused ? '' : formatETA(((dl.totalBytes || 0) - (dl.receivedBytes || 0)) / (dl.speed || 0));
}

function updateActiveDownloadUI(id, pct, speed, received, total) {
  const pf = $(`dl-pf-${id}`);
  const dot = $(`dl-pd-${id}`);
  const sp = $(`dl-speed-${id}`);
  const pctEl = $(`dl-pct-${id}`);
  const sz = $(`dl-sz-${id}`);
  const etaEl = $(`dl-eta-${id}`);
  if (pf) pf.style.width = pct + '%';
  if (dot) dot.style.left = `calc(${pct}% - ${pct * 0.06}px)`;
  if (sp && !activeDownloads[id]?.paused) sp.textContent = formatSpeed(speed);
  if (pctEl) pctEl.textContent = pct + '%';
  if (sz) sz.textContent = `${formatBytes(received)} / ${formatBytes(total)}`;
  if (etaEl && speed > 0 && total > 0) etaEl.textContent = formatETA((total - received) / speed);
}

function removeActiveDownloadUI(id) {
  $(`dl-active-${id}`)?.remove();
  _refreshDlSummary();
  if (!panelDownloads.classList.contains('hidden')) renderDownloadsPanel();
}

function renderActiveSection() {
  const container = $('active-downloads');
  const ids = Object.keys(activeDownloads);
  if (ids.length === 0) {
    container.innerHTML = '';
    return;
  }
  ids.forEach(id => { if (!$(`dl-active-${id}`)) renderActiveDownload(id); });
}

function renderDownloadsPanel() {
  renderActiveSection();
  loadDownloadsHistory();
}

async function loadDownloadsHistory() {
  const list = $('downloads-list');
  const history = (await window.electronAPI.downloadsGet()) || [];
  const term = _dlSearchTerm.trim().toLowerCase();
  let filtered = history;
  if (term) filtered = filtered.filter(d => (d.filename || '').toLowerCase().includes(term));
  if (_dlFilter === 'active') filtered = filtered.filter(d => activeDownloads[d.id]);
  if (_dlFilter === 'completed') filtered = filtered.filter(d => !activeDownloads[d.id]);
  const hasActive = Object.keys(activeDownloads).length > 0;

  if (!filtered.length) {
    const emptyText = (history.length === 0)
      ? (hasActive ? '' : 'Brak pobierania.')
      : 'Nic tutaj nie ma.';
    list.innerHTML = `<div class="panel-empty"><div class="panel-empty-icon">📥</div><span>${emptyText}</span></div>`;
    return;
  }

  list.innerHTML = filtered.map(dl => {
    const meta = getFileMeta(dl.filename || '');
    const isActive = !!activeDownloads[dl.id];
    return `
    <div class="dl-history-item" data-path="${esc(dl.savePath)}">
      <div class="dl-file-icon" style="border-color:${meta.color}44;background:${meta.color}12;color:${meta.color}">
        <svg viewBox="0 0 24 24" width="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>
        <span class="dl-file-ext">${esc(dl.filename ? dl.filename.split('.').pop().slice(0,4).toUpperCase() : 'FILE')}</span>
      </div>
      <div class="dl-info">
        <div class="dl-name" title="${esc(dl.filename)}">${esc(dl.filename)}${isActive ? ' <span class="dl-badge-active">●</span>' : ''}</div>
        <div class="dl-meta">${formatBytes(dl.size)} · ${timeAgo(dl.date)}</div>
      </div>
      <div class="dl-actions">
        <button class="dl-act-btn" data-action="open" data-path="${esc(dl.savePath)}" title="Otwórz plik"><svg viewBox="0 0 24 24" width="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6"/><path d="M10 14L21 3"/></svg></button>
        <button class="dl-act-btn" data-action="folder" data-path="${esc(dl.savePath)}" title="Pokaż w folderze"><svg viewBox="0 0 24 24" width="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg></button>
        <button class="dl-act-btn danger" data-action="delete" data-id="${esc(dl.id)}" title="Usuń z listy"><svg viewBox="0 0 24 24" width="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg></button>
      </div>
    </div>`;
  }).join('');

  list.querySelectorAll('.dl-history-item').forEach(el => {
    el.addEventListener('click', e => {
      const btn = e.target.closest('[data-action]');
      const action = btn?.dataset.action;
      if (!action) { window.electronAPI.openFile(el.dataset.path); return; }
      const path = btn.dataset.path;
      if (action === 'open') { window.electronAPI.openFile(path); return; }
      if (action === 'folder') { window.electronAPI.showInFolder(path); return; }
      if (action === 'delete') {
        e.stopPropagation();
        window.electronAPI.downloadsDeleteOne(btn.dataset.id);
        el.style.opacity = '0';
        setTimeout(() => loadDownloadsHistory(), 150);
      }
    });
  });
}

$('dl-search').addEventListener('input', (e) => {
  _dlSearchTerm = e.target.value;
  loadDownloadsHistory();
});

document.querySelectorAll('.dl-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.dl-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    _dlFilter = tab.dataset.filter;
    loadDownloadsHistory();
  });
});

$('dl-clear-btn').addEventListener('click', () => {
  if (confirm('Wyczyścić całą historię pobierania?')) {
    window.electronAPI.downloadsClear();
    loadDownloadsHistory();
    showToast('Wyczyszczono historię pobierania');
  }
});

// ===== DOWNLOAD TOAST =====
function showDownloadToast(id) {
  const dl = activeDownloads[id];
  if (!dl) return;
  const container = $('downloads-toast-container');
  const toast = document.createElement('div');
  toast.className = 'dl-toast';
  toast.id = `toast-${id}`;
  toast.innerHTML = `
    <div class="dl-toast-header">
      <span>${getFileIcon(dl.filename)}</span>
      <span class="dl-toast-title">${esc(dl.filename)}</span>
      <button class="dl-toast-close" data-id="${id}">✕</button>
    </div>
    <div class="dl-toast-bar"><div class="dl-toast-fill" id="tf-${id}" style="width:0%"></div></div>
    <div class="dl-toast-meta">
      <span id="ts-${id}">Pobieranie...</span>
      <span id="tp-${id}">0%</span>
    </div>
  `;
  toast.querySelector('.dl-toast-close').addEventListener('click', () => closeToast(toast));
  container.appendChild(toast);
}

function closeToast(toast) {
  toast.classList.add('closing');
  setTimeout(() => toast.remove(), 200);
}

function updateToastProgress(id, pct, speed) {
  const fill = $(`tf-${id}`);
  const sp = $(`ts-${id}`);
  const pp = $(`tp-${id}`);
  if (fill) fill.style.width = pct + '%';
  if (sp) sp.textContent = formatSpeed(speed);
  if (pp) pp.textContent = pct + '%';
}

function finishToast(id, filename, savePath) {
  const toast = $(`toast-${id}`);
  if (!toast) {
    // Create completion toast
    const container = $('downloads-toast-container');
    const t = document.createElement('div');
    t.className = 'dl-toast';
    t.innerHTML = `
      <div class="dl-toast-header">
        <span>✅</span>
        <span class="dl-toast-title">${esc(filename)} — zakończono</span>
        <button class="dl-toast-close">✕</button>
      </div>
      <div class="dl-toast-meta"><span style="color:var(--green);opacity:1">Pobieranie zakończone</span><button class="dl-toast-open" data-path="${esc(savePath)}">Otwórz</button></div>
    `;
    t.querySelector('.dl-toast-close').addEventListener('click', () => closeToast(t));
    t.querySelector('.dl-toast-open')?.addEventListener('click', () => window.electronAPI.openFile(savePath));
    container.appendChild(t);
    setTimeout(() => closeToast(t), 8000);
    return;
  }
  toast.innerHTML = `
    <div class="dl-toast-header">
      <span>✅</span>
      <span class="dl-toast-title">${esc(filename)} — zakończono</span>
      <button class="dl-toast-close">✕</button>
    </div>
    <div class="dl-toast-bar"><div class="dl-toast-fill" style="width:100%"></div></div>
    <div class="dl-toast-meta">
      <span style="color:var(--green);opacity:1">Zakończono</span>
      <button class="dl-toast-open" data-path="${esc(savePath)}">Otwórz</button>
    </div>
  `;
  toast.querySelector('.dl-toast-close').addEventListener('click', () => closeToast(toast));
  toast.querySelector('.dl-toast-open')?.addEventListener('click', () => window.electronAPI.openFile(savePath));
  setTimeout(() => closeToast(toast), 8000);
}

function failToast(id) {
  const toast = $(`toast-${id}`);
  if (toast) {
    toast.innerHTML = `<div class="dl-toast-header"><span>❌</span><span class="dl-toast-title">Nie udało się pobrać</span><button class="dl-toast-close">✕</button></div>`;
    toast.querySelector('.dl-toast-close').addEventListener('click', () => closeToast(toast));
    setTimeout(() => closeToast(toast), 4000);
  }
}

// ===== WAVEPASS (Password Manager) =====
let _wpUnlocked = false;
let _wpData = [];
let _wpFiltered = [];
let _wpRevealed = {};

async function loadPasswordsPanel() {
  const autoLockSel = $('wp-auto-lock');
  if (autoLockSel) autoLockSel.value = String(settings.wpAutoLock ?? 5);
  const hasPin = await window.electronAPI.passwordsHasPin();
  $('wp-lock-btn').classList.toggle('hidden', !hasPin);

  if (!hasPin) {
    // No PIN set — show setup mode
    $('wp-locked').classList.remove('hidden');
    $('wp-vault').classList.add('hidden');
    $('wp-unlock-error').textContent = '';
    $('wp-lock-icon').textContent = '🔑';
    $('wp-lock-title').textContent = 'Witaj w WavePass';
    $('wp-lock-sub').textContent = 'Wybierz główny PIN (4-6 cyfr), aby zabezpieczyć swoje hasła';
    $('wp-unlock-input').placeholder = 'Utwórz PIN';
    $('wp-unlock-input').value = '';
    $('wp-unlock-input').classList.remove('hidden');
    $('wp-unlock-input').focus();
    $('wp-unlock-btn').textContent = 'Ustaw PIN';
    $('wp-unlock-btn').classList.remove('hidden');
    $('wp-setup-btn').classList.add('hidden');
    return;
  }

  const unlocked = await window.electronAPI.passwordsIsUnlocked();
  _wpUnlocked = unlocked;
  if (unlocked) {
    $('wp-locked').classList.add('hidden');
    $('wp-vault').classList.remove('hidden');
    renderPasswordsList();
  } else {
    $('wp-locked').classList.remove('hidden');
    $('wp-vault').classList.add('hidden');
    $('wp-unlock-error').textContent = '';
    $('wp-lock-icon').textContent = '🔐';
    $('wp-lock-title').textContent = 'Sejf zablokowany';
    $('wp-lock-sub').textContent = 'Wpisz główny PIN, aby odblokować';
    $('wp-unlock-input').placeholder = 'Wpisz PIN';
    $('wp-unlock-input').value = '';
    $('wp-unlock-input').classList.remove('hidden');
    $('wp-unlock-input').focus();
    $('wp-unlock-btn').textContent = 'Odblokuj';
    $('wp-unlock-btn').classList.remove('hidden');
    $('wp-setup-btn').classList.add('hidden');
  }
}

// ===== PASSWORD GENERATOR =====
function generatePassword(length = 16, opts = {}) {
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const digits = '0123456789';
  const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  let chars = upper + lower + digits;
  if (opts.symbols !== false) chars += symbols;
  let pwd = '';
  // Ensure at least one of each type
  pwd += upper[Math.floor(Math.random() * upper.length)];
  pwd += lower[Math.floor(Math.random() * lower.length)];
  pwd += digits[Math.floor(Math.random() * digits.length)];
  if (opts.symbols !== false) pwd += symbols[Math.floor(Math.random() * symbols.length)];
  for (let i = pwd.length; i < length; i++) {
    pwd += chars[Math.floor(Math.random() * chars.length)];
  }
  return pwd.split('').sort(() => Math.random() - 0.5).join('');
}

function passwordStrength(pwd) {
  let score = 0;
  if (pwd.length >= 10) score++;
  if (pwd.length >= 16) score++;
  if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score++;
  if (/\d/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  return { label: ['Bardzo słabe', 'Słabe', 'Średnie', 'Dobre', 'Silne', 'Bardzo silne'][score], score };
}

function updateGeneratedPassword() {
  const len = Math.min(64, Math.max(8, parseInt($('wp-gen-len')?.value || '16', 10)));
  const sym = $('wp-gen-symbols')?.checked !== false;
  const pwd = generatePassword(len, { symbols: sym });
  $('wp-gen-pwd').textContent = pwd;
  const st = passwordStrength(pwd);
  const fill = $('wp-gen-strength-fill');
  if (fill) fill.style.width = Math.round(((st.score + 1) / 6) * 100) + '%';
  const lab = $('wp-gen-strength-label');
  if (lab) lab.textContent = st.label;
  const val = $('wp-gen-len-val');
  if (val) val.textContent = len;
}

$('btn-gen-password')?.addEventListener('click', () => {
  $('wp-gen-result').classList.remove('hidden');
  updateGeneratedPassword();
});

$('wp-gen-len')?.addEventListener('input', updateGeneratedPassword);
$('wp-gen-symbols')?.addEventListener('change', updateGeneratedPassword);

$('wp-gen-copy')?.addEventListener('click', () => {
  const pwd = $('wp-gen-pwd').textContent;
  if (pwd) copySensitive(pwd, 'Hasło');
});

$('wp-gen-close')?.addEventListener('click', () => {
  $('wp-gen-result').classList.add('hidden');
});

function renderPasswordsList() {
  const list = $('wp-list');
  const q = ($('wp-search')?.value || '').toLowerCase();
  const items = q ? _wpFiltered : _wpData;
  if (!items.length) {
    const msg = q ? `Brak haseł pasujących do „${q}"` : 'Brak zapisanych haseł.<br>Zaloguj się na stronie, a WavePass zaproponuje zapisanie.';
    list.innerHTML = `<div class="panel-empty"><div class="panel-empty-icon">🔑</div><span>${msg}</span></div>`;
    return;
  }
  list.innerHTML = items.map(p => {
    const host = getHost(p.url);
    const initial = host ? host[0].toUpperCase() : '?';
    const revealed = _wpRevealed[p.id] === true;
    const pwRow = revealed
      ? `<div class="wp-item-password">${esc(p.password)}</div>`
      : `<div class="wp-item-mask">••••••••</div>`;
    return `<div class="wp-item" data-id="${esc(p.id)}">
      <div class="wp-item-icon">${initial}</div>
      <div class="wp-item-info">
        <div class="wp-item-site">${esc(host || p.url)}</div>
        <div class="wp-item-username">${esc(p.username || '—')}</div>
        ${pwRow}
      </div>
      <div class="wp-item-actions">
        <button class="wp-item-btn" data-action="reveal" title="${revealed ? 'Ukryj hasło' : 'Pokaż hasło'}">${revealed ? '🙈' : '👁'}</button>
        <button class="wp-item-btn" data-action="copy-user" title="Kopiuj nazwę użytkownika">👤</button>
        <button class="wp-item-btn" data-action="copy-pass" title="Kopiuj hasło">🔑</button>
        <button class="wp-item-btn" data-action="edit" title="Edytuj wpis">✏️</button>
        <button class="wp-item-btn danger" data-action="delete" title="Usuń">🗑</button>
      </div>
    </div>`;
  }).join('');
  list.querySelectorAll('.wp-item-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const item = btn.closest('.wp-item');
      const entry = _wpData.find(p => p.id === item.dataset.id);
      if (!entry) return;
      const action = btn.dataset.action;
      if (action === 'copy-user') {
        await navigator.clipboard.writeText(entry.username);
        showToast('Skopiowano nazwę użytkownika');
      } else if (action === 'copy-pass') {
        copySensitive(entry.password, 'Hasło');
      } else if (action === 'reveal') {
        _wpRevealed[entry.id] = !_wpRevealed[entry.id];
        renderPasswordsList();
      } else if (action === 'edit') {
        openPasswordEditor(entry);
      } else if (action === 'delete') {
        if (!confirm('Usunąć to hasło?')) return;
        await window.electronAPI.passwordsDelete(entry.id);
        _wpData = _wpData.filter(p => p.id !== entry.id);
        filterPasswordsList();
        renderPasswordsList();
        showToast('Usunięto hasło');
      }
    });
  });
  list.querySelectorAll('.wp-item').forEach(el => {
    el.addEventListener('click', (e) => {
      if (e.target.closest('.wp-item-btn')) return;
      const entry = _wpData.find(p => p.id === el.dataset.id);
      if (entry) openPasswordEditor(entry);
    });
  });
}

// ===== COMMAND PALETTE (Ctrl+K) =====
const CMD_COMMANDS = [
  { name: 'Nowa karta', desc: 'Otwórz nową kartę', icon: '➕', shortcut: 'Ctrl+T', action: () => createTab(), cat: 'Karty' },
  { name: 'Zamknij kartę', desc: 'Zamknij bieżącą kartę', icon: '❌', shortcut: 'Ctrl+W', action: () => closeTab(activeTabId), cat: 'Karty' },
  { name: 'Przywróć zamkniętą kartę', desc: 'Przywróć ostatnio zamkniętą kartę', icon: '♻️', shortcut: 'Ctrl+Shift+T', action: () => reopenClosedTab(), cat: 'Karty' },
  { name: 'Następna karta', desc: 'Przełącz na następną kartę', icon: '➡️', shortcut: 'Ctrl+Tab', action: () => { const i = tabs.findIndex(t => t.id === activeTabId); if (tabs[i + 1]) switchTab(tabs[i + 1].id); else if (tabs[0]) switchTab(tabs[0].id); }, cat: 'Karty' },
  { name: 'Poprzednia karta', desc: 'Przełącz na poprzednią kartę', icon: '⬅️', shortcut: 'Ctrl+Shift+Tab', action: () => { const i = tabs.findIndex(t => t.id === activeTabId); if (tabs[i - 1]) switchTab(tabs[i - 1].id); else if (tabs[tabs.length - 1]) switchTab(tabs[tabs.length - 1].id); }, cat: 'Karty' },
  { name: 'Przypnij kartę', desc: 'Przypnij / odepnij bieżącą kartę', icon: '📌', action: () => { const t = tabs.find(t => t.id === activeTabId); if (t) pinTab(t.id); }, cat: 'Karty' },

  { name: 'Wstecz', desc: 'Nawiguj do tyłu', icon: '◀️', shortcut: 'Alt+←', action: () => btnBack.click(), cat: 'Nawigacja' },
  { name: 'Dalej', desc: 'Nawiguj do przodu', icon: '▶️', shortcut: 'Alt+→', action: () => btnForward.click(), cat: 'Nawigacja' },
  { name: 'Odśwież stronę', desc: 'Odśwież bieżącą stronę', icon: '🔄', shortcut: 'Ctrl+R', action: () => btnReload.click(), cat: 'Nawigacja' },
  { name: 'Strona główna', desc: 'Przejdź do strony głównej', icon: '🏠', action: () => goHome(), cat: 'Nawigacja' },
  { name: 'Pasek adresu', desc: 'Edytuj bieżący adres URL', icon: '🔗', shortcut: 'Ctrl+L', action: () => { urlBar.focus(); urlBar.select(); }, cat: 'Nawigacja' },

  { name: 'Powiększ', desc: 'Zwiększ poziom powiększenia', icon: '🔍', shortcut: 'Ctrl++', action: () => setZoom(0.1), cat: 'Widok' },
  { name: 'Pomniejsz', desc: 'Zmniejsz poziom powiększenia', icon: '🔎', shortcut: 'Ctrl+-', action: () => setZoom(-0.1), cat: 'Widok' },
  { name: 'Resetuj powiększenie', desc: 'Przywróć 100%', icon: '1️⃣', shortcut: 'Ctrl+0', action: () => { const t = tabs.find(t => t.id === activeTabId); if (t?.webview) { t.zoom = 1; t.webview.setZoomFactor(1); } }, cat: 'Widok' },
  { name: 'Pełny ekran', desc: 'Wejdź / wyjdź z pełnego ekranu', icon: '⛶', shortcut: 'F11', action: () => toggleFullscreen(), cat: 'Widok' },
  { name: 'Pionowe karty', desc: 'Przełącz układ kart', icon: '📐', action: () => toggleVerticalTabs(), cat: 'Widok' },
  { name: 'Pasek zakładek', desc: 'Pokaż / ukryj pasek zakładek', icon: '🔖', action: () => toggleBookmarksBar(), cat: 'Widok' },
  { name: 'Szukaj na stronie', desc: 'Wyszukaj tekst na stronie', icon: '🔎', shortcut: 'Ctrl+F', action: () => openFindBar(), cat: 'Widok' },
  { name: 'Pokaż kod źródłowy', desc: 'Zobacz kod HTML', icon: '📄', action: () => { const t = tabs.find(t => t.id === activeTabId); if (t?.url) createTab('view-source:' + t.url); }, cat: 'Widok' },
  { name: 'Zrzut ekranu', desc: 'Przechwyć widoczną stronę', icon: '📸', shortcut: 'Ctrl+Shift+S', action: () => takeScreenshot(), cat: 'Widok' },
  { name: 'Zrzut ekranu – obszar', desc: 'Przeciągnij, aby zaznaczyć obszar', icon: '🖼️', action: () => startRegionScreenshot(), cat: 'Widok' },
  { name: 'Zrzut ekranu – cała strona', desc: 'Przechwyć całą przewijaną stronę', icon: '📄', action: () => takeFullPageScreenshot(), cat: 'Widok' },
  { name: 'Obraz w obrazie', desc: 'Pływający odtwarzacz wideo', icon: '📺', action: () => togglePiP(), cat: 'Widok' },

  { name: 'Otwórz pobieranie', desc: 'Menedżer pobierania', icon: '⬇️', shortcut: 'Ctrl+J', action: () => openPanel('downloads'), cat: 'Panele' },
  { name: 'Otwórz historię', desc: 'Historia przeglądania', icon: '📜', shortcut: 'Ctrl+H', action: () => openPanel('history'), cat: 'Panele' },
  { name: 'Otwórz zakładki', desc: 'Menedżer zakładek', icon: '🔖', shortcut: 'Ctrl+B', action: () => openPanel('bookmarks'), cat: 'Panele' },
  { name: 'Otwórz hasła', desc: 'Menedżer haseł', icon: '🔑', shortcut: 'Ctrl+Shift+P', action: () => openPanel('passwords'), cat: 'Panele' },
  { name: 'Otwórz notatki', desc: 'Szybkie notatki', icon: '📝', action: () => openPanel('notes'), cat: 'Panele' },
  { name: 'Otwórz ustawienia', desc: 'Ustawienia przeglądarki', icon: '⚙️', action: () => openPanel('settings'), cat: 'Panele' },
  { name: 'Otwórz asystenta AI', desc: 'Czat z AI', icon: '🤖', shortcut: 'Ctrl+I', action: () => openPanel('ai-sidebar'), cat: 'Panele' },
  { name: 'Otwórz skrypty', desc: 'Zarządzaj skryptami', icon: '📜', action: () => openPanel('scripts'), cat: 'Panele' },
  { name: 'Otwórz schowek', desc: 'Historia schowka', icon: '📋', action: () => { openPanel('clipboard'); renderClipboardPanel(); }, cat: 'Panele' },
  { name: 'Otwórz sesje', desc: 'Menedżer sesji', icon: '📑', action: () => openPanel('sessions'), cat: 'Panele' },
  { name: 'Otwórz rozszerzenia', desc: 'Menedżer rozszerzeń', icon: '🧩', action: () => openPanel('extensions'), cat: 'Panele' },
  { name: 'Otwórz wydajność', desc: 'Monitor systemu', icon: '📊', action: () => { openPanel('perf'); renderPerfPanel(); }, cat: 'Panele' },
  { name: 'Otwórz bloker reklam', desc: 'Ustawienia blokera reklam', icon: '🛡', action: () => openPanel('adblock'), cat: 'Panele' },

  { name: 'Przełącz tryb ciemny', desc: 'Odwróć kolory stron', icon: '🌙', action: () => { settings.darkMode = !settings.darkMode; applyDarkMode(); saveSettings(); }, cat: 'Funkcje' },
  { name: 'Tryb czytnika', desc: 'Czysty widok do czytania', icon: '📖', action: () => toggleReaderMode(), cat: 'Funkcje' },
  { name: 'Przetłumacz stronę', desc: 'Przetłumacz tę stronę', icon: '🌐', action: () => { const lang = prompt('Tłumacz na (kod języka):', 'pl'); if (lang) translatePage(lang); }, cat: 'Funkcje' },
  { name: 'Wyczyść dane przeglądania', desc: 'Wyczyść pamięć podręczną, cookies, historię', icon: '🗑', action: () => clearBrowsingData(), cat: 'Funkcje' },
  { name: 'Nowa karta incognito', desc: 'Prywatne przeglądanie', icon: '🕵', action: () => createTab(null, true), cat: 'Funkcje' },
  { name: 'DevTools', desc: 'Otwórz narzędzia deweloperskie', icon: '🔧', shortcut: 'F12', action: () => toggleDevTools(), cat: 'Funkcje' },
  { name: 'Wycisz wszystkie karty', desc: 'Wycisz / odcisz wszystkie karty', icon: '🔇', shortcut: 'Ctrl+M', action: () => { const anyMuted = tabs.some(t => t.muted); muteAllTabs(!anyMuted); }, cat: 'Funkcje' },
];

let _cmdIdx = 0;
let _cmdFiltered = [];

function openCommandPalette() {
  const el = $('cmd-palette');
  const input = $('cmd-input');
  el.classList.remove('hidden');
  input.value = '';
  input.focus();
  _cmdIdx = 0;
  filterCommands('');
}
function closeCommandPalette() {
  $('cmd-palette').classList.add('hidden');
}
function filterCommands(q) {
  const list = $('cmd-results');
  q = q.toLowerCase().trim();
  _cmdFiltered = q ? CMD_COMMANDS.filter(c =>
    c.name.toLowerCase().includes(q) || c.desc.toLowerCase().includes(q) || c.cat.toLowerCase().includes(q)
  ) : CMD_COMMANDS.slice();
  _cmdIdx = 0;

  let html = '';
  let lastCat = '';
  _cmdFiltered.forEach((cmd, i) => {
    if (cmd.cat !== lastCat) {
      lastCat = cmd.cat;
      html += `<div class="cmd-category">${esc(cmd.cat)}</div>`;
    }
    html += `<div class="cmd-item${i === 0 ? ' selected' : ''}" data-idx="${i}">
      <div class="cmd-item-icon">${cmd.icon}</div>
      <div class="cmd-item-info">
        <div class="cmd-item-name">${esc(cmd.name)}</div>
        <div class="cmd-item-desc">${esc(cmd.desc)}</div>
      </div>
      ${cmd.shortcut ? `<span class="cmd-item-shortcut">${esc(cmd.shortcut)}</span>` : ''}
    </div>`;
  });
  list.innerHTML = html;
  list.querySelectorAll('.cmd-item').forEach(el => {
    el.addEventListener('click', () => {
      const idx = parseInt(el.dataset.idx);
      closeCommandPalette();
      _cmdFiltered[idx]?.action();
    });
  });
}
function moveCmd(delta) {
  const items = $('cmd-results')?.querySelectorAll('.cmd-item') || [];
  if (!items.length) return;
  items[_cmdIdx]?.classList.remove('selected');
  _cmdIdx = (_cmdIdx + delta + items.length) % items.length;
  items[_cmdIdx]?.classList.add('selected');
  items[_cmdIdx]?.scrollIntoView({ block: 'nearest' });
}

$('cmd-input')?.addEventListener('input', e => filterCommands(e.target.value));
$('cmd-input')?.addEventListener('keydown', e => {
  if (e.key === 'ArrowDown') { e.preventDefault(); moveCmd(1); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); moveCmd(-1); }
  else if (e.key === 'Enter') { e.preventDefault(); closeCommandPalette(); _cmdFiltered[_cmdIdx]?.action(); }
  else if (e.key === 'Escape') { closeCommandPalette(); }
});
$('.cmd-backdrop')?.addEventListener('click', closeCommandPalette);

// ===== QUICK SWITCHER (Ctrl+Tab) =====
let _qsActive = false;
let _qsIdx = 0;
let _qsList = [];

function openQuickSwitcher() {
  _qsActive = true;
  _qsIdx = tabs.findIndex(t => t.id === activeTabId);
  _qsList = [...tabs];
  renderQuickSwitcher();
  $('quick-switcher')?.classList.remove('hidden');
}
function closeQuickSwitcher() {
  _qsActive = false;
  $('quick-switcher')?.classList.add('hidden');
}
function renderQuickSwitcher() {
  const list = $('qs-list');
  if (!list) return;
  list.innerHTML = _qsList.map((t, i) => `
    <div class="qs-item${i === _qsIdx ? ' active' : ''}" data-idx="${i}">
      <img class="qs-favicon" src="${t.favicon || defaultFavicon()}" onerror="this.src='${defaultFavicon()}'" />
      <div class="qs-info">
        <div class="qs-title">${esc(t.title || 'Nowa karta')}</div>
        <div class="qs-url">${esc(t.url || 'about:blank')}</div>
      </div>
    </div>
  `).join('');
  list.querySelectorAll('.qs-item').forEach(el => {
    el.addEventListener('click', () => {
      const idx = parseInt(el.dataset.idx);
      closeQuickSwitcher();
      if (_qsList[idx]) switchTab(_qsList[idx].id);
    });
  });
}

// ===== VERTICAL TABS =====
function toggleVerticalTabs() {
  document.body.classList.toggle('vertical-tabs');
  $('tabsbar')?.classList.toggle('vertical-mode');
  const btn = $('btn-vertical-tabs');
  if (btn) btn.classList.toggle('active');
  localStorage.setItem('ww_vertical_tabs', document.body.classList.contains('vertical-tabs') ? '1' : '');
}

// ===== TAB GROUPS =====
const GROUP_COLORS = ['#ff1a35','#ff4444','#ff8800','#ffcc00','#00d4a0','#00a8ff','#6c63ff','#cc44ff','#ff44aa','#888888'];
let _groupMenuOpen = false;

function showGroupMenu(tabId, x, y) {
  closeGroupMenu();
  const tab = tabs.find(t => t.id === tabId);
  if (!tab) return;

  const menu = document.createElement('div');
  menu.className = 'group-menu';
  menu.style.left = x + 'px';
  menu.style.top = y + 'px';
  menu.innerHTML = `
    <div class="group-menu-item" data-action="none">Brak grupy</div>
    <div class="group-menu-item" data-action="new">+ Nowa grupa</div>
    <div style="display:flex;gap:4px;padding:6px 10px;flex-wrap:wrap;">
      ${GROUP_COLORS.map(c => `<div class="group-color-dot" style="background:${c}" data-color="${c}"></div>`).join('')}
    </div>
  `;
  document.body.appendChild(menu);
  _groupMenuOpen = true;

  menu.querySelector('[data-action="none"]').addEventListener('click', () => { tab.group = ''; closeGroupMenu(); updateTabGroups(); });
  menu.querySelector('[data-action="new"]').addEventListener('click', () => {
    const name = prompt('Nazwa grupy:', 'Grupa');
    if (name) { tab.group = name; tab.groupColor = GROUP_COLORS[Math.floor(Math.random() * GROUP_COLORS.length)]; closeGroupMenu(); updateTabGroups(); }
  });
  menu.querySelectorAll('.group-color-dot').forEach(dot => {
    dot.addEventListener('click', () => {
      if (!tab.group) { tab.group = 'Grupa'; }
      tab.groupColor = dot.dataset.color;
      closeGroupMenu();
      updateTabGroups();
    });
  });
}
function closeGroupMenu() {
  document.querySelectorAll('.group-menu').forEach(m => m.remove());
  _groupMenuOpen = false;
}
function updateTabGroups() {
  const bar = $('tab-group-bar');
  if (!bar) return;
  const groups = {};
  tabs.forEach(t => {
    if (t.group) {
      if (!groups[t.group]) groups[t.group] = { color: t.groupColor || '#888', count: 0 };
      groups[t.group].count++;
    }
  });
  bar.innerHTML = Object.entries(groups).map(([name, g]) => `
    <div class="tab-group-pill" data-group="${esc(name)}">
      <div class="group-dot" style="background:${g.color}"></div>
      <span>${esc(name)}</span>
      <span class="group-count">${g.count}</span>
    </div>
  `).join('');

  // Color tabs in DOM
  tabs.forEach(t => {
    const el = document.querySelector(`[data-tab-id="${t.id}"]`);
    if (el && t.group) {
      el.style.borderTopColor = t.groupColor || 'transparent';
    }
  });
}

// ===== WEATHER WIDGET =====
async function loadWeatherWidget() {
  try {
    const city = (settings.weatherCity || '').trim();
    const base = city ? `https://wttr.in/${encodeURIComponent(city)}?format=j1` : 'https://wttr.in/?format=j1';
    const resp = await fetch(base);
    const data = await resp.json();
    const cur = data.current_condition?.[0];
    if (!cur) return;
    const temp = cur.temp_C;
    const desc = cur.weatherDesc?.[0]?.value || '';
    const humidity = cur.humidity;
    const wind = cur.windspeedKmph;
    const area = data.nearest_area?.[0];
    const locName = area ? [area.areaName?.[0]?.value, area.region?.[0]?.value].filter(Boolean).join(', ') : '';

    const container = $('newtop-widgets');
    if (!container) return;
    const w = container.querySelector('.widget-weather');
    if (w) {
      w.querySelector('.widget-value').textContent = temp + '°C';
      const sub = locName ? `${locName} · ${desc}` : desc;
      w.querySelector('.widget-sub').textContent = sub + ' • 💧' + humidity + '% • 💨' + wind + 'km/h';
      if (city) {
        const label = $('weather-city-label');
        if (label) {
          label.textContent = '📍';
          label.title = locName || city;
        }
      }
    }
  } catch (_) {}
}

function showWeatherCityInput() {
  const box = document.querySelector('.widget-city-input');
  const input = $('weather-city-input');
  if (!box || !input) return;
  box.classList.remove('hidden');
  input.value = settings.weatherCity || '';
  input.focus();
  input.select();
}

function applyWeatherCity() {
  const input = $('weather-city-input');
  const box = document.querySelector('.widget-city-input');
  if (!input || !box) return;
  const city = input.value.trim();
  if (city) {
    settings.weatherCity = city;
    window.electronAPI.settingsSet(settings);
    showToast('Ustawiono lokalizację pogody: ' + city);
  } else {
    delete settings.weatherCity;
    window.electronAPI.settingsSet(settings);
    showToast('Pogoda — powrót do automatycznej lokalizacji');
    $('weather-city-label').textContent = '🌍';
  }
  box.classList.add('hidden');
  loadWeatherWidget();
}

$('weather-city-label')?.addEventListener('click', (e) => {
  e.stopPropagation();
  showWeatherCityInput();
});
$('weather-city-ok')?.addEventListener('click', applyWeatherCity);
$('weather-city-input')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') applyWeatherCity();
  if (e.key === 'Escape') document.querySelector('.widget-city-input')?.classList.add('hidden');
});
$('weather-city-input')?.addEventListener('blur', (e) => {
  setTimeout(() => {
    if (!document.querySelector('.widget-city-input')?.contains(document.activeElement)) {
      document.querySelector('.widget-city-input')?.classList.add('hidden');
    }
  }, 120);
});

// ===== SEARCH HISTORY =====
function renderSearchHistory() {
  const list = $('newtab-recent-list');
  if (!list) return;
  const history = JSON.parse(localStorage.getItem('ww_search_history') || '[]');
  if (!history.length) return;
  list.innerHTML = history.slice(0, 6).map(h => `
    <div class="newtab-recent-item" data-url="${esc(h.url)}">
      <span>${esc(h.title || h.url)}</span>
    </div>
  `).join('');
  list.querySelectorAll('.newtab-recent-item').forEach(el => {
    el.addEventListener('click', () => navigateTo(el.dataset.url));
  });
}
function saveSearchHistory(url, title) {
  if (!url || url === 'about:blank' || url.startsWith('chrome://')) return;
  let history = JSON.parse(localStorage.getItem('ww_search_history') || '[]');
  history = history.filter(h => h.url !== url);
  history.unshift({ url, title: title || url });
  if (history.length > 12) history.length = 12;
localStorage.setItem('ww_search_history', JSON.stringify(history));
}

function getHost(url) {
  try { return new URL(url).hostname.replace('www.', ''); } catch (_) { return ''; }
}

const WP_USER_SEL = 'input[type="email"], input[autocomplete="username"], input[autocomplete="email"], input[name="email" i], input[name="login" i], input[name="username" i], input[name="user" i], input[id*="user" i], input[id*="login" i], input[type="text"][autocomplete="username"]';
const WP_PASS_SEL = 'input[type="password"], input[autocomplete="current-password"]';

function filterPasswordsList() {
  const q = ($('wp-search')?.value || '').toLowerCase();
  if (!q) { _wpFiltered = []; return; }
  _wpFiltered = _wpData.filter(p => {
    const host = getHost(p.url);
    return host.includes(q) || p.username.toLowerCase().includes(q) || p.url.toLowerCase().includes(q);
  });
}

// Save password prompt
async function showSavePasswordPrompt(webview, url, username, password) {
  const hasPin = await window.electronAPI.passwordsHasPin();
  if (!hasPin) return;
  const unlocked = await window.electronAPI.passwordsIsUnlocked();
  if (!unlocked) return;
  const existing = await window.electronAPI.passwordsGetForUrl(url);
  const sameUser = existing.find(e => e.username === username);
  if (sameUser && sameUser.password === password) return; // unchanged
  if (localStorage.getItem('wp_never_' + getHost(url))) return; // user chose "Never" for this site

  const el = $('wp-save-prompt');
  $('wp-save-prompt-url').textContent = getHost(url) || url;
  $('wp-save-prompt-title').textContent = sameUser ? 'Zaktualizować hasło?' : 'Zapisać hasło?';
  el.classList.remove('hidden');

  const cleanup = () => { el.classList.add('hidden'); };
  $('wp-save-prompt-save').onclick = async () => {
    await window.electronAPI.passwordsSave({ url, username, password });
    _wpData = await window.electronAPI.passwordsGetAll();
    filterPasswordsList();
    if (activePanel === 'passwords') renderPasswordsList();
    showToast(sameUser ? 'Zaktualizowano hasło' : 'Zapisano hasło');
    cleanup();
  };
  $('wp-save-prompt-ignore').onclick = () => {
    localStorage.setItem('wp_never_' + getHost(url), '1');
    cleanup();
  };
  $('wp-save-prompt-close').onclick = cleanup;
}

// Autofill: inject credentials into login form
async function autofillPasswords(webview, url) {
  const hasPin = await window.electronAPI.passwordsHasPin();
  if (!hasPin) return;
  const unlocked = await window.electronAPI.passwordsIsUnlocked();
  if (!unlocked) return;
  const creds = await window.electronAPI.passwordsGetForUrl(url);
  if (!creds.length) return;

  function inject(cred) {
    webview.executeJavaScript(`
      (function(){
        const u = document.querySelector('${WP_USER_SEL}');
        const p = document.querySelector('${WP_PASS_SEL}');
        if (u && p) {
          u.value = ${JSON.stringify(cred.username)};
          p.value = ${JSON.stringify(cred.password)};
          u.dispatchEvent(new Event('input', {bubbles:true}));
          p.dispatchEvent(new Event('input', {bubbles:true}));
          u.dispatchEvent(new Event('change', {bubbles:true}));
          p.dispatchEvent(new Event('change', {bubbles:true}));
        }
      })();
    `);
  }

  if (creds.length === 1) {
    inject(creds[0]);
  } else {
    // Multiple credentials — show picker toast
    const t = showUpdateToast(`
      <div style="display:flex;flex-direction:column;gap:8px;width:100%;">
        <div style="display:flex;align-items:center;gap:8px;">
          <div style="width:28px;height:28px;border-radius:8px;background:var(--bg-4);display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:14px;">🔑</div>
          <span style="font-weight:500;color:var(--text-1);font-size:13px;">Znaleziono ${creds.length} kont</span>
        </div>
        ${creds.map((c, i) => `
          <button class="wp-pick-btn" data-idx="${i}" style="
            display:flex;align-items:center;gap:8px;width:100%;padding:8px 10px;border:1px solid var(--border);
            border-radius:var(--r-sm);background:var(--bg-3);color:var(--text-1);cursor:pointer;text-align:left;
            transition:background 0.15s,border-color 0.15s;
          ">
            <div style="width:24px;height:24px;border-radius:6px;background:var(--accent);display:flex;align-items:center;justify-content:center;font-size:11px;color:#fff;font-weight:600;">${esc(c.username[0] || '?')}</div>
            <div style="display:flex;flex-direction:column;">
              <span style="font-size:12px;font-weight:500;">${esc(c.username)}</span>
            </div>
          </button>
        `).join('')}
      </div>
    `, 10000);
    t.querySelectorAll('.wp-pick-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx);
        inject(creds[idx]);
        t.remove();
      });
    });
  }
}

function wpPinEnter(ev) {
  if (ev.key === 'Enter') { ev.preventDefault(); $('wp-unlock-btn').click(); }
}
$('wp-unlock-input').addEventListener('keydown', wpPinEnter);

$('wp-unlock-btn').addEventListener('click', async () => {
  const pin = $('wp-unlock-input').value;
  if (!pin || !/^\d{4,6}$/.test(pin)) { $('wp-unlock-error').textContent = 'PIN musi mieć 4-6 cyfr'; wpShake(); return; }

  const hasPin = await window.electronAPI.passwordsHasPin();
  if (!hasPin) {
    // Setup mode
    const confirm = $('wp-unlock-confirm')?.value || '';
    if (!confirm) {
      // Show confirm field on first click
      // Add confirm field
      if (!$('wp-unlock-confirm')) {
        const confirmEl = document.createElement('input');
        confirmEl.type = 'password';
        confirmEl.id = 'wp-unlock-confirm';
        confirmEl.className = 'wp-pin-input';
        confirmEl.placeholder = 'Potwierdź PIN';
        confirmEl.maxLength = 6;
        confirmEl.autocomplete = 'off';
        confirmEl.style.marginTop = '8px';
        confirmEl.addEventListener('keydown', wpPinEnter);
        $('wp-unlock-input').parentNode.insertBefore(confirmEl, $('wp-unlock-error'));
        confirmEl.focus();
      }
      $('wp-unlock-error').textContent = 'Wpisz PIN ponownie, aby potwierdzić';
      $('wp-unlock-btn').textContent = 'Potwierdź';
      return;
    }
    if (pin !== confirm) { $('wp-unlock-error').textContent = 'Piny nie są identyczne'; $('wp-unlock-confirm').value = ''; wpShake(); return; }
    await window.electronAPI.passwordsSetPin(pin);
    _wpUnlocked = true;
    _wpData = [];
    $('wp-locked').classList.add('hidden');
    $('wp-vault').classList.remove('hidden');
    $('wp-lock-btn').classList.remove('hidden');
    $('wp-unlock-confirm')?.remove();
    renderPasswordsList();
    showToast('WavePass gotowy');
    return;
  }

  // Unlock mode
  const ok = await window.electronAPI.passwordsCheckPin(pin);
  if (!ok) {
    $('wp-unlock-error').textContent = 'Błędny PIN';
    $('wp-unlock-input').value = '';
    wpShake();
    return;
  }
  _wpUnlocked = true;
  _wpData = await window.electronAPI.passwordsGetAll();
  $('wp-locked').classList.add('hidden');
  $('wp-vault').classList.remove('hidden');
  $('wp-search')?.focus();
  renderPasswordsList();
});

$('wp-lock-btn').addEventListener('click', async () => {
  await window.electronAPI.passwordsLock();
  showVaultLocked();
});

function showVaultLocked() {
  _wpUnlocked = false;
  const vault = $('wp-vault');
  const locked = $('wp-locked');
  if (vault) vault.classList.add('hidden');
  if (locked) locked.classList.remove('hidden');
  const err = $('wp-unlock-error');
  if (err) err.textContent = '';
  $('wp-unlock-input').value = '';
  $('wp-unlock-input').placeholder = 'Wpisz PIN';
  $('wp-unlock-input').classList.remove('hidden');
  $('wp-unlock-btn').textContent = 'Odblokuj';
  $('wp-unlock-btn').classList.remove('hidden');
  $('wp-lock-icon').textContent = '🔐';
  $('wp-lock-title').textContent = 'Sejf zablokowany';
  $('wp-lock-sub').textContent = 'Wpisz główny PIN, aby odblokować';
  $('wp-unlock-confirm')?.remove();
}

function wpShake() {
  const c = $('wp-locked');
  if (!c) return;
  c.classList.remove('wp-pin-shake');
  void c.offsetWidth;
  c.classList.add('wp-pin-shake');
}

function copySensitive(text, label) {
  navigator.clipboard.writeText(text);
  showToast(`${label} skopiowano · czyści się po 30 s`);
  setTimeout(() => { navigator.clipboard.writeText(''); }, 30000);
}

function openPasswordEditor(entry) {
  let existing = $('wp-editor-wrap');
  if (existing) existing.remove();

  const url = entry ? entry.url : '';
  const username = entry ? entry.username : '';
  const password = entry ? entry.password : '';

  const overlay = document.createElement('div');
  overlay.id = 'wp-editor-wrap';
  overlay.className = 'as-overlay';
  overlay.innerHTML = `
    <div class="as-card wp-editor" role="dialog" aria-modal="true">
      <div class="as-card-glow"></div>
      <div class="as-icon">🔑</div>
      <h3 class="as-title">${entry ? 'Edytuj wpis' : 'Dodaj wpis'}</h3>
      <p class="as-sub">${entry ? esc(getHost(entry.url) || 'Zapisane dane logowania') : 'Zapisz dane logowania do strony internetowej'}</p>
      <div class="as-field">
        <label class="as-label" for="wp-ed-url">URL</label>
        <div class="as-input-wrap"><input id="wp-ed-url" type="text" value="${esc(url)}" placeholder="https://example.com" autocomplete="off" spellcheck="false" /></div>
      </div>
      <div class="as-field">
        <label class="as-label" for="wp-ed-user">Nazwa użytkownika</label>
        <div class="as-input-wrap"><input id="wp-ed-user" type="text" value="${esc(username)}" placeholder="you@example.com" autocomplete="off" spellcheck="false" /></div>
      </div>
      <div class="as-field">
        <label class="as-label" for="wp-ed-pass">Hasło</label>
        <div class="as-input-wrap"><input id="wp-ed-pass" type="password" value="${esc(password)}" placeholder="••••••" autocomplete="off" /><button class="wp-ed-eye" id="wp-ed-eye" tabindex="-1">👁</button></div>
      </div>
      <div class="as-actions">
        <button class="as-btn as-btn-ghost" id="wp-ed-cancel">Anuluj</button>
        <button class="as-btn as-btn-primary" id="wp-ed-save">Zapisz</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const urlInput = overlay.querySelector('#wp-ed-url');
  const userInput = overlay.querySelector('#wp-ed-user');
  const passInput = overlay.querySelector('#wp-ed-pass');
  const eyeBtn = overlay.querySelector('#wp-ed-eye');

  eyeBtn.addEventListener('click', () => {
    const show = passInput.type === 'password';
    passInput.type = show ? 'text' : 'password';
    eyeBtn.textContent = show ? '🙈' : '👁';
  });

  function close() { overlay.remove(); }
  overlay.querySelector('#wp-ed-cancel').addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  overlay.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });

  overlay.querySelector('#wp-ed-save').addEventListener('click', async () => {
    let url = urlInput.value.trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    await window.electronAPI.passwordsSave({ url, username: userInput.value.trim(), password: passInput.value });
    _wpData = await window.electronAPI.passwordsGetAll();
    filterPasswordsList();
    renderPasswordsList();
    close();
    showToast(entry ? 'Zaktualizowano wpis' : 'Zapisano wpis');
  });

  urlInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); userInput.focus(); }
  });
  userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); passInput.focus(); }
  });
  passInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); overlay.querySelector('#wp-ed-save').click(); }
  });

  urlInput.focus();
  if (url) userInput.select();
}

let _wpActThrottle = 0;
function pingPasswordsActivity() {
  if (!_wpUnlocked) return;
  const now = Date.now();
  if (now - _wpActThrottle < 15000) return;
  _wpActThrottle = now;
  window.electronAPI.passwordsActivity();
}
window.addEventListener('mousemove', pingPasswordsActivity);
window.addEventListener('keydown', pingPasswordsActivity);
window.addEventListener('click', pingPasswordsActivity);
window.addEventListener('wheel', pingPasswordsActivity);

$('wp-auto-lock')?.addEventListener('change', () => {
  const sel = $('wp-auto-lock');
  settings.wpAutoLock = parseInt(sel.value, 10);
  window.electronAPI.settingsSet(settings);
  if (_wpUnlocked) window.electronAPI.passwordsActivity();
});

window.electronAPI.on('passwords-locked', () => {
  if (!_wpUnlocked) return;
  showVaultLocked();
  showToast('WavePass zablokowany automatycznie');
});

$('wp-add-btn')?.addEventListener('click', () => openPasswordEditor(null));

// Search passwords
$('wp-search')?.addEventListener('input', () => {
  filterPasswordsList();
  renderPasswordsList();
});

// Detect form submission in webview for save prompt
function watchLoginForm(webview, url) {
  webview.executeJavaScript(`
    (function(){
      const USER = '${WP_USER_SEL}';
      const PASS = '${WP_PASS_SEL}';
      const readLogin = () => {
        const u = document.querySelector(USER);
        const p = document.querySelector(PASS);
        return { username: u ? u.value : '', password: p ? p.value : '' };
      };
      const emit = () => {
        const d = readLogin();
        if (d.username && d.password) setTimeout(() => { console.log('__WW_LOGIN__' + JSON.stringify(d)); }, 200);
      };
      document.querySelectorAll('form').forEach(f => {
        const p = f.querySelector(PASS);
        if (!p) return;
        f.addEventListener('submit', function() {
          const d = readLogin();
          setTimeout(() => { console.log('__WW_LOGIN__' + JSON.stringify(d)); }, 200);
        }, { once: true });
        f.querySelectorAll('button[type="submit"], input[type="submit"]').forEach(b => {
          b.addEventListener('click', emit, { once: true });
        });
      });
      document.querySelectorAll('button[type="submit"], input[type="submit"]').forEach(b => {
        if (!b.closest('form')) b.addEventListener('click', emit, { once: true });
      });
    })();
  `);
}

// ===== SETTINGS ACTIONS =====
$('setting-ai-model')?.addEventListener('change', function () {
  // Changing model requires reloading the pipeline
  aiPipeline = null;
  showToast('Model załaduje się przy następnej wiadomości AI');
});

$('clear-all-data-btn').addEventListener('click', async () => {
  const types = {
    history: $('cd-history').checked,
    cache: $('cd-cache').checked,
    cookies: $('cd-cookies').checked,
    downloads: $('cd-downloads').checked,
  };
  if (!Object.values(types).some(Boolean)) return showToast('Wybierz co najmniej jeden typ danych');
  if (!confirm('Wyczyścić wybrane dane przeglądania? Tej operacji nie można cofnąć.')) return;
  await window.electronAPI.clearBrowsingData(types);
  showToast('Wyczyszczono wybrane dane');
});

// ===== AI SIDEBAR =====
let _aiLoadPromise = null;
let _aiLoadMsg = null;

function aiProgressHTML(pct, label) {
  const bar = Math.max(3, Math.round(pct));
  return `<div class="ai-progress${pct >= 100 ? ' done' : ''}"><div class="ai-progress-bar" style="width:${bar}%"></div><span>${label || 'Pobieranie modelu…'} · ${bar}%</span></div>`;
}

window.electronAPI.on('ai-download-progress', (data) => {
  if (!_aiLoadMsg || !data || data.status === 'initiate') return;
  const total = data.total || 0;
  let loaded = data.loaded || 0;
  if (data.buffer) loaded += data.buffer?.byteLength || data.buffer?.length || 0;
  const pct = total && total > 0 ? Math.min(100, Math.round((loaded / total) * 100)) : 0;
  const name = data.file?.split('/').pop() || '';
  const label = name ? `Pobieranie ${name}` : 'Pobieranie modelu';
  _aiLoadMsg.querySelector('.ai-bubble').innerHTML = aiProgressHTML(pct, label);
});

async function loadAIModel() {
  if (aiPipeline) return true;
  if (_aiLoadPromise) return _aiLoadPromise;
  _aiLoadMsg = addAIMessage('bot', aiProgressHTML(2, 'Pobieranie Llama 3.2-3B (~3.5GB, tylko raz)…'));
  _aiLoadPromise = window.electronAPI.aiLoadModel().then(() => {
    aiPipeline = true;
    _aiLoadPromise = null;
    _aiLoadMsg = null;
    document.querySelector('.ai-bubble:last-child')?.remove();
    addAIMessage('bot', '✅ Model AI gotowy! O co chcesz zapytać?');
    return true;
  }).catch(err => {
    _aiLoadPromise = null;
    _aiLoadMsg = null;
    document.querySelector('.ai-bubble:last-child')?.remove();
    addAIMessage('bot', '❌ Nie udało się wczytać modelu AI: ' + err.message);
    return false;
  });
  return _aiLoadPromise;
}

const aiMessages = $('ai-messages');

function formatAI(text) {
  return esc(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/\[(.+?)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
    .replace(/\n/g, '<br>');
}

function addAIMessage(role, text) {
  const msg = document.createElement('div');
  msg.className = `ai-msg ai-msg-${role === 'bot' ? 'bot' : 'user'}`;
  msg.innerHTML = `
    <div class="ai-avatar">${role === 'bot' ? 'W' : 'U'}</div>
    <div class="ai-bubble">${formatAI(text)}</div>
  `;
  aiMessages.appendChild(msg);
  aiMessages.scrollTop = aiMessages.scrollHeight;
  return msg;
}

function addAILoading() {
  const msg = document.createElement('div');
  msg.className = 'ai-msg ai-msg-bot';
  msg.innerHTML = `<div class="ai-avatar">W</div><div class="ai-bubble loading"><span class="dot"></span><span class="dot"></span><span class="dot"></span></div>`;
  aiMessages.appendChild(msg);
  aiMessages.scrollTop = aiMessages.scrollHeight;
  return msg;
}

async function sendAIMessage(text) {
  if (!text.trim()) return;
  addAIMessage('user', text);
  $('ai-input').value = '';

  const tab = tabs.find(t => t.id === activeTabId);
  const currentUrl = tab?.url || 'New Tab';
  const prompt = `<|begin_of_text|><|start_header_id|>system<|end_header_id|>
You are Wave AI, a smart, helpful assistant built into the Wave browser. The user is currently viewing: ${currentUrl}.
Be concise (2-4 sentences for casual questions, but give full detailed step-by-step answers when asked). Reply in the language the user writes in. Be friendly, accurate and never invent facts.<|eot_id|>
<|start_header_id|>user<|end_header_id|>
${text}<|eot_id|>
<|start_header_id|>assistant<|end_header_id|>
`;

  // Load model if needed
  if (!aiPipeline) {
    const ok = await loadAIModel();
    if (!ok) return;
  }

  const loadMsg = addAILoading();
  try {
    const output = await window.electronAPI.aiGenerate(prompt);
    loadMsg.remove();
    const full = Array.isArray(output) ? output[0]?.generated_text || '' : '';
    const reply = full.trim() || '⚠️ Brak odpowiedzi.';
    addAIMessage('bot', reply);
  } catch (err) {
    loadMsg.remove();
    addAIMessage('bot', '❌ Error: ' + err.message);
  }
}

$('ai-send').addEventListener('click', () => sendAIMessage($('ai-input').value));
$('ai-input').addEventListener('keydown', e => { if (e.key === 'Enter') sendAIMessage($('ai-input').value); });

$('ai-load-model').addEventListener('click', async () => {
  const ok = await loadAIModel();
  if (ok) $('ai-api-setup').classList.add('hidden');
});

$('ai-summarize').addEventListener('click', () => {
  const tab = tabs.find(t => t.id === activeTabId);
  if (tab?.url && !tab.url.startsWith('about')) sendAIMessage(`Podsumuj zawartość tej strony: ${tab.url}`);
  else addAIMessage('bot', 'Najpierw otwórz stronę internetową, wtedy mogę ją podsumować.');
});

$('ai-translate').addEventListener('click', () => {
  const tab = tabs.find(t => t.id === activeTabId);
  if (tab?.url) sendAIMessage(`Strona, na której jestem, to: ${tab.url} — czy możesz pomóc mi przetłumaczyć lub zrozumieć jej treść?`);
  else addAIMessage('bot', 'Najpierw otwórz stronę internetową.');
});

$('ai-explain').addEventListener('click', () => {
  const tab = tabs.find(t => t.id === activeTabId);
  if (tab?.url) sendAIMessage(`Wyjaśnij, o czym jest witryna ${tab.url} i co mogę na niej zrobić.`);
  else addAIMessage('bot', 'Najpierw otwórz stronę internetową.');
});

$('ai-clear-chat').addEventListener('click', () => {
  aiMessages.innerHTML = `
    <div class="ai-msg ai-msg-bot">
      <div class="ai-avatar">W</div>
      <div class="ai-bubble">Czat wyczyszczony. W czym mogę pomóc?</div>
    </div>
  `;
});

// ===== FIND IN PAGE =====
function openFindBar() {
  findBar.classList.remove('hidden');
  findInput.focus();
  findInput.select();
}

function closeFindBar() {
  findBar.classList.add('hidden');
  const tab = tabs.find(t => t.id === activeTabId);
  tab?.webview?.stopFindInPage('clearSelection');
  findCount.textContent = '';
}

function findInPage(forward = true) {
  const tab = tabs.find(t => t.id === activeTabId);
  if (!tab?.webview || !findInput.value) return;
  tab.webview.findInPage(findInput.value, { forward, matchCase: false });
  tab.webview.addEventListener('found-in-page', e => {
    findCount.textContent = e.result?.matches ? `${e.result.activeMatchOrdinal}/${e.result.matches}` : 'Brak wyników';
  }, { once: true });
}

findInput.addEventListener('input', () => {
  if (findInput.value) findInPage(true);
  else {
    const tab = tabs.find(t => t.id === activeTabId);
    tab?.webview?.stopFindInPage('clearSelection');
    findCount.textContent = '';
  }
});
findInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') findInPage(!e.shiftKey);
  if (e.key === 'Escape') closeFindBar();
});
$('find-prev').addEventListener('click', () => findInPage(false));
$('find-next').addEventListener('click', () => findInPage(true));
$('find-close').addEventListener('click', closeFindBar);

// ===== ZOOM =====
let _zoomTimeout;

function setZoom(delta) {
  const tab = tabs.find(t => t.id === activeTabId);
  if (!tab?.webview) return;
  tab.zoom = Math.min(3, Math.max(0.25, (tab.zoom || 1) + delta));
  tab.webview.setZoomFactor(tab.zoom);
  const pct = Math.round(tab.zoom * 100);
  zoomIndicator.textContent = pct + '%';
  zoomIndicator.classList.remove('hidden');
  clearTimeout(_zoomTimeout);
  _zoomTimeout = setTimeout(() => zoomIndicator.classList.add('hidden'), 1500);
}

document.addEventListener('wheel', (e) => {
  if (!e.ctrlKey) return;
  e.preventDefault();
  const delta = e.deltaY > 0 ? -0.1 : 0.1;
  setZoom(delta);
}, { passive: false });

// ===== FULLSCREEN =====
let _fullscreen = false;
function setFullscreen(fs) {
  _fullscreen = fs;
  document.getElementById('browser-body').classList.toggle('fullscreen', fs);
}
async function toggleFullscreen() {
  _fullscreen = !_fullscreen;
  setFullscreen(_fullscreen);
  window.electronAPI.toggleFullscreen();
}
window.electronAPI.on('fullscreen-changed', (fs) => setFullscreen(fs));

// ===== DEVTOOLS =====
function toggleDevTools() {
  const tab = tabs.find(t => t.id === activeTabId);
  if (tab?.webview) {
    if (tab.webview.isDevToolsOpened()) tab.webview.closeDevTools();
    else tab.webview.openDevTools();
  }
}

// ===== TAB SEARCH =====
let _tsActive = -1;
function showTabSearch() {
  const overlay = $('tab-search-overlay');
  overlay.classList.remove('hidden');
  const input = $('tab-search-input');
  input.value = '';
  input.focus();
  _tsActive = -1;
  renderTabSearch('');
}
function hideTabSearch() {
  $('tab-search-overlay').classList.add('hidden');
}
function renderTabSearch(q) {
  const list = $('tab-search-results');
  const ql = q.toLowerCase();
  const results = ql ? tabs.filter(t => (t.title || '').toLowerCase().includes(ql) || (t.url || '').toLowerCase().includes(ql)) : tabs;
  if (!results.length) {
    list.innerHTML = '<div class="ts-empty">Brak pasujących kart</div>';
    return;
  }
  _tsActive = -1;
  list.innerHTML = results.map(t => {
    const title = t.title || 'Nowa karta';
    const url = t.url || 'about:blank';
    const fav = t.favicon && (t.favicon.startsWith('http://') || t.favicon.startsWith('https://') || t.favicon.startsWith('data:')) ? esc(t.favicon) : '';
    return `<div class="ts-item" data-id="${t.id}"><img src="${fav || fallbackFavicon}" onerror="this.src='${fallbackFavicon}'; this.onerror=null" /><span class="ts-title">${esc(title)}</span><span class="ts-url">${esc(url)}</span></div>`;
  }).join('');
  list.querySelectorAll('.ts-item').forEach(el => {
    el.addEventListener('click', () => {
      switchTab(el.dataset.id);
      hideTabSearch();
    });
    el.addEventListener('mouseenter', () => {
      document.querySelectorAll('.ts-item').forEach(e => e.classList.remove('active'));
      el.classList.add('active');
      _tsActive = [...el.parentElement.children].indexOf(el);
    });
  });
}
$('tab-search-input').addEventListener('input', function() { renderTabSearch(this.value); });
$('tab-search-input').addEventListener('keydown', e => {
  const items = document.querySelectorAll('.ts-item');
  if (e.key === 'ArrowDown') { e.preventDefault(); _tsActive = Math.min(_tsActive + 1, items.length - 1); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); _tsActive = Math.max(_tsActive - 1, 0); }
  else if (e.key === 'Enter') {
    e.preventDefault();
    const idx = _tsActive >= 0 ? _tsActive : 0;
    if (items[idx]) { items[idx].click(); }
  }
  else if (e.key === 'Escape') { hideTabSearch(); }
  items.forEach((el, i) => el.classList.toggle('active', i === _tsActive));
  if (_tsActive >= 0 && items[_tsActive]) items[_tsActive].scrollIntoView({ block: 'nearest' });
});
$('tab-search-overlay').addEventListener('mousedown', e => {
  if (e.target === $('tab-search-overlay')) hideTabSearch();
});

// ===== TOAST =====
function showToast(msg, duration = 2500) {
  const container = $('downloads-toast-container');
  const t = document.createElement('div');
  t.className = 'dl-toast';
  t.style.padding = '10px 16px';
  t.style.fontSize = '13px';
  t.innerHTML = `<div style="display:flex;align-items:center;gap:8px;">${esc(msg)}</div>`;
  container.appendChild(t);
  setTimeout(() => t.remove(), duration);
}

function showUpdateToast(html, duration) {
  const container = $('downloads-toast-container');
  const t = document.createElement('div');
  t.className = 'dl-toast';
  t.style.padding = '10px 16px';
  t.style.fontSize = '13px';
  t.innerHTML = html;
  container.appendChild(t);
  if (duration) setTimeout(() => { if (t.parentNode) t.remove(); }, duration);
  return t;
}

// ===== AUTO-UPDATER =====
let _updateModal = null;
let _updateCard = null;
let _updateState = null;
let _updateMinimized = false;
let _updatePill = null;
let _updateData = { version: '', percent: 0, speed: '' };

const _UPD_ICONS = {
  checking: '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>',
  available: '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
  downloaded: '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
  error: '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
};

const _UPD_ICON_BG = {
  checking: 'linear-gradient(135deg,#ff9f43,#ff6b35)',
  available: 'linear-gradient(135deg,var(--accent),var(--accent2))',
  downloaded: 'linear-gradient(135deg,#00d4a0,#00b894)',
  error: 'linear-gradient(135deg,#ff5a5f,#ff2d55)',
};

const _UPD_PILL_DOT = {
  checking: '#ff9f43',
  available: 'var(--accent)',
  downloaded: '#00d4a0',
  error: '#ff5a5f',
};

function _updPillHTML() {
  const state = _updateState || 'available';
  const label = state === 'downloaded'
    ? `Aktualizacja v${_updateData.version} gotowa — kliknij, aby zrestartować`
    : state === 'error'
      ? 'Aktualizacja nie powiodła się — kliknij, aby zobaczyć szczegóły'
      : state === 'available'
        ? `Aktualizacja do v${_updateData.version} — ${_updateData.percent || 0}%`
        : `Sprawdzanie aktualizacji…`;
  return `
    <div style="display:flex;align-items:center;gap:10px;">
      <span class="upd-dot" style="background:${_UPD_PILL_DOT[state] || 'var(--accent)'};box-shadow:0 0 10px ${_UPD_PILL_DOT[state] || 'var(--accent)'};"></span>
      <span style="font-size:12px;color:var(--text-1);font-weight:600;white-space:nowrap;">${label}</span>
    </div>`;
}

function closeUpdateModal() {
  if (_updateModal) { _updateModal.remove(); _updateModal = null; }
  if (_updatePill) { _updatePill.remove(); _updatePill = null; }
  _updateCard = null;
  _updateState = null;
  _updateMinimized = false;
  _updateData = { version: '', percent: 0, speed: '' };
}

function updateModalFooter(buttons) {
  const footer = _updateCard?.querySelector('#update-footer');
  if (!footer) return;
  footer.innerHTML = '';
  (buttons || []).forEach(b => {
    const btn = document.createElement('button');
    btn.id = b.id;
    btn.textContent = b.label;
    btn.className = 'upd-update-btn ' + (b.kind || 'secondary');
    btn.addEventListener('click', () => b.onClick && b.onClick());
    footer.appendChild(btn);
  });
}

function _seedUpdateParticles(el) {
  if (!el) return;
  const colors = ['var(--accent)', 'var(--accent2)', '#00d4a0', '#ff9f43', '#ffffff'];
  let frag = '';
  for (let i = 0; i < 18; i++) {
    const size = 2 + Math.random() * 5;
    const left = Math.random() * 100;
    const top = 45 + Math.random() * 55;
    const dur = 7 + Math.random() * 11;
    const delay = Math.random() * 9;
    const color = colors[i % colors.length];
    const drift = (Math.random() * 120 - 60).toFixed(0);
    frag += `<span class="upd-particle" style="
      width:${size.toFixed(1)}px;height:${size.toFixed(1)}px;
      left:${left.toFixed(1)}%;top:${top.toFixed(1)}%;
      background:${color};box-shadow:0 0 ${(size * 2.6).toFixed(1)}px ${color};
      animation-duration:${dur.toFixed(1)}s;animation-delay:${delay.toFixed(1)}s;
      --upd-drift:${drift}px;"
    ></span>`;
  }
  el.innerHTML = frag;
}

function showUpdateModal(cfg) {
  closeUpdateModal();
  _updateState = cfg.state || 'available';
  _updateData = Object.assign(_updateData, cfg.data || {});
  _updateModal = document.createElement('div');
  _updateModal.id = 'update-modal-overlay';
  _updateModal.dataset.state = _updateState;
  _updateModal.innerHTML = `
    <div class="upd-halo"></div>
    <div class="upd-particles" id="update-particles"></div>
    <div id="update-modal">
      <div class="upd-corner upd-corner-tl"></div>
      <div class="upd-corner upd-corner-br"></div>
      <div class="upd-sheen"></div>
      <div class="upd-head">
        <div id="update-modal-icon" class="${_updateState === 'downloaded' ? 'upd-icon-success' : ''}" style="background:${_UPD_ICON_BG[_updateState] || _UPD_ICON_BG.available};">
          ${_UPD_ICONS[_updateState] || _UPD_ICONS.available}
        </div>
        <div style="flex:1;min-width:0;">
          <div class="upd-title">${cfg.title || ''}</div>
          <div class="upd-sub">${cfg.sub || ''}</div>
        </div>
        ${cfg.minimize === false ? '' : '<button id="update-modal-min" title="Minimize to pill"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"/></svg></button>'}
      </div>
      <div id="update-modal-body">${cfg.body || ''}</div>
      <div id="update-footer"></div>
    </div>`;
  document.body.appendChild(_updateModal);
  _updateCard = _updateModal.querySelector('#update-modal');
  _updateModal.querySelector('#update-modal-min')?.addEventListener('click', minimizeUpdateModal);
  _seedUpdateParticles(_updateModal.querySelector('#update-particles'));
  updateModalFooter(cfg.buttons || []);
}

function minimizeUpdateModal() {
  if (!_updateModal) return;
  _updateModal.remove();
  _updateModal = null;
  _updateCard = null;
  _updateMinimized = true;
  _updatePill = document.createElement('div');
  _updatePill.id = 'update-pill';
  _updatePill.className = 'upd-pill';
  _updatePill.innerHTML = _updPillHTML();
  _updatePill.addEventListener('click', () => {
    const prevState = _updateState;
    const prevData = _updateData;
    closeUpdateModal();
    if (prevState === 'checking' || prevState === 'error') return;
    showUpdateModal({
      state: prevState,
      title: prevState === 'downloaded' ? 'Aktualizacja gotowa' : `Dostępna aktualizacja v${esc(prevData.version)}`,
      sub: prevState === 'downloaded'
        ? `v${esc(prevData.version)} pobrano — zrestartuj, aby zainstalować`
        : 'Pobieranie i instalacja automatyczna',
      body: updProgressHTML(prevData.percent),
      buttons: updFooterButtons(prevState),
    });
  });
  document.body.appendChild(_updatePill);
}

function updProgressHTML(pct) {
  const v = pct || 0;
  return `
    <div style="display:flex;justify-content:space-between;margin-bottom:10px;">
      <span style="font-size:12px;color:var(--text-3);">Pobieranie aktualizacji…</span>
      <span style="font-size:12px;font-weight:700;color:var(--accent);font-variant-numeric:tabular-nums;"><span id="update-pct">${v}</span>%</span>
    </div>
    <div style="display:flex;align-items:center;gap:10px;">
      <div class="upd-progress-track">
        <div id="update-bar" class="upd-progress-bar" style="width:${v}%;"></div>
        <span id="update-tip" class="upd-progress-tip" style="left:${v}%;"></span>
        <div class="upd-progress-shimmer"></div>
      </div>
      <span id="update-speed" style="font-size:11px;color:var(--text-3);white-space:nowrap;"></span>
    </div>`;
}

function updFooterButtons(state) {
  if (state === 'downloaded') {
    return [
      { id: 'update-restart-btn', label: 'Uruchom ponownie teraz', kind: 'primary', onClick: () => window.electronAPI.updateInstall() },
      { id: 'update-later-btn', label: 'Później', kind: 'secondary', onClick: closeUpdateModal },
    ];
  }
  return [
    { id: 'update-min-btn', label: 'W tle', kind: 'secondary', onClick: minimizeUpdateModal },
  ];
}

function updateUpdaterProgress(pct, speed) {
  _updateData.percent = pct;
  if (speed) _updateData.speed = speed;
  if (_updateMinimized) {
    if (_updatePill) _updatePill.innerHTML = _updPillHTML();
    return;
  }
  const bar = _updateCard?.querySelector('#update-bar');
  const pctEl = _updateCard?.querySelector('#update-pct');
  const speedEl = _updateCard?.querySelector('#update-speed');
  const tip = _updateCard?.querySelector('#update-tip');
  if (bar) bar.style.width = pct + '%';
  if (tip) tip.style.left = pct + '%';
  if (pctEl) pctEl.textContent = pct;
  if (speedEl && speed) speedEl.textContent = speed;
}

function initUpdater() {
  window.electronAPI.updateCheck();

  window.electronAPI.on('update-checking', () => {
    showUpdateModal({
      state: 'checking',
      title: 'Sprawdzanie aktualizacji…',
      sub: 'Szukanie nowszej wersji',
      body: '<div style="display:flex;justify-content:center;padding:6px 0 2px;"><div class="upd-spinner"></div></div>',
      buttons: [],
      minimize: false,
      data: {},
    });
  });

  window.electronAPI.on('update-available', (data) => {
    const ver = data?.version || 'new';
    _updateData.version = ver;
    showUpdateModal({
      state: 'available',
      title: `Dostępna aktualizacja v${esc(ver)}`,
      sub: 'Pobieranie i instalacja automatyczna',
      body: updProgressHTML(0),
      buttons: updFooterButtons('available'),
      data: { version: ver },
    });
  });

  window.electronAPI.on('update-not-available', () => {
    if (_updateState === 'checking' || _updateState === 'error') closeUpdateModal();
  });

  window.electronAPI.on('update-download-progress', (data) => {
    const pct = data?.percent ? Math.round(data.percent) : 0;
    const speed = data?.bytesPerSecond ? formatBytes(data.bytesPerSecond) + '/s' : '';
    updateUpdaterProgress(pct, speed);
  });

  window.electronAPI.on('update-downloaded', (data) => {
    const ver = data?.version || 'new';
    _updateData.version = ver;
    _updateData.percent = 100;
    if (_updateMinimized) {
      if (_updatePill) _updatePill.innerHTML = _updPillHTML();
      _updatePill?.addEventListener('click', () => {
        closeUpdateModal();
        showUpdateModal({
          state: 'downloaded',
          title: 'Aktualizacja gotowa',
          sub: `v${esc(ver)} pobrano — zrestartuj, aby zainstalować`,
          body: '<div style="display:flex;align-items:center;gap:10px;"><div class="upd-dot" style="background:#00d4a0;box-shadow:0 0 10px #00d4a0;"></div><span style="font-size:12.5px;color:var(--text-2);">Nowa wersja zostanie zastosowana po restarcie. Możesz dalej przeglądać.</span></div>',
          buttons: updFooterButtons('downloaded'),
        });
      });
      return;
    }
    showUpdateModal({
      state: 'downloaded',
      title: 'Aktualizacja gotowa',
      sub: `v${esc(ver)} pobrano — zrestartuj, aby zainstalować`,
      body: '<div style="display:flex;align-items:center;gap:10px;"><div class="upd-dot" style="background:#00d4a0;box-shadow:0 0 10px #00d4a0;"></div><span style="font-size:12.5px;color:var(--text-2);">Nowa wersja zostanie zastosowana po restarcie. Możesz dalej przeglądać.</span></div>',
      buttons: updFooterButtons('downloaded'),
    });
  });

  window.electronAPI.on('update-error', (msg) => {
    console.warn('[updater] error:', msg);
    _updateState = 'error';
    if (_updateMinimized) {
      if (_updatePill) _updatePill.innerHTML = _updPillHTML();
      return;
    }
    showUpdateModal({
      state: 'error',
      title: 'Aktualizacja nie powiodła się',
      sub: 'Coś poszło nie tak podczas pobierania',
      body: `<div style="display:flex;gap:10px;align-items:flex-start;">
        <div style="width:32px;height:32px;border-radius:9px;background:rgba(255,90,95,0.12);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
          ${_UPD_ICONS.error}
        </div>
        <span style="font-size:12.5px;color:var(--text-2);line-height:1.5;">${esc(msg) || 'Sprawdź połączenie i spróbuj ponownie.'}</span>
      </div>`,
      buttons: [
        { id: 'update-retry-btn', label: 'Ponów', kind: 'primary', onClick: () => { closeUpdateModal(); window.electronAPI.updateCheck(); } },
        { id: 'update-close-btn', label: 'Zamknij', kind: 'secondary', onClick: closeUpdateModal },
      ],
    });
  });
}

// ===== ESCAPE HELPER =====
function esc(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ===== GENERIC CONTEXT MENU =====
let _ctxActiveEl = null;

function createContextMenu(items, x, y, opts = {}) {
  document.querySelectorAll('.ctx-menu, .ctx-submenu').forEach(el => el.remove());

  const menu = document.createElement('div');
  menu.className = 'ctx-menu';
  menu.style.left = x + 'px';
  menu.style.top = y + 'px';
  menu.setAttribute('role', 'menu');

  const allButtons = [];

  // Optional smart header
  if (opts.header) {
    const head = document.createElement('div');
    head.className = 'ctx-header';
    const headIcon = document.createElement('span');
    headIcon.className = 'ctx-header-icon';
    headIcon.textContent = opts.header.icon || 'ℹ';
    const headBody = document.createElement('span');
    headBody.className = 'ctx-header-body';
    const headTitle = document.createElement('span');
    headTitle.className = 'ctx-header-title';
    headTitle.textContent = opts.header.title || '';
    const headSub = document.createElement('span');
    headSub.className = 'ctx-header-sub';
    headSub.textContent = opts.header.sub || '';
    headBody.appendChild(headTitle);
    headBody.appendChild(headSub);
    head.appendChild(headIcon);
    head.appendChild(headBody);
    menu.appendChild(head);
  }

  const _ctxStack = [menu];

  function makeItem(item, container) {
    if (item.header) { makeHeader(container, item); return null; }

    if (item.separator) {
      const sep = document.createElement('div');
      sep.className = 'ctx-separator';
      container.appendChild(sep);
      return null;
    }

    const btn = document.createElement('button');
    btn.className = 'ctx-item' + (item.disabled ? ' disabled' : '');
    btn.setAttribute('role', 'menuitem');
    btn.tabIndex = item.disabled ? -1 : 0;

    if (item.icon) {
      const icon = document.createElement('span');
      icon.className = 'ctx-icon';
      icon.textContent = item.icon;
      btn.appendChild(icon);
    }

    const mid = document.createElement('span');
    mid.className = 'ctx-mid';

    const label = document.createElement('span');
    label.className = 'ctx-label';
    label.textContent = item.label;
    mid.appendChild(label);

    if (item.subtitle) {
      const sub = document.createElement('span');
      sub.className = 'ctx-subtitle';
      sub.textContent = item.subtitle;
      mid.appendChild(sub);
    }
    btn.appendChild(mid);

    if (item.dot) {
      const dotEl = document.createElement('span');
      dotEl.style.cssText = 'width:10px;height:10px;border-radius:50%;background:' + item.dot + ';flex-shrink:0;margin-right:6px;';
      if (item.active) {
        dotEl.style.boxShadow = '0 0 8px ' + item.dot;
        dotEl.style.outline = '2px solid rgba(255,255,255,0.15)';
        dotEl.style.outlineOffset = '1px';
      }
      btn.insertBefore(dotEl, mid);
    }
    if (item.active && !item.dot) {
      const check = document.createElement('span');
      check.className = 'ctx-icon';
      check.textContent = '✓';
      btn.insertBefore(check, mid);
    }

    if (item.shortcut) {
      const k = document.createElement('span');
      k.className = 'ctx-keycap';
      k.textContent = item.shortcut;
      btn.appendChild(k);
    }

    if (item.submenu) {
      const arrow = document.createElement('span');
      arrow.className = 'ctx-sub-arrow';
      arrow.textContent = '›';
      btn.appendChild(arrow);

      let subEl = null;
      let subTimeout = null;
      function showSub() {
        if (subTimeout) clearTimeout(subTimeout);
        if (subEl) { subEl.style.display = ''; return; }
        const r = btn.getBoundingClientRect();
        subEl = document.createElement('div');
        subEl.className = 'ctx-submenu';
        subEl.setAttribute('role', 'menu');
        _ctxStack.push(subEl);
        buildItems(subEl, item.submenu);
        document.body.appendChild(subEl);
        requestAnimationFrame(() => {
          const rr = subEl.getBoundingClientRect();
          subEl.style.left = Math.min((r.right + 4), window.innerWidth - rr.width - 8) + 'px';
          subEl.style.top = Math.min(r.top, window.innerHeight - rr.height - 8) + 'px';
          if (subEl.getBoundingClientRect().bottom > window.innerHeight) {
            subEl.style.top = (window.innerHeight - subEl.getBoundingClientRect().height - 8) + 'px';
          }
        });
      }
      function hideSub() {
        if (subTimeout) clearTimeout(subTimeout);
        subTimeout = setTimeout(() => { if (subEl) { subEl.remove(); subEl = null; _ctxStack.pop(); } }, 150);
      }
      btn.addEventListener('mouseenter', () => { if (subTimeout) clearTimeout(subTimeout); showSub(); });
      btn.addEventListener('mouseleave', hideSub);
      btn.addEventListener('focus', showSub);
    }

    const run = () => {
      if (item.disabled) return;
      if (typeof item.action === 'function') {
        item.action();
      } else if (typeof item.action === 'string') {
        window.electronAPI.contextMenuAction(item.action, item.arg);
      }
      if (!item.submenu) closeMenu(true);
    };
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      setActive(btn);
      run();
    });
    btn.addEventListener('mouseenter', () => setActive(btn));

    allButtons.push(btn);
    container.appendChild(btn);
    return btn;
  }

  function makeHeader(container, item) {
    const h = document.createElement('div');
    h.className = 'ctx-header-item';
    h.textContent = item.label;
    container.appendChild(h);
  }

  function buildItems(container, list) {
    _ctxStack.push(container);
    list.forEach(item => makeItem(item, container));
    _ctxStack.pop();
  }

  buildItems(menu, items);

  function setActive(btn) {
    allButtons.forEach(b => b.classList.remove('active-kb'));
    _ctxActiveEl = btn && !btn.disabled ? btn : null;
    if (_ctxActiveEl) { _ctxActiveEl.classList.add('active-kb'); }
  }
  const firstEnabled = allButtons.find(b => !b.disabled);
  setActive(firstEnabled);

  document.body.appendChild(menu);
  requestAnimationFrame(() => {
    const r = menu.getBoundingClientRect();
    if (r.right > window.innerWidth) menu.style.left = (window.innerWidth - r.width - 8) + 'px';
    if (r.bottom > window.innerHeight) menu.style.top = (window.innerHeight - r.height - 8) + 'px';
    if (r.left < 0) menu.style.left = '8px';
    if (r.top < 0) menu.style.top = '8px';
  });

  function closeMenu(instant) {
    menu.classList.add('closing');
    const t = instant ? 0 : 120;
    window.removeEventListener('keydown', onKey);
    setTimeout(() => { menu.remove(); document.querySelectorAll('.ctx-submenu').forEach(s => s.remove()); _ctxActiveEl = null; }, t);
  }

  const close = (e) => {
    if (e && e.button === 2) return;
    closeMenu();
    document.removeEventListener('click', close);
    document.removeEventListener('contextmenu', close);
    window.removeEventListener('blur', close);
  };
  setTimeout(() => {
    document.addEventListener('click', close);
    document.addEventListener('contextmenu', close);
    window.removeEventListener('blur', close);
  }, 0);

  function onKey(e) {
    const enabled = allButtons.filter(b => !b.disabled);
    if (enabled.length === 0) return;
    let idx = enabled.indexOf(_ctxActiveEl);
    switch (e.key) {
      case 'ArrowDown':
      case 'Tab':
        e.preventDefault();
        idx = (idx + 1) % enabled.length;
        setActive(enabled[idx]);
        break;
      case 'ArrowUp':
        e.preventDefault();
        idx = (idx - 1 + enabled.length) % enabled.length;
        setActive(enabled[idx]);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (_ctxActiveEl) _ctxActiveEl.click();
        break;
      case 'Escape':
        e.preventDefault();
        closeMenu(true);
        break;
      default: break;
    }
  }
  window.addEventListener('keydown', onKey);
  menu.addEventListener('keydown', onKey);
}


// ===== TAB CONTEXT MENU =====
function showTabContextMenu(tabId, x, y) {
  const tab = tabs.find(t => t.id === tabId);
  const isPinned = tab?.pinned;
  const groupColor = tab?.group || '';
  const groupItems = GROUP_COLORS.map(c => ({
    label: c || 'None',
    dot: c || null,
    active: c === groupColor,
    action: () => setGroupColor(tabId, c),
  }));

  createContextMenu([
    { icon: '➕', label: 'Nowa karta', action: () => createTab() },
    { icon: '🔄', label: 'Odśwież', action: () => tab?.webview?.reload() },
    { icon: '📋', label: 'Zduplikuj kartę', action: () => { if (tab?.url) createTab(tab.url); } },
    { icon: '🔇', label: 'Wycisz kartę', action: () => muteTab(tabId) },
    { icon: '📋', label: 'Kopiuj adres URL', action: () => { if (tab?.url) { navigator.clipboard.writeText(tab.url); showToast('Skopiowano adres URL'); } } },
    { icon: '🔍', label: 'Inspekcja', action: () => { const t = tabs.find(t2 => t2.id === tabId); if (t?.webview) t.webview.openDevTools(); } },
    { separator: true },
    { icon: '📌', label: isPinned ? 'Odepnij kartę' : 'Przypnij kartę', action: () => pinTab(tabId) },
    { icon: '🏷', label: 'Ustaw nazwę grupy', action: () => {
      const name = prompt('Nazwa grupy:', tab?.group || '');
      if (name !== null) {
        tab.group = name;
        updateTabGroups();
      }
    }},
    { icon: '🎨', label: 'Kolor grupy', submenu: groupItems },
    { separator: true },
    { icon: '✕', label: 'Zamknij kartę', action: () => closeTab(tabId) },
    { label: 'Zamknij karty po prawej', action: () => { const idx = tabs.findIndex(t => t.id === tabId); if (idx >= 0) tabs.filter((t,i) => i > idx).forEach(t => closeTab(t.id)); } },
    { label: 'Zamknij pozostałe karty', action: () => { tabs.filter(t => t.id !== tabId).forEach(t => closeTab(t.id)); } },
    { separator: true },
    { label: 'Kopiuj adresy URL wszystkich kart', action: () => {
      const urls = tabs.filter(t => t.url).map(t => t.url).join('\n');
      navigator.clipboard.writeText(urls);
      showToast(`Skopiowano adresy URL ${tabs.filter(t => t.url).length} kart`);
    } },
  ], x, y);
}

function muteTab(tabId) {
  const tab = tabs.find(t => t.id === tabId);
  if (!tab?.webview) return;
  tab.muted = !tab.muted;
  tab.webview.setAudioMuted(tab.muted);
  const tabEl = document.querySelector(`[data-tab-id="${tabId}"]`);
  if (tabEl) {
    let muteEl = tabEl.querySelector('.tab-muted');
    if (!muteEl && tab.muted) {
      muteEl = document.createElement('span');
      muteEl.className = 'tab-muted';
      muteEl.textContent = '🔇';
      tabEl.insertBefore(muteEl, tabEl.querySelector('.tab-close'));
    } else if (muteEl && !tab.muted) {
      muteEl.remove();
    }
  }
}

function muteAllTabs(muted = true) {
  tabs.forEach(t => {
    if (t.webview) {
      t.muted = muted;
      t.webview.setAudioMuted(muted);
      const tabEl = document.querySelector(`[data-tab-id="${t.id}"]`);
      if (tabEl) {
        let muteEl = tabEl.querySelector('.tab-muted');
        if (muted && !muteEl) {
          muteEl = document.createElement('span');
          muteEl.className = 'tab-muted';
          muteEl.textContent = '🔇';
          tabEl.insertBefore(muteEl, tabEl.querySelector('.tab-close'));
        } else if (!muted && muteEl) {
          muteEl.remove();
        }
      }
    }
  });
  showToast(muted ? 'Wyciszono wszystkie karty' : 'Odciszono wszystkie karty', 1200);
}

function pinTab(tabId) {
  const tab = tabs.find(t => t.id === tabId);
  if (!tab) return;
  tab.pinned = !tab.pinned;
  const tabEl = document.querySelector(`[data-tab-id="${tabId}"]`);
  if (!tabEl) return;

  if (tab.pinned) {
    tabEl.classList.add('pinning');
    setTimeout(() => {
      tabEl.classList.remove('pinning');
      tabEl.classList.add('pinned');
      const idx = tabs.findIndex(t => t.id === tabId);
      tabs.splice(idx, 1);
      tabs.unshift(tab);
      tabsContainer.insertBefore(tabEl, tabsContainer.firstChild);
    }, 250);
  } else {
    tabEl.classList.remove('pinned');
    tabEl.classList.add('unpinning');
    // Move tab after remaining pinned tabs
    const pinnedN = tabs.filter(t => t.pinned).length; // count excluding this one
    const oldIdx = tabs.findIndex(t => t.id === tabId);
    if (oldIdx !== pinnedN) {
      tabs.splice(oldIdx, 1);
      tabs.splice(pinnedN, 0, tab);
      const ref = tabsContainer.children[pinnedN];
      tabsContainer.insertBefore(tabEl, ref || null);
    }
    setTimeout(() => {
      tabEl.classList.remove('unpinning');
    }, 250);
  }
}

function setGroupColor(tabId, color) {
  const tab = tabs.find(t => t.id === tabId);
  if (!tab) return;
  tab.group = color ? (tab.group || 'Group') : '';
  tab.groupColor = color || '';
  const tabEl = document.querySelector(`[data-tab-id="${tabId}"]`);
  if (tabEl) {
    tabEl.style.setProperty('--group-color', color || 'transparent');
    tabEl.classList.toggle('has-group', !!color);
    if (color) {
      tabEl.style.borderTopColor = color;
    } else {
      tabEl.style.borderTopColor = '';
    }
  }
  updateTabGroups();
}

// ===== TAB DRAG & DROP =====
let _dragSourceId = null;

tabsContainer.addEventListener('dragover', e => {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  const tabEl = e.target.closest('.tab');
  if (!tabEl || tabEl.dataset.tabId === _dragSourceId) return;

  const rect = tabEl.getBoundingClientRect();
  const midX = rect.left + rect.width / 2;
  if (e.clientX < midX) {
    tabEl.classList.add('drop-left');
    tabEl.classList.remove('drop-right');
  } else {
    tabEl.classList.add('drop-right');
    tabEl.classList.remove('drop-left');
  }
});

tabsContainer.addEventListener('dragleave', e => {
  const tabEl = e.target.closest('.tab');
  if (tabEl) tabEl.classList.remove('drop-left', 'drop-right');
});

tabsContainer.addEventListener('drop', e => {
  e.preventDefault();
  const targetEl = e.target.closest('.tab');
  if (!targetEl || !_dragSourceId) return;
  const targetId = targetEl.dataset.tabId;
  if (targetId === _dragSourceId) return;

  const srcIdx = tabs.findIndex(t => t.id === _dragSourceId);
  const dstIdx = tabs.findIndex(t => t.id === targetId);
  if (srcIdx === -1 || dstIdx === -1) return;

  const [movedTab] = tabs.splice(srcIdx, 1);
  const insertIdx = dstIdx > srcIdx ? dstIdx : dstIdx;
  tabs.splice(insertIdx, 0, movedTab);

  const srcEl = document.querySelector(`[data-tab-id="${_dragSourceId}"]`);
  const dstEl = targetEl;
  const rect = dstEl.getBoundingClientRect();
  const midX = rect.left + rect.width / 2;
  if (e.clientX < midX) {
    dstEl.parentNode.insertBefore(srcEl, dstEl);
  } else {
    dstEl.parentNode.insertBefore(srcEl, dstEl.nextSibling);
  }

  document.querySelectorAll('.tab').forEach(t => t.classList.remove('drop-left', 'drop-right'));
  _dragSourceId = null;
});

// ===== IPC EVENT LISTENERS =====
window.electronAPI.on('save-to-reading-list', (data) => {
  toggleReadingList(data.url, data.title, '');
  if (activePanel === 'bookmarks') renderReadingList();
});
window.electronAPI.on('open-link-newtab', (url) => createTab(url));
window.electronAPI.on('open-link', (url) => {
  const tab = tabs.find(t => t.id === activeTabId);
  if (tab?.webview && url) tab.webview.loadURL(url);
  else if (url) createTab(url);
});
window.electronAPI.on('open-link-incognito', (url) => createIncognitoTab(url));
window.electronAPI.on('open-link-background', (url) => {
  const activeBefore = activeTabId;
  const id = createTab(url);
  if (id && activeBefore !== undefined) switchTab(activeBefore);
});
window.electronAPI.on('select-all', () => {
  const tab = tabs.find(t => t.id === activeTabId);
  tab?.webview?.executeJavaScript('window.getSelection().selectAllChildren(document.body); document.execCommand("selectAll");').catch(() => {});
});
window.electronAPI.on('open-find', () => openFindBar());
window.electronAPI.on('bookmark-url', async (data) => {
  const url = data?.url;
  if (!url) return;
  const bookmarks = await window.electronAPI.bookmarksGet();
  if (!bookmarks.find(b => b.url === url)) {
    window.electronAPI.bookmarksAdd({ url, title: data?.title || url });
    showToast('Zapisano w zakładkach ⭐');
  } else {
    showToast('Ta strona jest już w zakładkach');
  }
  if (activePanel === 'bookmarks') loadBookmarksPanel();
  loadBookmarksBar();
});
window.electronAPI.on('bookmark-page', async (url) => {
  const tab = tabs.find(t => t.id === activeTabId);
  const target = url || tab?.url;
  if (!target) return;
  const bookmarks = await window.electronAPI.bookmarksGet();
  if (!bookmarks.find(b => b.url === target)) {
    window.electronAPI.bookmarksAdd({ url: target, title: tab?.title || target });
    showToast('Zapisano w zakładkach ⭐');
  } else {
    showToast('Ta strona jest już w zakładkach');
  }
  if (activePanel === 'bookmarks') loadBookmarksPanel();
  loadBookmarksBar();
});
window.electronAPI.on('replace-text', (arg) => {
  const tab = tabs.find(t => t.id === activeTabId);
  if (!tab?.webview) return;
  const target = JSON.stringify(String(arg?.target || ''));
  const replacement = JSON.stringify(String(arg?.replacement || ''));
  tab.webview.executeJavaScript(`(() => { const el = document.activeElement || document.body; const doc = el.ownerDocument || document; const s = window.getSelection(); if (s.toString().trim()) { document.execCommand('insertText', false, ${replacement}); return true; } if (el.value !== undefined) { el.value = el.value.replace(${target}, ${replacement}); } else { el.textContent = (el.textContent||'').replace(${target}, ${replacement}); } return true; })()`).catch(() => {});
});
window.electronAPI.on('context-toast', (msg) => showToast(msg));
window.electronAPI.on('search-selection', (text) => {
  const url = (SEARCH_ENGINES[settings.searchEngine] || SEARCH_ENGINES.google) + encodeURIComponent(text);
  createTab(url);
});
window.electronAPI.on('nav-back', () => btnBack.click());
window.electronAPI.on('nav-forward', () => btnForward.click());
window.electronAPI.on('nav-reload', () => btnReload.click());
window.electronAPI.on('view-source', () => {
  const tab = tabs.find(t => t.id === activeTabId);
  if (tab?.url) createTab('view-source:' + tab.url);
});
window.electronAPI.on('print-page', () => {
  const tab = tabs.find(t => t.id === activeTabId);
  tab?.webview?.print();
});
window.electronAPI.on('inspect-element', () => {
  const tab = tabs.find(t => t.id === activeTabId);
  tab?.webview?.openDevTools();
});
window.electronAPI.on('show-context-menu-renderer', (data) => {
  const tab = tabs.find(t => t.id === activeTabId);
  const host = tab?.url ? (function(){ try { return new URL(tab.url).hostname.replace(/^www\./, ''); } catch(_) { return ''; } })() : '';
  createContextMenu(data.items, data.x, data.y, host && host !== 'newtab' ? {
    header: { icon: '🌐', title: host, sub: tab.url.replace(/#.*/, '') },
  } : {});
});

// ===== BOOKMARKS BAR TOGGLE =====
function toggleBookmarksBar() {
  settings.showBookmarksBar = !settings.showBookmarksBar;
  loadBookmarksBar();
  showToast(settings.showBookmarksBar ? 'Pasek zakładek widoczny' : 'Pasek zakładek ukryty');
}

// ===== PICTURE-IN-PICTURE TOGGLE =====
function togglePiP() {
  const tab = tabs.find(t => t.id === activeTabId);
  if (!tab?.webview) { showToast('Brak strony dla trybu obraz w obrazie'); return; }
  tab.webview.executeJavaScript(`
    (function() {
      const video = document.querySelector('video');
      if (video) {
        if (document.pictureInPictureElement) document.exitPictureInPicture();
        else video.requestPictureInPicture();
      }
    })()
  `).catch(() => showToast('Tryb obraz w obrazie niedostępny'));
}

// ===== CLEAR BROWSING DATA =====
function clearBrowsingData() {
  window.electronAPI.clearBrowsingData(['cache', 'cookies', 'history', 'indexedDB', 'localStorage']);
  showToast('Wyczyszczono dane przeglądania');
}

// ===== KEYBOARD SHORTCUTS =====
document.addEventListener('keydown', e => {
  const ctrl = e.ctrlKey || e.metaKey;
  if (!ctrl) {
    if (e.key === 'F5') { btnReload.click(); e.preventDefault(); }
    if (e.key === 'F11') { e.preventDefault(); toggleFullscreen(); }
    if (e.key === 'F12') { e.preventDefault(); toggleDevTools(); }
    // Quick Switcher Ctrl+Tab / Ctrl+Shift+Tab
    if (e.key === 'Tab' && ctrl) {
      e.preventDefault();
      if (!_qsActive) { openQuickSwitcher(); }
      else {
        _qsIdx = e.shiftKey
          ? (_qsIdx - 1 + _qsList.length) % _qsList.length
          : (_qsIdx + 1) % _qsList.length;
        renderQuickSwitcher();
      }
      return;
    }
    return;
  }

  // Ctrl+K — Command Palette
  if (e.key.toLowerCase() === 'k' && !e.shiftKey && !e.altKey) {
    e.preventDefault();
    const cp = $('cmd-palette');
    if (cp?.classList.contains('hidden')) openCommandPalette();
    else closeCommandPalette();
    return;
  }

  if (e.shiftKey && e.key.toLowerCase() === 'p') {
    e.preventDefault(); openPanel('passwords'); loadPasswordsPanel(); return;
  }
  if (e.shiftKey && e.key.toLowerCase() === 't') {
    e.preventDefault(); reopenClosedTab(); return;
  }
  switch (e.key.toLowerCase()) {
    case 't': e.preventDefault(); createTab(); break;
    case 'w': e.preventDefault(); closeTab(activeTabId); break;
    case 'r': e.preventDefault(); btnReload.click(); break;
    case 'l': e.preventDefault(); urlBar.focus(); urlBar.select(); break;
    case 'b': e.preventDefault(); openPanel('bookmarks'); break;
    case 'h': e.preventDefault(); openPanel('history'); break;
    case 'j': e.preventDefault(); openPanel('downloads'); break;
    case 'i': e.preventDefault(); openPanel('ai-sidebar'); break;
    case 'f': e.preventDefault(); openFindBar(); break;
    case 'p': e.preventDefault(); tabs.find(t => t.id === activeTabId)?.webview?.print(); break;
    case '+':
    case '=': e.preventDefault(); setZoom(0.1); break;
    case '-': e.preventDefault(); setZoom(-0.1); break;
    case '0': e.preventDefault(); {
      const tab = tabs.find(t => t.id === activeTabId);
      if (tab?.webview) { tab.zoom = 1; tab.webview.setZoomFactor(1); showToast('Zresetowano powiększenie do 100%'); }
      break;
    }
    case 'm': e.preventDefault(); {
      const anyMuted = tabs.some(t => t.muted);
      muteAllTabs(!anyMuted);
      break;
    }
    default:
      // Ctrl+1-9 for tab switching
      if (e.key >= '1' && e.key <= '9') {
        e.preventDefault();
        const idx = parseInt(e.key) - 1;
        if (tabs[idx]) switchTab(tabs[idx].id);
      }
  }
});

// Alt+Left/Right for back/forward
document.addEventListener('keydown', e => {
  if (e.altKey) {
    if (e.key === 'ArrowLeft') { e.preventDefault(); btnBack.click(); }
    if (e.key === 'ArrowRight') { e.preventDefault(); btnForward.click(); }
  }
});

// ===== URL SUGGESTIONS =====
const urlSuggestions = $('url-suggestions');
let _suggestIdx = -1;
let _suggestItems = [];

urlBar.addEventListener('input', () => buildSuggestions(urlBar.value));
urlBar.addEventListener('keydown', e => {
  if (e.key === 'ArrowDown') { e.preventDefault(); moveSuggest(1); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); moveSuggest(-1); }
  else if (e.key === 'Tab' && _suggestItems.length) {
    e.preventDefault();
    if (_suggestIdx >= 0) applySuggest(_suggestItems[_suggestIdx]);
    else applySuggest(_suggestItems[0]);
  }
});
urlBar.addEventListener('blur', () => setTimeout(() => hideSuggestions(), 150));

async function buildSuggestions(query) {
  query = query.trim();
  if (!query || query.length < 2) { hideSuggestions(); return; }

  const items = [];
  const q = query.toLowerCase();

  // Calculator - detect math expressions
  const mathResult = calcMath(query);
  if (mathResult !== null) {
    items.push({ type: 'calc', icon: '🧮', title: `= ${mathResult}`, url: '' });
  }

  // History matches
  const history = await window.electronAPI.historyGet();
  const histMatches = history.filter(h =>
    h.url?.toLowerCase().includes(q) || h.title?.toLowerCase().includes(q)
  ).slice(0, 4);
  histMatches.forEach(h => items.push({ type: 'history', icon: '🕐', title: h.title || h.url, url: h.url }));

  // Bookmark matches
  const bookmarks = await window.electronAPI.bookmarksGet();
  const bmMatches = bookmarks.filter(b =>
    b.url?.toLowerCase().includes(q) || b.title?.toLowerCase().includes(q)
  ).slice(0, 3);
  bmMatches.forEach(b => items.push({ type: 'bookmark', icon: '⭐', title: b.title || b.url, url: b.url }));

  // Search suggestion
  if (!query.includes('.') || query.includes(' ')) {
    items.push({ type: 'search', icon: '🔍', title: `Search: ${query}`, url: SEARCH_ENGINES[settings.searchEngine] + encodeURIComponent(query) });
  }

  // Direct URL
  if (/^[\w-]+\.[\w]{2,}/.test(query) && !query.includes(' ')) {
    items.push({ type: 'url', icon: '🌐', title: query, url: 'https://' + query });
  }

  _suggestItems = items;
  _suggestIdx = -1;
  renderSuggestions(items);
}

function renderSuggestions(items) {
  if (!items.length) { hideSuggestions(); return; }
  urlSuggestions.innerHTML = items.map((it, i) => `
    <div class="suggest-item" data-idx="${i}">
      <span class="suggest-icon">${it.icon}</span>
      <div class="suggest-text">
        <div class="suggest-title">${esc(it.title)}</div>
        <div class="suggest-url">${esc(it.url)}</div>
      </div>
      ${it.type === 'calc' ? '' : `<span class="suggest-type">${it.type}</span>`}
    </div>
  `).join('');
  urlSuggestions.querySelectorAll('.suggest-item').forEach((el, i) => {
    el.addEventListener('mousedown', () => applySuggest(items[i]));
  });
  urlSuggestions.classList.remove('hidden');
}

function hideSuggestions() {
  urlSuggestions.classList.add('hidden');
  _suggestIdx = -1;
}

function moveSuggest(dir) {
  _suggestIdx = Math.max(-1, Math.min(_suggestItems.length - 1, _suggestIdx + dir));
  urlSuggestions.querySelectorAll('.suggest-item').forEach((el, i) => {
    el.classList.toggle('selected', i === _suggestIdx);
  });
  if (_suggestIdx >= 0) urlBar.value = _suggestItems[_suggestIdx].url;
}

function applySuggest(item) {
  hideSuggestions();
  navigate(item.url);
  urlBar.blur();
}

// ===== NOTES =====
let notes = JSON.parse(localStorage.getItem('ww_notes') || '[]');
let activeNoteId = null;
let _noteSaveTimer;

PANELS['notes'] = $('panel-notes');

function saveNotes() {
  localStorage.setItem('ww_notes', JSON.stringify(notes));
}

function openNotesPanel() {
  openPanel('notes');
  renderNotesList();
}

function renderNotesList() {
  const list = $('notes-list');
  $('notes-list-view').classList.remove('hidden');
  $('notes-editor-view').classList.add('hidden');

  if (!notes.length) {
    list.innerHTML = `<div class="panel-empty"><div class="panel-empty-icon">📝</div><span>Brak notatek.<br>Kliknij „+ Nowa”, aby utworzyć.</span></div>`;
    return;
  }
  list.innerHTML = notes.map(n => `
    <div class="note-item" data-id="${n.id}">
      <div class="note-item-title">${esc(n.title || 'Bez tytułu')}</div>
      <div class="note-item-preview">${esc(n.body.slice(0, 80))}</div>
      <div class="note-item-meta">${timeAgo(n.updated)}</div>
    </div>
  `).join('');
  list.querySelectorAll('.note-item').forEach(el => {
    el.addEventListener('click', () => openNoteEditor(el.dataset.id));
  });
}

function openNoteEditor(id) {
  const note = notes.find(n => n.id === id);
  if (!note) return;
  activeNoteId = id;
  $('notes-title-input').value = note.title;
  $('notes-textarea').value = note.body;
  $('notes-list-view').classList.add('hidden');
  $('notes-editor-view').classList.remove('hidden');
}

$('notes-new-btn').addEventListener('click', () => {
  const tab = tabs.find(t => t.id === activeTabId);
  const note = {
    id: uid(),
    title: tab?.title ? `Note: ${tab.title.slice(0, 30)}` : 'New Note',
    body: tab?.url ? `Source: ${tab.url}\n\n` : '',
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
  };
  notes.unshift(note);
  saveNotes();
  openNotesPanel();
  openNoteEditor(note.id);
});

$('notes-back-btn').addEventListener('click', () => {
  renderNotesList();
  activeNoteId = null;
});

$('notes-delete-btn').addEventListener('click', () => {
  if (!activeNoteId) return;
  notes = notes.filter(n => n.id !== activeNoteId);
  saveNotes();
  activeNoteId = null;
  renderNotesList();
});

['notes-title-input', 'notes-textarea'].forEach(id => {
  $(id)?.addEventListener('input', () => {
    if (!activeNoteId) return;
    const note = notes.find(n => n.id === activeNoteId);
    if (!note) return;
    note.title = $('notes-title-input').value || 'Bez tytułu';
    note.body = $('notes-textarea').value;
    note.updated = new Date().toISOString();
    clearTimeout(_noteSaveTimer);
    _noteSaveTimer = setTimeout(saveNotes, 500);
  });
});

// ===== SESSION MANAGER =====
PANELS['sessions'] = $('panel-sessions');
const btnSessions = $('btn-sessions') || (() => {
  const btn = document.createElement('button');
  btn.className = 'nav-btn';
  btn.id = 'btn-sessions';
  btn.title = 'Sessions (Ctrl+Shift+E)';
  btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M4 4h16v16H4z" stroke="currentColor" stroke-width="1.8" rx="2"/><path d="M8 8h8M8 12h8M8 16h4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`;
  btn.addEventListener('click', () => { openPanel('sessions'); renderSessionsList(); });
  $('nav-right')?.appendChild(btn);
  return btn;
})();

function renderSessionsList() {
  const list = $('sessions-list');
  window.electronAPI.sessionsList().then(sessions => {
    if (!sessions.length) {
      list.innerHTML = `<div class="panel-empty"><div class="panel-empty-icon">📦</div><span>Brak zapisanych sesji.<br>Kliknij „+ Zapisz bieżącą”, aby zapisać otwarte karty.</span></div>`;
      return;
    }
    list.innerHTML = sessions.map(s => `
      <div class="session-item" data-id="${s.id}">
        <div class="session-item-icon">📑</div>
        <div class="session-item-info">
          <div class="session-item-title">${esc(s.name || 'Unnamed Session')}</div>
          <div class="session-item-sub">${s.tabs?.length || 0} tabs · ${timeAgo(s.date)}</div>
        </div>
        <div class="session-item-actions">
          <button class="session-item-btn" data-action="restore" title="Przywróć">▶</button>
          <button class="session-item-btn danger" data-action="delete" title="Usuń">🗑</button>
        </div>
      </div>
    `).join('');

    list.querySelectorAll('.session-item').forEach(el => {
      el.addEventListener('click', e => {
        const action = e.target.closest('[data-action]')?.dataset.action;
        if (action === 'restore') { restoreSession(el.dataset.id); return; }
        if (action === 'delete') {
          if (confirm('Usunąć tę sesję?')) {
            window.electronAPI.sessionDelete(el.dataset.id);
            renderSessionsList();
            showToast('Usunięto sesję');
          }
          return;
        }
        restoreSession(el.dataset.id);
      });
    });
  });
}

function saveCurrentSession(name) {
  const tabData = tabs.filter(t => t.url).map(t => ({
    url: t.url,
    title: t.title || t.url,
    favicon: t.favicon || '',
  }));
  if (!tabData.length) { showToast('Brak kart z adresami URL do zapisania'); return; }
  const session = {
    id: uid(),
    name: name || `Sesja ${new Date().toLocaleDateString()}`,
    tabs: tabData,
    date: new Date().toISOString(),
  };
  window.electronAPI.sessionSave(session);
  showToast('✅ Zapisano sesję');
  renderSessionsList();
}

function restoreSession(id) {
  window.electronAPI.sessionGet(id).then(session => {
    if (!session?.tabs?.length) { showToast('Sesja jest pusta'); return; }
    session.tabs.forEach(t => createTab(t.url));
    showToast(`📑 Przywrócono ${session.tabs.length} kart`);
    closeAllPanels();
  });
}

function saveLastSession() {
  const tabData = tabs.filter(t => t.url).map(t => ({
    url: t.url,
    title: t.title || t.url,
    favicon: t.favicon || '',
  }));
  if (tabData.length > 0) {
    window.electronAPI.sessionSaveLast({ tabs: tabData, date: new Date().toISOString() });
  }
}

// Auto-save on quit
window.electronAPI.on('before-quit-save', () => {
  saveLastSession();
});

// Restore last session prompt
async function checkLastSession() {
  const last = await window.electronAPI.sessionGetLast();
  if (last?.tabs?.length > 0) {
    // Show restore bar in new tab page or a notification
    const bar = $('session-auto');
    if (bar) {
      const restoreBtn = $('session-restore-last');
      if (restoreBtn) {
        restoreBtn.addEventListener('click', () => {
          last.tabs.forEach(t => createTab(t.url));
          showToast(`📑 Przywrócono ${last.tabs.length} kart z ostatniej sesji`);
          bar.style.display = 'none';
        });
      }
    }
  }
}

// Session save dialog
$('session-save-btn')?.addEventListener('click', () => {
  const name = prompt('Nazwij tę sesję:', `Sesja ${new Date().toLocaleDateString()}`);
  if (name !== null) saveCurrentSession(name);
});


// Periodic auto-save
setInterval(saveLastSession, 60000);

// ===== EXTENSIONS PANEL =====
PANELS['extensions'] = $('panel-extensions');

function renderExtensionsList() {
  const list = $('extensions-list');
  window.electronAPI.extensionsList().then(exts => {
    if (!exts.length) {
      list.innerHTML = `<div class="panel-empty"><div class="panel-empty-icon">🧩</div><span>Brak zainstalowanych rozszerzeń.<br>Dodaj foldery do <code style="font-size:11px;background:var(--bg-4);padding:1px 5px;border-radius:2px">userData/extensions/</code></span></div>`;
      return;
    }
    list.innerHTML = exts.map(ext => `
      <div class="ext-item">
        <div class="ext-icon">${ext.name[0]?.toUpperCase() || '?'}</div>
        <div class="ext-info">
          <div class="ext-name">${esc(ext.name)}<span class="ext-ver">v${esc(ext.version)}</span>
            ${ext.hasBackground ? '<span class="ext-badge">bg</span>' : ''}
            ${ext.contentScripts?.length ? '<span class="ext-badge">cs</span>' : ''}
          </div>
          <div class="ext-desc">${esc(ext.description) || 'Brak opisu'}</div>
        </div>
        <label class="toggle">
          <input type="checkbox" class="ext-toggle" ${ext.enabled ? 'checked' : ''} />
          <span class="toggle-slider"></span>
        </label>
      </div>
    `).join('');

    list.querySelectorAll('.ext-toggle').forEach((cb, i) => {
      cb.addEventListener('change', function () {
        const id = exts[i].id;
        window.electronAPI.extensionToggle(id, this.checked);
        showToast(this.checked ? 'Rozszerzenie włączone' : 'Rozszerzenie wyłączone');
      });
    });
  });
}

// Extensions reload button
$('ext-reload-btn')?.addEventListener('click', () => {
  window.electronAPI.extensionReloadAll();
  setTimeout(renderExtensionsList, 300);
  showToast('Przeładowano rozszerzenia');
});

// Reload on event
window.electronAPI.on('extensions-reloaded', () => {
  if (activePanel === 'extensions') renderExtensionsList();
});

// Add extensions button to navbar
const btnExtensions = (() => {
  const btn = document.createElement('button');
  btn.className = 'nav-btn';
  btn.id = 'btn-extensions';
  btn.title = 'Rozszerzenia';
  btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M10 4h4v3h-4zM17 10h3v4h-3zM4 10h3v4H4z" stroke="currentColor" stroke-width="1.8"/><path d="M10 17h4v3h-4z" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.8"/></svg>`;
  btn.addEventListener('click', () => { openPanel('extensions'); renderExtensionsList(); });
  $('nav-right')?.appendChild(btn);
  return btn;
})();

// Inject content scripts into webviews on navigation
function setupExtensionContentScripts(webview, tabId) {
  webview.addEventListener('did-navigate', (e) => {
    injectExtContentScripts(webview, e.url);
  });
  webview.addEventListener('did-navigate-in-page', (e) => {
    injectExtContentScripts(webview, e.url);
  });
}

function injectExtContentScripts(webview, url) {
  window.electronAPI.extensionsList().then(exts => {
    exts.filter(e => e.enabled && e.contentScripts?.length).forEach(ext => {
      ext.contentScripts.forEach(cs => {
        if (!cs.matches.some(m => matchPatternExt(m, url))) return;
        // Inject CSS
        cs.css?.forEach(cssFile => {
          window.electronAPI.extensionReadFile(ext.id, cssFile).then(css => {
            if (css) webview.insertCSS(css).catch(() => {});
          });
        });
        // Inject JS
        cs.js?.forEach(jsFile => {
          window.electronAPI.extensionReadFile(ext.id, jsFile).then(js => {
            if (js) {
              const wrapped = `
                (function() {
                  const chrome = ${generateChromeAPIExt(ext.id)};
                  ${js}
                })();
              `;
              webview.executeJavaScript(wrapped).catch(() => {});
            }
          });
        });
      });
    });
  });
}

function generateChromeAPIExt(extId) {
  return `{
    runtime: {
      id: '${extId}',
      sendMessage: function(msg, cb) { /* would need IPC bridge */ },
      onMessage: { addListener: function(cb) { window.__extOnMessage = cb; } }
    },
    storage: {
      local: {
        get: function(keys, cb) { /* would need IPC bridge */ },
        set: function(items, cb) { /* would need IPC bridge */ }
      }
    }
  }`;
}

function matchPatternExt(pattern, url) {
  if (pattern === '<all_urls>') return true;
  try {
    new URL(url);
    let reStr = pattern;
    if (reStr.startsWith('http://')) {
      reStr = '^http:\\/\\/' + reStr.slice(7);
    } else if (reStr.startsWith('https://')) {
      reStr = '^https:\\/\\/' + reStr.slice(8);
    } else if (reStr.startsWith('*://')) {
      reStr = '^.*:\\/\\/' + reStr.slice(4);
    }
    reStr = reStr.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
    reStr = reStr.replace(/\*/g, '.*');
    return new RegExp(reStr, 'i').test(url);
  } catch(e) { return false; }
}

// Override attachWebview to inject content scripts
const _origAttachWebview = attachWebview;
attachWebview = function(tab, url) {
  _origAttachWebview(tab, url);
  const wv = tab.webview;
  if (wv) {
    setupExtensionContentScripts(wv, tab.id);
  }
};

// ===== READER MODE =====
let readerActive = false;
let readerFontSize = 16;
let readerLightMode = false;

async function toggleReaderMode() {
  const tab = tabs.find(t => t.id === activeTabId);
  if (!tab?.webview) return;

  const overlay = $('reader-overlay');
  if (readerActive) {
    overlay.classList.add('hidden');
    readerActive = false;
    stopTTS();
    $('btn-reader').classList.remove('active');
    return;
  }

  // Extract page content via executeJavaScript
  try {
    const result = await tab.webview.executeJavaScript(`
      (function() {
        const title = document.title;
        const h1 = document.querySelector('h1')?.innerText || '';
        // Try to find main content
        const selectors = ['article', 'main', '[role="main"]', '.post-content', '.article-body', '.entry-content', '#content', '.content'];
        let el = null;
        for (const s of selectors) { el = document.querySelector(s); if (el) break; }
        if (!el) el = document.body;
        // Remove scripts, ads, navs
        const clone = el.cloneNode(true);
        clone.querySelectorAll('script,style,nav,footer,header,aside,.ad,.advertisement,[class*="ad-"]').forEach(e => e.remove());
        return { title, h1, html: clone.innerHTML };
      })()
    `);

    $('reader-content').innerHTML = `
      <h1>${esc(result.h1 || result.title)}</h1>
      ${result.html}
    `;
    $('reader-content').style.fontFamily = 'Georgia,serif';
    $('reader-content').style.fontSize = readerFontSize + 'px';
    overlay.classList.remove('hidden');
    readerActive = true;
    $('btn-reader').classList.add('active');
  } catch (e) {
    showToast('Tryb czytnika niedostępny dla tej strony');
  }
}

$('btn-reader').addEventListener('click', toggleReaderMode);
$('reader-close').addEventListener('click', () => {
  $('reader-overlay').classList.add('hidden');
  readerActive = false;
  stopTTS();
  $('btn-reader').classList.remove('active');
});

$('reader-font-inc').addEventListener('click', () => {
  readerFontSize = Math.min(28, readerFontSize + 2);
  $('reader-content').style.fontSize = readerFontSize + 'px';
});
$('reader-font-dec').addEventListener('click', () => {
  readerFontSize = Math.max(12, readerFontSize - 2);
  $('reader-content').style.fontSize = readerFontSize + 'px';
});
$('reader-font-family').addEventListener('change', function() {
  $('reader-content').style.fontFamily = this.value;
});
$('reader-theme-toggle').addEventListener('click', () => {
  readerLightMode = !readerLightMode;
  $('reader-overlay').classList.toggle('reader-light', readerLightMode);
  $('reader-theme-toggle').textContent = readerLightMode ? '🌑' : '🌙';
});

// Text-to-Speech with pause/resume and chunking
let ttsSpeaking = false;
let ttsPaused = false;
let ttsUtterance = null;

$('reader-tts').addEventListener('click', () => {
  if (ttsSpeaking && !ttsPaused) {
    speechSynthesis.pause();
    ttsPaused = true;
    $('reader-tts').textContent = '▶️';
    return;
  }
  if (ttsPaused) {
    speechSynthesis.resume();
    ttsPaused = false;
    $('reader-tts').textContent = '⏸';
    return;
  }
  const text = $('reader-content').innerText;
  if (!text) return;

  // Split into chunks of ~200 chars for reliability
  const chunks = text.match(/.{1,200}(\s|$)/g) || [text];
  let idx = 0;

  function speakNext() {
    if (idx >= chunks.length) {
      ttsSpeaking = false;
      ttsPaused = false;
      $('reader-tts').textContent = '🔊';
      return;
    }
    const utt = new SpeechSynthesisUtterance(chunks[idx]);
    utt.onend = () => { idx++; speakNext(); };
    utt.onerror = () => { ttsSpeaking = false; ttsPaused = false; $('reader-tts').textContent = '🔊'; };
    ttsUtterance = utt;
    speechSynthesis.speak(utt);
  }

  ttsSpeaking = true;
  ttsPaused = false;
  $('reader-tts').textContent = '⏸';
  speakNext();
});
function stopTTS() {
  speechSynthesis.cancel();
  ttsSpeaking = false;
  ttsPaused = false;
  ttsUtterance = null;
  $('reader-tts').textContent = '🔊';
}

// ===== PAGE RESOURCE STATS =====
async function showPageStats() {
  const tab = tabs.find(t => t.id === activeTabId);
  if (!tab?.webview) return;
  try {
    const stats = await tab.webview.executeJavaScript(`({
      images: document.images.length,
      scripts: document.scripts.length,
      stylesheets: document.styleSheets.length,
      links: document.links.length,
      iframes: document.querySelectorAll('iframe').length,
      videos: document.querySelectorAll('video').length,
      audios: document.querySelectorAll('audio').length,
      fonts: document.querySelectorAll('link[rel=stylesheet][href*=font]').length + document.querySelectorAll('style:has(@font-face)').length,
      totalSize: document.documentElement.innerHTML.length,
      headings: document.querySelectorAll('h1,h2,h3').length,
      paragraphs: document.querySelectorAll('p').length,
    })`);
    showToast(`📊 ${stats.images} obrazów · ${stats.scripts} skryptów · ${stats.videos} filmów · ${stats.links} linków · ${stats.iframes} ramek · ${stats.headings} nagłówków · ${(stats.totalSize/1024).toFixed(0)}KB HTML`);
  } catch (_) { showToast('Nie udało się pobrać statystyk strony'); }
}

// ===== READING TIME ESTIMATOR =====
async function showReadingTime() {
  const tab = tabs.find(t => t.id === activeTabId);
  if (!tab?.webview) return;
  try {
    const wordCount = await tab.webview.executeJavaScript(`
      (function() {
        const article = document.querySelector('article') || document.querySelector('[role=main]') || document.body;
        if (!article) return 0;
        const text = article.innerText || '';
        const words = text.trim().split(/\\s+/).filter(w => w.length > 0).length;
        return words;
      })()
    `);
    if (wordCount > 50) {
      const mins = Math.max(1, Math.round(wordCount / 200));
      showToast(`📖 ok. ${mins} min czytania · ${wordCount} słów`, 3000);
    } else {
      showToast('To nie jest strona artykułu', 1500);
    }
  } catch (_) { showToast('Nie udało się oszacować czasu czytania'); }
}

// ===== SCREENSHOT =====
$('btn-screenshot').addEventListener('click', (e) => {
  e.stopPropagation();
  toggleScreenshotMenu();
});

function flashEffect() {
  const flash = document.createElement('div');
  flash.className = 'screenshot-flash';
  document.body.appendChild(flash);
  setTimeout(() => flash.remove(), 500);
}

async function copyPngToClipboard(png) {
  const blob = new Blob([png], { type: 'image/png' });
  try {
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    return true;
  } catch (_) {
    // Fallback: save to file
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `waveweb-screenshot-${Date.now()}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 3000);
    return false;
  }
}

function getActiveWebview() {
  const tab = tabs.find(t => t.id === activeTabId);
  return tab?.webview || null;
}

// --- Screenshot mode menu ---
let ssMenuEl = null;
function toggleScreenshotMenu() {
  if (ssMenuEl) { closeScreenshotMenu(); return; }
  ssMenuEl = document.createElement('div');
  ssMenuEl.className = 'ss-menu';
  ssMenuEl.innerHTML = `
    <button data-mode="visible">🖥️<span>Visible area</span><small>Ctrl+Shift+S</small></button>
    <button data-mode="region">⬚<span>Selected area</span><small>Drag to select</small></button>
    <button data-mode="fullpage">📄<span>Full page</span><small>Scrolling capture</small></button>
  `;
  document.body.appendChild(ssMenuEl);
  const r = $('btn-screenshot').getBoundingClientRect();
  ssMenuEl.style.top = (r.bottom + 8) + 'px';
  ssMenuEl.style.right = (window.innerWidth - r.right) + 'px';
  ssMenuEl.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      closeScreenshotMenu();
      if (btn.dataset.mode === 'visible') takeScreenshot();
      else if (btn.dataset.mode === 'region') startRegionScreenshot();
      else takeFullPageScreenshot();
    });
  });
  setTimeout(() => document.addEventListener('mousedown', ssOutsideClose), 0);
}
function ssOutsideClose(e) {
  if (ssMenuEl && !ssMenuEl.contains(e.target)) closeScreenshotMenu();
}
function closeScreenshotMenu() {
  ssMenuEl?.remove();
  ssMenuEl = null;
  document.removeEventListener('mousedown', ssOutsideClose);
}

// --- Mode 1: visible area ---
async function takeScreenshot() {
  const wv = getActiveWebview();
  if (!wv) { showToast('Brak strony do zrzutu ekranu'); return; }
  try {
    const img = await wv.capturePage();
    flashEffect();
    const ok = await copyPngToClipboard(img.toPNG());
    showToast(ok ? '📸 Zrzut ekranu skopiowany do schowka!' : '📸 Zapisano zrzut ekranu!');
  } catch (e) {
    showToast('Zrzut ekranu nie powiódł się: ' + e.message);
  }
}

// --- Mode 2: region select ---
function startRegionScreenshot() {
  if ($('ss-region-overlay')) return;
  const wv = getActiveWebview();
  if (!wv) { showToast('Brak strony do zrzutu ekranu'); return; }

  const overlay = document.createElement('div');
  overlay.id = 'ss-region-overlay';
  const box = document.createElement('div');
  box.className = 'ss-selection-box hidden';
  const label = document.createElement('div');
  label.className = 'ss-dim-label hidden';
  overlay.appendChild(box);
  overlay.appendChild(label);
  document.body.appendChild(overlay);

  let sx = 0, sy = 0, dragging = false;

  const onKeyDown = (e) => { if (e.key === 'Escape') cleanup(); };
  const onMouseDown = (e) => {
    if (e.button !== 0) return;
    dragging = true;
    sx = e.clientX; sy = e.clientY;
    box.classList.remove('hidden');
    label.classList.remove('hidden');
    updateBox(e.clientX, e.clientY);
  };
  const onMouseMove = (e) => {
    if (!dragging) return;
    updateBox(e.clientX, e.clientY);
  };
  const onMouseUp = async (e) => {
    if (!dragging) return;
    dragging = false;
    const rect = box.getBoundingClientRect();
    cleanup();
    if (rect.width < 8 || rect.height < 8) return;
    await cropAndCopyRegion(rect);
  };

  function updateBox(cx, cy) {
    const x = Math.min(sx, cx), y = Math.min(sy, cy);
    const w = Math.abs(cx - sx), h = Math.abs(cy - sy);
    box.style.left = x + 'px'; box.style.top = y + 'px';
    box.style.width = w + 'px'; box.style.height = h + 'px';
    label.textContent = `${Math.round(w)} × ${Math.round(h)}`;
    label.style.left = x + 'px';
    label.style.top = Math.max(2, y - 22) + 'px';
  }

  function cleanup() {
    document.removeEventListener('keydown', onKeyDown, true);
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
    overlay.remove();
  }

  overlay.addEventListener('mousedown', onMouseDown);
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
  document.addEventListener('keydown', onKeyDown, true);
}

async function cropAndCopyRegion(rect) {
  const wv = getActiveWebview();
  if (!wv) return;
  try {
    const wvRect = wv.getBoundingClientRect();
    // Intersect selection with webview area
    const x0 = Math.max(rect.left, wvRect.left);
    const y0 = Math.max(rect.top, wvRect.top);
    const x1 = Math.min(rect.right, wvRect.right);
    const y1 = Math.min(rect.bottom, wvRect.bottom);
    const w = x1 - x0, h = y1 - y0;
    if (w <= 0 || h <= 0) { showToast('Zaznaczenie jest poza stroną'); return; }

    const img = await wv.capturePage();
    const cropped = img.crop({
      x: Math.round(x0 - wvRect.left),
      y: Math.round(y0 - wvRect.top),
      width: Math.round(w),
      height: Math.round(h),
    });
    flashEffect();
    const ok = await copyPngToClipboard(cropped.toPNG());
    showToast(ok ? '📸 Obszar skopiowany do schowka!' : '📸 Zapisano obszar!');
  } catch (e) {
    showToast('Nie udało się przechwycić obszaru: ' + e.message);
  }
}

// --- Mode 3: full page (scroll capture & stitch) ---
async function takeFullPageScreenshot() {
  const wv = getActiveWebview();
  if (!wv) { showToast('Brak strony do zrzutu ekranu'); return; }
  showToast('📄 Przechwytywanie całej strony…', 4000);
  let originalY = 0;
  try {
    const m = await wv.executeJavaScript(`(() => {
      const d = document.documentElement;
      return {
        sh: Math.max(d.scrollHeight, document.body ? document.body.scrollHeight : 0),
        vh: window.innerHeight,
        y: window.scrollY,
      };
    })()`);
    if (!m || !m.sh) throw new Error('Cannot read page size');
    originalY = m.y;

    const dpr = await wv.executeJavaScript('window.devicePixelRatio') || 1;
    const vw = wv.clientWidth || 1200;
    const scale = Math.min(1, 1400 / vw);
    const MAXH = 12000;
    const targetH = Math.min(m.sh, MAXH);

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(vw * scale * dpr));
    canvas.height = Math.max(1, Math.round(targetH * scale * dpr));
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const step = Math.max(200, Math.floor(m.vh * 0.9));
    for (let y = 0; y < targetH; y += step) {
      await wv.executeJavaScript(`window.scrollTo(0, ${y}); true`);
      await new Promise(r => setTimeout(r, 260));
      const shot = await wv.capturePage();
      const bmp = await createImageBitmap(new Blob([shot.toPNG()], { type: 'image/png' }));
      const dy = Math.round(y * scale * dpr);
      const dh = Math.round((m.vh * scale * dpr)) + Math.ceil(4 * dpr);
      ctx.drawImage(bmp, 0, 0, bmp.width, bmp.height, 0, dy, canvas.width, dh);
      if (bmp.close) bmp.close();
    }

    await wv.executeJavaScript(`window.scrollTo(0, ${originalY}); true`);
    flashEffect();

    const dataUrl = canvas.toDataURL('image/png');
    const savedPath = await window.electronAPI.screenshotSave({
      dataUrl,
      filename: `waveweb-fullpage-${Date.now()}.png`,
    });
    if (savedPath) showToast('📸 Zapisano zrzut całej strony w Pobieranie!');
    else showToast('Nie udało się zapisać zrzutu całej strony');
  } catch (e) {
    try { await wv.executeJavaScript(`window.scrollTo(0, ${originalY}); true`); } catch (_) {}
    showToast('Nie udało się przechwycić całej strony: ' + e.message);
  }
}

// ===== PICTURE IN PICTURE =====
$('btn-pip').addEventListener('click', async () => {
  const tab = tabs.find(t => t.id === activeTabId);
  if (!tab?.webview) return;
  try {
    await tab.webview.executeJavaScript(`
      (function() {
        const video = document.querySelector('video');
        if (video) {
          if (document.pictureInPictureElement) {
            document.exitPictureInPicture();
          } else {
            video.requestPictureInPicture();
          }
        } else {
          alert('Na tej stronie nie znaleziono wideo.');
        }
      })()
    `);
  } catch(e) {
    showToast('Tryb obraz w obrazie niedostępny na tej stronie');
  }
});

// ===== INCOGNITO TAB =====
let incognitoCount = 0;

function createIncognitoTab(url = null) {
  const id = createTab(url);
  const tab = tabs.find(t => t.id === id);
  if (tab) tab.incognito = true;

  const tabEl = document.querySelector(`[data-tab-id="${id}"]`);
  if (tabEl) tabEl.classList.add('incognito');

  incognitoCount++;
  $('status-incognito').classList.remove('hidden');
  showToast('🕵 Karta incognito — historia nie jest zapisywana');
  return id;
}

$('btn-incognito').addEventListener('click', () => createIncognitoTab());

// ===== MOUSE GESTURES =====
const gestureIndicator = (() => {
  const el = document.createElement('div');
  el.id = 'gesture-indicator';
  document.body.appendChild(el);
  return el;
})();

let _gestureStart = null;
let _gestureTimer;

document.addEventListener('mousedown', e => {
  if (e.button === 2) { // right mouse button
    _gestureStart = { x: e.clientX, y: e.clientY };
  }
});

document.addEventListener('mousemove', e => {
  if (!_gestureStart || e.buttons !== 2) return;
  const dx = e.clientX - _gestureStart.x;
  const dy = e.clientY - _gestureStart.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist > 30) {
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;
    if (Math.abs(angle) < 30) showGesture('→ Naprzód');
    else if (Math.abs(angle) > 150) showGesture('← Wstecz');
    else if (angle < -60 && angle > -120) showGesture('↑ Nowa karta');
    else if (angle > 60 && angle < 120) showGesture('↓ Zamknij kartę');
  }
});

document.addEventListener('mouseup', e => {
  if (e.button === 2 && _gestureStart) {
    const dx = e.clientX - _gestureStart.x;
    const dy = e.clientY - _gestureStart.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 50) {
      const angle = Math.atan2(dy, dx) * 180 / Math.PI;
      if (Math.abs(angle) < 30) { btnForward.click(); e.preventDefault(); }
      else if (Math.abs(angle) > 150) { btnBack.click(); e.preventDefault(); }
      else if (angle < -60 && angle > -120) createTab();
      else if (angle > 60 && angle < 120) closeTab(activeTabId);
    }
    _gestureStart = null;
    hideGesture();
  }
});

function showGesture(text) {
  gestureIndicator.textContent = text;
  gestureIndicator.classList.add('show');
  clearTimeout(_gestureTimer);
}
function hideGesture() {
  gestureIndicator.classList.remove('show');
}

// ===== STATUS BAR =====
function updateStatusBar() {
  const tab = tabs.find(t => t.id === activeTabId);
  const zoomEl = $('status-zoom');
  if (zoomEl) zoomEl.textContent = Math.round((tab?.zoom || 1) * 100) + '%';

  const incEl = $('status-incognito');
  if (incEl) {
    const hasIncognito = tabs.some(t => t.incognito);
    incEl.classList.toggle('hidden', !hasIncognito);
  }
}

setInterval(updateStatusBar, 2000);

// Show URL in status bar on hover over links
document.addEventListener('mouseover', e => {
  const a = e.target.closest('a[href]');
  if (a) {
    $('status-text').textContent = a.href;
  }
});
document.addEventListener('mouseout', e => {
  if (e.target.closest('a[href]')) $('status-text').textContent = '';
});

// ===== KEYBOARD SHORTCUTS POPUP =====
function hideShortcuts() {
  const popup = $('shortcuts-popup');
  if (!popup || popup.classList.contains('hidden')) return;
  popup.classList.add('closing');
  setTimeout(() => {
    popup.classList.add('hidden');
    popup.classList.remove('closing');
  }, 220);
}
$('shortcuts-close').addEventListener('click', hideShortcuts);
$('shortcuts-backdrop').addEventListener('click', hideShortcuts);

function showShortcuts() {
  const popup = $('shortcuts-popup');
  popup.classList.remove('hidden', 'closing');
}

// notes panel button registered in init

// ===== EXTRA KEYBOARD SHORTCUTS =====
document.addEventListener('keydown', e => {
  // ? key = shortcuts help (not in input)
  if (e.key === '?' && !['INPUT','TEXTAREA'].includes(document.activeElement.tagName)) {
    showShortcuts();
  }

  const ctrl = e.ctrlKey || e.metaKey;
  if (!ctrl) return;

  // Ctrl+Shift combos
  if (e.shiftKey) {
    switch (e.key.toLowerCase()) {
      case 'a': e.preventDefault(); showTabSearch(); break;
      case 'r': e.preventDefault(); toggleReaderMode(); break;
      case 's': e.preventDefault(); takeScreenshot(); break;
      case 'n': e.preventDefault(); createIncognitoTab(); break;
      case 'e': e.preventDefault(); openPanel('sessions'); renderSessionsList(); break;
      case 'x': e.preventDefault(); openPanel('extensions'); renderExtensionsList(); break;
    }
  }

  // Ctrl+D = bookmark
  if (e.key.toLowerCase() === 'd') {
    e.preventDefault();
    btnBookmarkPage.click();
  }

  // Ctrl+M = notes
  if (e.key.toLowerCase() === 'm') {
    e.preventDefault();
    openPanel('notes');
    renderNotesList();
  }

  // Ctrl+U = view source
  if (e.key.toLowerCase() === 'u') {
    e.preventDefault();
    const tab = tabs.find(t => t.id === activeTabId);
    if (tab?.url) createTab('view-source:' + tab.url);
  }
});

// ===== ONBOARDING =====
let _obStep = 0;
const ONBOARDING_STEPS = 4;

function startOnboarding() {
  const overlay = $('onboarding-overlay');
  overlay.classList.remove('hidden');
  _obStep = 0;
  showObStep(0);
}

function showObStep(step) {
  _obStep = step;
  document.querySelectorAll('.onboarding-step').forEach(el => el.classList.add('hidden'));
  document.querySelector(`.onboarding-step[data-step="${step}"]`)?.classList.remove('hidden');

  document.querySelectorAll('.ob-step').forEach(el => el.classList.toggle('active', parseInt(el.dataset.step) === step));
  document.querySelectorAll('.ob-dot').forEach(el => el.classList.toggle('active', parseInt(el.dataset.step) === step));

  $('ob-prev').style.visibility = step === 0 ? 'hidden' : 'visible';
  $('ob-next').textContent = step === ONBOARDING_STEPS - 1 ? 'Get Started' : 'Next';

  if (step === 2) {
    // Sync accent picker
    const saved = localStorage.getItem('ww_accent_color') || 'ff1a35';
    document.querySelectorAll('#ob-accent-picker .accent-opt').forEach(b => {
      b.classList.toggle('active', b.dataset.color === saved);
    });
  }
}

$('ob-next').addEventListener('click', () => {
  if (_obStep === 2) {
    // Save chosen accent
    const active = document.querySelector('#ob-accent-picker .accent-opt.active');
    if (active) {
      const color = active.dataset.color;
      document.documentElement.style.setProperty('--accent', '#' + color);
      localStorage.setItem('ww_accent_color', color);
    }
  }
  if (_obStep >= ONBOARDING_STEPS - 1) {
    closeOnboarding();
    return;
  }
  showObStep(_obStep + 1);
});

$('ob-prev').addEventListener('click', () => {
  if (_obStep > 0) showObStep(_obStep - 1);
});

$('ob-skip-ai')?.addEventListener('click', () => {
  showObStep(_obStep + 1);
});

$('ob-start-ai')?.addEventListener('click', async () => {
  if (!aiPipeline) await loadAIModel();
  if (aiPipeline) $('ai-api-setup').classList.add('hidden');
  showObStep(_obStep + 1);
});

// Accent picker in onboarding
document.querySelectorAll('#ob-accent-picker .accent-opt').forEach(btn => {
  btn.addEventListener('click', function () {
    document.querySelectorAll('#ob-accent-picker .accent-opt').forEach(b => b.classList.remove('active'));
    this.classList.add('active');
  });
});

function closeOnboarding() {
  $('onboarding-overlay').classList.add('hidden');
  localStorage.setItem('ww_onboarded', 'true');
}

// ===== INIT =====
(async function init() {
  try {
    await initSettings();

    // AI init: nothing to do — model loads on first message
    $('ai-api-setup')?.classList.remove('hidden');

    // Register notes panel
    PANELS['notes'] = $('panel-notes');

    createTab();
    loadBookmarksBar();
    updateStats();
    updateStatusBar();

    setInterval(updateStats, 30000);

    // Auto-updater
    initUpdater();

    // Vertical tabs restore
    if (localStorage.getItem('ww_vertical_tabs')) {
      document.body.classList.add('vertical-tabs');
      $('tabsbar')?.classList.add('vertical-mode');
      $('btn-vertical-tabs')?.classList.add('active');
    }
    $('btn-vertical-tabs')?.addEventListener('click', toggleVerticalTabs);

    // Quick switcher — close on Ctrl release
    document.addEventListener('keyup', e => {
      if (!e.ctrlKey && !e.metaKey && _qsActive) {
        closeQuickSwitcher();
        if (_qsList[_qsIdx]) switchTab(_qsList[_qsIdx].id);
      }
    });

    // Weather widget
    loadWeatherWidget();
    setInterval(loadWeatherWidget, 600000); // refresh every 10 min

    // Onboarding
    if (!localStorage.getItem('ww_onboarded')) {
      setTimeout(startOnboarding, 400);
    }

    // Check for last session
  checkLastSession();
  const last = await window.electronAPI.sessionGetLast();
  if (last?.tabs?.length > 0) {
    setTimeout(() => {
      const t = showUpdateToast(`
        <div style="display:flex;align-items:center;gap:10px;width:100%;">
          <div style="width:32px;height:32px;border-radius:8px;background:var(--bg-4);display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:16px;">📑</div>
          <div style="display:flex;flex-direction:column;flex:1;">
            <span style="font-weight:500;color:var(--text-1);font-size:13px;">Przywrócić ${last.tabs.length} kart z ostatniej sesji?</span>
          </div>
          <button id="session-restore-toast-btn" style="
            background:linear-gradient(135deg,var(--accent),var(--accent2));color:#fff;border:none;border-radius:var(--r-sm);
            padding:6px 14px;font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap;
          ">Przywróć</button>
        </div>
      `, 8000);
      t.querySelector('#session-restore-toast-btn')?.addEventListener('click', () => {
        last.tabs.forEach(tab => createTab(tab.url));
        t.remove();
        showToast('📑 Przywrócono sesję');
      });
    }, 1500);
  }

  console.log('%c🌊 WAVEWEB', 'color:#ff1a35;font-weight:900;font-size:18px;');
  console.log('%cBrowser ready', 'color:#ff4444;font-size:12px;');

  // Dismiss splash screen
  const splash = $('splash');
  if (splash) {
    splash.classList.add('fade-out');
    setTimeout(() => splash.remove(), 600);
  }
  } catch (err) {
    console.error('[WAVEWEB] Init error:', err);
    const splash = $('splash');
    if (splash) { splash.classList.add('fade-out'); setTimeout(() => splash.remove(), 600); }
  }

  function renderClipboardPanel() {
  const list = $('clipboard-list');
  if (!list) return;
  window.electronAPI.clipboardGetHistory().then(items => {
    if (!items || !items.length) {
      list.innerHTML = `<div class="panel-empty"><div class="panel-empty-icon">📋</div><span>Schowek jest pusty.<br>Skopiowany tekst pojawi się tutaj.</span></div>`;
      return;
    }
    list.innerHTML = items.map(item => {
      const preview = (item.text || '').substring(0, 120).replace(/</g, '&lt;');
      const timeAgo = item.timestamp ? formatTimeAgo(item.timestamp) : '';
      return `<div class="panel-item clip-item" data-id="${esc(item.id)}">
        <div class="panel-item-icon" style="font-size:12px;">${item.pinned ? '📌' : '📋'}</div>
        <div class="panel-item-info">
          <div class="panel-item-title" style="white-space:normal;max-height:36px;overflow:hidden;">${esc(preview)}</div>
          <div class="panel-item-sub">${esc(timeAgo)}${item.pinned ? ' • Przypięte' : ''}</div>
        </div>
        <div class="panel-item-actions">
          <button class="panel-item-btn" data-action="copy" title="Kopiuj">📋</button>
          <button class="panel-item-btn" data-action="pin" title="${item.pinned ? 'Odepnij' : 'Przypnij'}">${item.pinned ? '📌' : '📎'}</button>
          <button class="panel-item-btn danger" data-action="delete" title="Usuń">✕</button>
        </div>
      </div>`;
    }).join('');

    list.querySelectorAll('.panel-item').forEach(el => {
      const id = el.dataset.id;
      el.querySelector('[data-action="copy"]')?.addEventListener('click', async (e) => {
        e.stopPropagation();
        const item = items.find(i => i.id === id);
        if (item) { await window.electronAPI.clipboardCopy(item.text); showToast('Skopiowano!'); }
      });
      el.querySelector('[data-action="pin"]')?.addEventListener('click', async (e) => {
        e.stopPropagation();
        await window.electronAPI.clipboardPin(id);
        renderClipboardPanel();
      });
      el.querySelector('[data-action="delete"]')?.addEventListener('click', async (e) => {
        e.stopPropagation();
        await window.electronAPI.clipboardDelete(id);
        renderClipboardPanel();
      });
    });
  });
}
$('clipboard-clear-btn')?.addEventListener('click', async () => {
  await window.electronAPI.clipboardClear(true);
  renderClipboardPanel();
  showToast('Wyczyszczono schowek');
});
$('clipboard-search')?.addEventListener('input', () => {
  const q = ($('clipboard-search')?.value || '').toLowerCase();
  const items = $('clipboard-list')?.querySelectorAll('.panel-item') || [];
  items.forEach(el => {
    const text = el.textContent.toLowerCase();
    el.style.display = text.includes(q) ? '' : 'none';
  });
});

function formatTimeAgo(ts) {
  const diff = Date.now() - ts;
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
  if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
  return Math.floor(diff / 86400000) + 'd ago';
}

// ===== PERFORMANCE PANEL =====
function formatUptime(sec) {
  const d = Math.floor(sec / 86400), h = Math.floor((sec % 86400) / 3600), m = Math.floor((sec % 3600) / 60);
  let s = '';
  if (d) s += d + 'd ';
  if (h) s += h + 'h ';
  if (m) s += m + 'm';
  return s.trim() || '0m';
}

let _perfInterval = null;
let _perfPoints = [];

function perfBarClass(pct) {
  if (pct >= 85) return 'danger';
  if (pct >= 60) return 'warn';
  return '';
}

function perfHealth(cpu, memPct) {
  if (cpu >= 85 || memPct >= 90) return { text: 'Wysokie obciążenie', cls: 'danger' };
  if (cpu >= 55 || memPct >= 70) return { text: 'Umiarkowane', cls: 'warn' };
  return { text: 'Wydajny', cls: 'ok' };
}

function perfChartBars(container, points, maxVal, unit) {
  const el = $(container);
  if (!el) return;
  if (!points || !points.length) { el.innerHTML = '<span class="perf-chart-empty">collecting…</span>'; return; }
  const last = Math.max(1, maxVal || 100);
  let html = '';
  for (let i = 0; i < points.length; i++) {
    const v = points[i];
    const pct = Math.min(100, (v / last) * 100);
    const hpx = Math.max(3, Math.round((pct / 100) * 56));
    const cls = perfBarClass(pct);
    html += `<span class="perf-chart-bar ${cls}" style="height:${hpx}px" title="${unit ? unit + ': ' : ''}${unit === 'MB/GB' ? formatBytes(v) : Math.round(v * 10) / 10}"></span>`;
  }
  el.innerHTML = html;
}

function renderPerfPanel() {
  if (_perfInterval) clearInterval(_perfInterval);

  const setBar = (id, pct, clsId) => {
    const el = $(id);
    if (!el) return;
    el.style.width = Math.min(100, pct || 0) + '%';
    el.classList.remove('danger', 'warn');
    const c = perfBarClass(pct);
    if (c) el.classList.add(c);
  };
  const setText = (id, txt) => { const el = $(id); if (el) el.textContent = txt; };
  const paint = (s) => {
    if (!s) return;
    const e = s.electron || {}, sys = s.system || {};
    setText('perf-sys-ram', `${formatBytes(sys.usedMem || 0)} / ${formatBytes(sys.totalMem || 0)}`);
    setBar('perf-sys-ram-bar', sys.memPercent);
    setText('perf-elec-heap', `${formatBytes(e.heapUsed || 0)} / ${formatBytes(e.heapTotal || 0)}`);
    setBar('perf-elec-heap-bar', e.heapTotal ? ((e.heapUsed || 0) / e.heapTotal) * 100 : 0);
    setText('perf-cpu-load', `${e.appCpuPct || 0}%`);
    setBar('perf-cpu-bar', e.appCpuPct);
    setText('perf-cpu-cores', (sys.cpuCores || '—') + ' core' + ((sys.cpuCores || 0) === 1 ? '' : 's'));
    setText('perf-rss', formatBytes(e.rss || 0));
    setText('perf-heap-used', formatBytes(e.heapUsed || 0));
    setText('perf-heap-total', formatBytes(e.heapTotal || 0));
    setText('perf-external', formatBytes(e.external || 0));
    setText('perf-procs', (e.appProcesses || '—') + ' procs');
    setText('perf-total-mem', formatBytes(sys.totalMem || 0));
    setText('perf-free-mem', formatBytes(sys.freeMem || 0));
    setText('perf-cpu-model', sys.cpuModel || '—');
    setText('perf-uptime', formatUptime(sys.uptime || 0));
    setText('perf-platform', (sys.platform || '') + ' ' + (sys.arch || ''));
    setText('perf-load1', sys.loadAvg1 ?? '—');
    setText('perf-load5', sys.loadAvg5 ?? '—');
    setText('perf-load15', sys.loadAvg15 ?? '—');

    // Charts
    setText('perf-cpu-now', (e.appCpuPct || 0) + '%');
    setText('perf-mem-now', formatBytes(e.rss || 0));
    if (_perfPoints.length > 60) _perfPoints.shift();
    _perfPoints.push({
      cpu: e.appCpuPct || 0,
      mem: e.rss || 0,
      memPct: sys.memPercent || 0,
    });
    perfChartBars('perf-cpu-chart', _perfPoints.map(p => p.cpu), 100, 'CPU');
    const memTotal = e.heapTotal || 0;
    perfChartBars('perf-mem-chart', _perfPoints.map(p => p.mem), memTotal > 0 ? memTotal : 1024 * 1024 * 1024, 'MB/GB');

    // Health
    const health = perfHealth(e.appCpuPct || 0, parseFloat(sys.memPercent) || 0);
    const dot = $('perf-health-dot');
    const t = $('perf-health-text');
    if (dot) { dot.className = 'perf-health-dot ' + health.cls; }
    if (t) t.textContent = health.text;
  };
  const update = async () => {
    try {
      const s = await window.electronAPI.perfGetStats();
      paint(s);
    } catch (err) {
      console.error('[perf] failed:', err);
    }
  };
  paint({ electron: {}, system: {} });
  _perfPoints = [];
  update();
  _perfInterval = setInterval(update, 2000);
}

// ===== USER SCRIPTS PANEL =====
async function renderScriptsPanel() {
  const list = $('scripts-list');
  if (!list) return;
  const scripts = await window.electronAPI.userScriptsGet();
  if (!scripts || !scripts.length) {
    list.innerHTML = `<div class="panel-empty"><div class="panel-empty-icon">📜</div><span>Brak skryptów użytkownika.<br>Kliknij „+ Nowy”, aby utworzyć.</span></div>`;
    return;
  }
  list.innerHTML = scripts.map((s, i) => `
    <div class="panel-item script-item" data-index="${i}">
      <div class="panel-item-icon" style="font-size:12px;">${s.type === 'css' ? '🎨' : '📜'}</div>
      <div class="panel-item-info">
        <div class="panel-item-title">${esc(s.name || 'Bez nazwy')}</div>
        <div class="panel-item-sub">${esc(s.pattern || '*')} • ${s.type || 'js'}${s.enabled !== false ? '' : ' • Wyłączony'}</div>
      </div>
      <div class="panel-item-actions">
        <button class="panel-item-btn" data-action="edit" title="Edytuj">✏️</button>
        <button class="panel-item-btn danger" data-action="delete" title="Usuń">✕</button>
      </div>
    </div>
  `).join('');

  list.querySelectorAll('.script-item').forEach(el => {
    el.querySelector('[data-action="edit"]')?.addEventListener('click', (e) => {
      e.stopPropagation();
      const idx = parseInt(el.dataset.index);
      editScript(idx, scripts[idx]);
    });
    el.querySelector('[data-action="delete"]')?.addEventListener('click', async (e) => {
      e.stopPropagation();
      const idx = parseInt(el.dataset.index);
      scripts.splice(idx, 1);
      await window.electronAPI.userScriptsSave(scripts);
      renderScriptsPanel();
    });
  });
}

function editScript(idx, script) {
  $('scripts-editor')?.classList.remove('hidden');
  $('script-name').value = script?.name || '';
  $('script-type').value = script?.type || 'js';
  $('script-pattern').value = script?.pattern || '*';
  $('script-code').value = script?.code || '';
  $('scripts-save-btn')?.addEventListener('click', async () => {
    const scripts = await window.electronAPI.userScriptsGet();
    scripts[idx] = {
      name: $('script-name').value,
      type: $('script-type').value,
      pattern: $('script-pattern').value,
      code: $('script-code').value,
      enabled: true,
    };
    await window.electronAPI.userScriptsSave(scripts);
    $('scripts-editor')?.classList.add('hidden');
    renderScriptsPanel();
    showToast('Zapisano skrypt');
  }, { once: true });
}
  const tabPreviewEl = document.getElementById('tab-preview');
  const tabPreviewImg = document.getElementById('tab-preview-img');
  const tabPreviewTitle = document.getElementById('tab-preview-title');
  const tabPreviewUrl = document.getElementById('tab-preview-url');
  let activePreviewTab = null;

  function showTabPreview(id, tabEl) {
    const tab = tabs.find(t => t.id === id);
    if (!tab || !tab.webview || id === activeTabId) return;
    activePreviewTab = id;

    // Position below the tab
    const rect = tabEl.getBoundingClientRect();
    const previewWidth = 260;
    let left = rect.left + (rect.width / 2) - (previewWidth / 2);
    left = Math.max(8, Math.min(left, window.innerWidth - previewWidth - 8));
    tabPreviewEl.style.left = left + 'px';

    // Set info
    tabPreviewTitle.textContent = tab.title || 'Bez tytułu';
    tabPreviewUrl.textContent = tab.url || 'about:blank';

    // Show loading dots, hide image
    tabPreviewImg.style.opacity = '0';
    tabPreviewEl.querySelector('.tp-loading').style.display = 'flex';
    tabPreviewEl.classList.remove('hidden');

    // Capture webview thumbnail via IPC
    const wvId = tab.webview.getWebContentsId?.();
    if (!wvId) { hideTabPreview(); return; }

    window.electronAPI.capturePage(wvId).then(dataUrl => {
      if (activePreviewTab !== id || !dataUrl) return;
      tabPreviewImg.src = dataUrl;
      tabPreviewImg.style.opacity = '1';
      tabPreviewEl.querySelector('.tp-loading').style.display = 'none';
    }).catch(() => {
      hideTabPreview();
    });
  }

  function hideTabPreview() {
    activePreviewTab = null;
    tabPreviewEl.classList.add('hidden');
  }

  window.renderClipboardPanel = renderClipboardPanel;
  window.renderPerfPanel = renderPerfPanel;
  window.renderScriptsPanel = renderScriptsPanel;
  window.formatTimeAgo = formatTimeAgo;
  window.hideTabPreview = hideTabPreview;
})();
