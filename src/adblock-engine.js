'use strict';

/**
 * WAVEWEB Adblock Engine
 * Parses and matches EasyList/uBlock-style filter syntax:
 *   @@ ||domain^ $options   |start|   /regex/   example.com##selector
 */

const NET_TYPES = new Set([
  'script', 'image', 'stylesheet', 'object', 'xmlhttprequest', 'subdocument',
  'document', 'popup', 'media', 'font', 'websocket', 'ping', 'other', 'csp',
]);

const SEPARATOR_SRC = '(?:[^\\w\\-.%]|$)';
const CHUNK_SIZE = 250;
const MIN_KEYWORD_LEN = 4;

/** Compact Aho-Corasick for fast generic-rule prefiltering */
class KeywordIndex {
  constructor() {
    this.root = { next: new Map(), out: null, fail: null };
  }
  add(keyword, id) {
    const kw = keyword.toLowerCase();
    let node = this.root;
    for (const ch of kw) {
      let next = node.next.get(ch);
      if (!next) { next = { next: new Map(), out: null, fail: null }; node.next.set(ch, next); }
      node = next;
    }
    if (!node.out) node.out = [];
    node.out.push(id);
  }
  finalize() {
    const root = this.root;
    const q = [];
    for (const child of root.next.values()) { child.fail = root; q.push(child); }
    while (q.length) {
      const n = q.shift();
      for (const [ch, child] of n.next) {
        let f = n.fail;
        while (f && !f.next.has(ch)) f = f.fail;
        child.fail = f ? f.next.get(ch) || root : root;
        if (child.fail === child) child.fail = root;
        if (child.fail && child.fail.out) {
          child.out = child.out ? [...child.out, ...child.fail.out] : [...child.fail.out];
        }
        q.push(child);
      }
    }
  }
  /** Returns Set of rule ids whose keyword appears in text */
  search(text) {
    const out = new Set();
    let node = this.root;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      while (node && !node.next.has(ch)) node = node.fail;
      node = node ? node.next.get(ch) : this.root;
      if (!node) node = this.root;
      else if (node.out) for (const id of node.out) out.add(id);
    }
    return out;
  }
}

/** Extract the longest literal run usable as an AC keyword */
function extractKeyword(pattern) {
  let best = '';
  let cur = '';
  for (const ch of pattern.toLowerCase()) {
    if (ch === '*' || ch === '^' || ch === '|') {
      if (cur.length > best.length) best = cur;
      cur = '';
    } else cur += ch;
  }
  if (cur.length > best.length) best = cur;
  return best.length >= MIN_KEYWORD_LEN ? best : null;
}

/**
 * Longest guaranteed-literal fragment of a /regex/ body.
 * Only [a-z0-9_%-] chars count as literals; any other char splits the run.
 */
function extractRegexLiteral(regexBody) {
  let best = '';
  for (const run of regexBody.toLowerCase().split(/[^a-z0-9_%-]/)) {
    if (run.length > best.length) best = run;
  }
  return best.length >= MIN_KEYWORD_LEN ? best : null;
}

function escapeRe(s) {
  return s.replace(/[.+?${}()|[\]\\]/g, '\\$&');
}

function patternToSource(p) {
  let out = '';
  for (let i = 0; i < p.length; i++) {
    const c = p[i];
    if (c === '*') out += '.*';
    else if (c === '^') out += SEPARATOR_SRC;
    else out += escapeRe(c);
  }
  return out;
}

function getHost(url) {
  try {
    let u = url;
    const m = u.match(/^[\w-]+:\/\/([^/?#]+)/);
    if (m) return m[1].split('@').pop().split(':')[0].toLowerCase();
    return '';
  } catch (_) { return ''; }
}

function suffixesOf(host) {
  const parts = host.split('.');
  const out = [];
  for (let i = 0; i < parts.length - 1; i++) out.push(parts.slice(i).join('.'));
  return out;
}

function hostMatchesSuffix(host, suffix) {
  return host === suffix || host.endsWith('.' + suffix);
}

function parseNetworkFilter(rawLine) {
  let line = rawLine.trim();
  if (!line || line.startsWith('!') || line.startsWith('[Adblock')) return null;

  let exception = false;
  let s = line;
  if (s.startsWith('@@')) { exception = true; s = s.slice(2); }

  // Extract $options (only if the candidate looks like an options list,
  // so "$" inside /regexes/ or URLs is left alone)
  let optsStr = '';
  const dollar = s.lastIndexOf('$');
  if (dollar > 0) {
    const cand = s.slice(dollar + 1);
    if (/^[\w~,=.|-]+$/.test(cand)) {
      optsStr = cand.toLowerCase();
      s = s.slice(0, dollar);
    }
  }

  let types = null, negTypes = null, party = null, domains = null, negDomains = null;
  if (optsStr) {
    for (const opt of optsStr.split(',')) {
      const o = opt.trim();
      if (!o) continue;
      let neg = false, val = o;
      if (o.startsWith('~')) { neg = true; val = o.slice(1); }
      if (val.startsWith('domain=')) {
        for (const d of val.slice(7).split('|')) {
          if (!d) continue;
          const dn = d.startsWith('~');
          const dd = (dn ? d.slice(1) : d).trim().toLowerCase();
          if (!dd) continue;
          if (dn) { (negDomains = negDomains || new Set()).add(dd); }
          else { (domains = domains || new Set()).add(dd); }
        }
      } else if (val === 'third-party') {
        party = neg ? 'first' : 'third';
      } else if (val === 'first-party') {
        party = neg ? 'third' : 'first';
      } else if (NET_TYPES.has(val)) {
        if (neg) { (negTypes = negTypes || new Set()).add(val); }
        else { (types = types || new Set()).add(val); }
      } else if (['match-case', '~match-case', 'collapse', '~collapse', '~other', 'popup'].includes(val)) {
        // handled above / ignored
      } else {
        return null; // unknown option — safer to drop the rule
      }
    }
    if (types && negTypes) return null;
  }

  // Classify pattern
  let kind, src, key = null;
  if (s.length >= 3 && s.startsWith('/') && s.endsWith('/')) {
    kind = 'regex';
    src = s.slice(1, -1);
    try { new RegExp(src, 'i'); } catch (_) { return null; }
  } else if (s.startsWith('||')) {
    const rest = s.slice(2);
    const hostMatch = rest.match(/^[^^/|*$]+/);
    const hostPart = hostMatch ? hostMatch[0] : '';
    if (!hostPart || hostPart.includes('*')) {
      kind = 'generic';
      src = patternToSource(rest);
    } else {
      // Bucket lookup guarantees hostname-suffix match; this regex confirms
      // scheme + any subdomains + host + port + path.
      kind = 'anchored';
      key = hostPart.toLowerCase();
      const pathPart = rest.slice(hostPart.length);
      src = '^[a-z][a-z0-9+.\\-]*:\\/\\/(?:[^/?#]+\\.)?' +
        patternToSource(hostPart) + '(?::\\d+)?' +
        (pathPart ? patternToSource(pathPart) : '');
    }
  } else {
    kind = 'generic';
    let t = s;
    let pre = '', post = '';
    if (t.startsWith('|')) { pre = '^'; t = t.slice(1); }
    if (t.endsWith('|') && !t.endsWith('\\|')) { post = '$'; t = t.slice(0, -1); }
    src = pre + patternToSource(t) + post;
  }

  const keyword = kind === 'generic' ? extractKeyword(s)
    : kind === 'regex' ? extractRegexLiteral(s.slice(1, -1))
    : null;

  let re;
  try { re = new RegExp(src, 'i'); } catch (_) { return null; }

  return {
    exception, kind, key, re, src, keyword,
    types, negTypes, party, domains, negDomains,
    raw: line,
  };
}

// Cosmetic: "domain1,domain2##selector" / "#@#" exceptions / generic "##sel"
function parseCosmeticFilter(rawLine) {
  const line = rawLine.trim();
  if (!line || line.startsWith('!') || line.startsWith('[Adblock')) return null;

  // Skip procedural/snippet syntax #$# and #@$#
  if (line.includes('#$#') || line.includes('#@#$#')) return null;

  let exception = false;
  let idx = line.indexOf('#@#');
  if (idx >= 0) { exception = true; }
  else {
    idx = line.indexOf('##');
    if (idx < 0) return null;
    // #?# extended-CSS — accept selector as-is
    const qIdx = line.indexOf('#?#');
    if (qIdx >= 0) idx = qIdx;
  }

  const sepLen = line.startsWith('#@#', idx) ? 3 : (line[idx + 2] === '?' ? 3 : 2);
  const domainPart = line.slice(0, idx).trim();
  const selector = line.slice(idx + sepLen).trim();

  if (!selector || selector.length > 500) return null;
  if (/[\u0000-\u001f{};]/.test(selector) && selector.includes('{')) return null;

  const posDomains = [];
  const negDomains = [];
  if (domainPart) {
    for (const d of domainPart.split(',')) {
      const t = d.trim().toLowerCase();
      if (!t) continue;
      if (t.startsWith('~')) negDomains.push(t.slice(1));
      else posDomains.push(t);
    }
  }

  return { exception, posDomains, negDomains, selector };
}


class AdblockEngine {
  constructor() {
    this.clear();
  }

  clear() {
    this.blockAnchored = new Map();
    this.allowAnchored = new Map();
    this.blockKeywordIdx = new KeywordIndex();
    this.allowKeywordIdx = new KeywordIndex();
    this.blockGenericById = new Map();
    this.allowGenericById = new Map();
    this._gid = 0;
    this.blockGenericLeftover = [];
    this.allowGenericLeftover = [];
    this._blockChunks = [];
    this._allowChunks = [];
    this.blockRegexRules = [];
    this.allowRegexRules = [];
    this.cosmeticByDomain = new Map();
    this.cosmeticGeneric = new Set();
    this.cosmeticExceptDomains = new Map();
    this.cosmeticExceptGeneric = new Set();
    this.ruleCount = 0;
    this.networkCount = 0;
    this.cosmeticCount = 0;
    this.exceptionCount = 0;
    this._cosmeticCache = new Map();
  }

  /** Load a whole filter-list text. Returns number of rules loaded. */
  loadFromText(text) {
    let count = 0;
    for (const rawLine of text.split('\n')) {
      if (this.addLine(rawLine)) count++;
    }
    return count;
  }

  addLine(rawLine) {
    const line = rawLine.trim();
    if (!line) return false;

    if (line.includes('##') || line.includes('#@#') || line.includes('#?#')) {
      const c = parseCosmeticFilter(line);
      if (!c) return false;
      this._addCosmetic(c);
      this.ruleCount++;
      this.cosmeticCount++;
      return true;
    }

    const f = parseNetworkFilter(line);
    if (!f) return false;
    this._addNetwork(f);
    this.ruleCount++;
    if (f.exception) this.exceptionCount++; else this.networkCount++;
    return true;
  }

  _addNetwork(f) {
    const map = f.exception ? this.allowAnchored : this.blockAnchored;
    const kwIdx = f.exception ? this.allowKeywordIdx : this.blockKeywordIdx;
    const byId = f.exception ? this.allowGenericById : this.blockGenericById;
    const leftover = f.exception ? this.allowGenericLeftover : this.blockGenericLeftover;
    const regexList = f.exception ? this.allowRegexRules : this.blockRegexRules;

    if (f.kind === 'anchored' && f.key) {
      let arr = map.get(f.key);
      if (!arr) { arr = []; map.set(f.key, arr); }
      arr.push(f);
    } else if (f.keyword) {
      const id = ++this._gid;
      byId.set(id, f);
      kwIdx.add(f.keyword, id);
    } else if (f.kind === 'regex') {
      regexList.push(f);
    } else {
      leftover.push(f);
    }
  }

  _addCosmetic(c) {
    if (c.exception) {
      if (c.posDomains.length) {
        for (const d of c.posDomains) {
          let set = this.cosmeticExceptDomains.get(d);
          if (!set) { set = new Set(); this.cosmeticExceptDomains.set(d, set); }
          set.add(c.selector);
        }
      } else {
        this.cosmeticExceptGeneric.add(c.selector);
      }
    } else {
      if (c.posDomains.length) {
        for (const d of c.posDomains) {
          let arr = this.cosmeticByDomain.get(d);
          if (!arr) { arr = []; this.cosmeticByDomain.set(d, arr); }
          arr.push({ sel: c.selector, neg: c.negDomains });
        }
      } else if (!c.negDomains.length) {
        this.cosmeticGeneric.add(c.selector);
      }
    }
  }

  _finalizeGeneric(rules) {
    const chunks = [];
    for (let i = 0; i < rules.length; i += CHUNK_SIZE) {
      const slice = rules.slice(i, i + CHUNK_SIZE);
      try {
        chunks.push(new RegExp(slice.map(r => `(?:${r.src})`).join('|'), 'i'));
      } catch (_) {
        // Fallback: test individually
        for (const r of slice) chunks.push(r.re);
      }
    }
    return chunks;
  }

  finalize() {
    this.blockKeywordIdx.finalize();
    this.allowKeywordIdx.finalize();
    this._blockChunks = this._finalizeGeneric(this.blockGenericLeftover);
    this._allowChunks = this._finalizeGeneric(this.allowGenericLeftover);
    this._cosmeticCache.clear();
  }

  _testRules(rules, u, type, isFirstParty, pageHost) {
    for (const r of rules) {
      if (!this._applies(r, type, isFirstParty, pageHost)) continue;
      if (r.re.test(u)) return r;
    }
    return null;
  }

  _matchList(isAllow, u, host, type, isFirstParty, pageHost) {
    const map = isAllow ? this.allowAnchored : this.blockAnchored;
    for (const suf of suffixesOf(host)) {
      const arr = map.get(suf);
      if (arr) {
        const r = this._testRules(arr, u, type, isFirstParty, pageHost);
        if (r) return r;
      }
    }

    // Keyword-indexed generic rules (Aho-Corasick prefilter)
    const kwIdx = isAllow ? this.allowKeywordIdx : this.blockKeywordIdx;
    if (kwIdx) {
      const byId = isAllow ? this.allowGenericById : this.blockGenericById;
      for (const id of kwIdx.search(u)) {
        const r = byId.get(id);
        if (!r || !this._applies(r, type, isFirstParty, pageHost)) continue;
        if (r.re.test(u)) return r;
      }
    }

    // Fallback chunks for keyword-less generic rules
    const chunks = isAllow ? this._allowChunks : this._blockChunks;
    for (const ch of chunks) {
      if (ch.test(u)) {
        const leftover = isAllow ? this.allowGenericLeftover : this.blockGenericLeftover;
        const hit = this._testRules(leftover, u, type, isFirstParty, pageHost);
        return hit || null;
      }
    }
    const regexList = isAllow ? this.allowRegexRules : this.blockRegexRules;
    return this._testRules(regexList, u, type, isFirstParty, pageHost) || null;
  }

  /**
   * Match a request URL.
   * @param {string} url request URL
   * @param {string} type normalized resource type: script|image|stylesheet|subdocument|
   *                     xmlhttprequest|media|font|websocket|ping|object|other|document|popup
   * @param {string} pageHost hostname of the top-level page (empty = unknown)
   * @returns {object|null} matched blocking rule info or null when allowed
   */
  match(url, type = 'other', pageHost = '') {
    const u = url.toLowerCase();
    const host = getHost(u);

    let firstParty = true;
    if (pageHost) {
      firstParty = host === pageHost || host.endsWith('.' + pageHost) || pageHost.endsWith('.' + host);
    }

    if (this._matchList(true, u, host, type, firstParty, pageHost)) return null;
    const hit = this._matchList(false, u, host, type, firstParty, pageHost);
    return hit ? { filter: hit.raw || '(generic)', type } : null;
  }

  _applies(r, type, isFirstParty, pageHost) {
    if (type === 'document' || type === 'popup') {
      if (!r.types || !r.types.has(type)) return false;
    } else {
      if (r.types && !r.types.has(type)) return false;
      if (r.negTypes && r.negTypes.has(type)) return false;
    }
    if (r.party === 'third' && isFirstParty) return false;
    if (r.party === 'first' && !isFirstParty) return false;
    if (r.domains && !(pageHost && [...r.domains].some(d => hostMatchesSuffix(pageHost, d)))) return false;
    if (r.negDomains && pageHost && [...r.negDomains].some(d => hostMatchesSuffix(pageHost, d))) return false;
    return true;
  }

  hasCosmetic() {
    return this.cosmeticByDomain.size > 0 || this.cosmeticGeneric.size > 0;
  }

  /** CSS hiding rules for a given page hostname */
  getCosmeticCSS(hostname) {
    if (!hostname) return '';
    const cached = this._cosmeticCache.get(hostname);
    if (cached !== undefined) return cached;

    const host = hostname.toLowerCase();
    const sfx = suffixesOf(host);
    const selectors = [];
    const seen = new Set();

    const push = (sel) => {
      if (seen.has(sel)) return;
      seen.add(sel);
      selectors.push(sel);
    };

    // Exceptions first
    const exceptions = new Set(this.cosmeticExceptGeneric);
    for (const suf of sfx) {
      const ex = this.cosmeticExceptDomains.get(suf);
      if (ex) for (const s of ex) exceptions.add(s);
    }

    // Domain-specific rules
    for (const suf of sfx) {
      const arr = this.cosmeticByDomain.get(suf);
      if (!arr) continue;
      for (const r of arr) {
        if (exceptions.has(r.sel)) continue;
        if (r.neg && r.neg.some(d => hostMatchesSuffix(host, d))) continue;
        push(r.sel);
      }
    }

    // Generic rules
    for (const sel of this.cosmeticGeneric) {
      if (!exceptions.has(sel)) push(sel);
    }

    let css = '';
    if (selectors.length) {
      const body = selectors.map(sel => `${sel}{display:none!important}`).join('');
      css = selectors.length > 4000
        ? body.slice(0, 1_400_000)
        : body;
    }

    if (this._cosmeticCache.size > 300) this._cosmeticCache.clear();
    this._cosmeticCache.set(hostname, css);
    return css;
  }
}

module.exports = AdblockEngine;
module.exports.NET_TYPE_MAP = {
  mainFrame: 'document',
  subFrame: 'subdocument',
  stylesheet: 'stylesheet',
  script: 'script',
  image: 'image',
  font: 'font',
  object: 'object',
  xhr: 'xmlhttprequest',
  ping: 'ping',
  cspReport: 'csp',
  media: 'media',
  webSocket: 'websocket',
  other: 'other',
};
