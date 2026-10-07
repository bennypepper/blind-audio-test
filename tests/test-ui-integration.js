/**
 * Automated Test Suite for UI Integration & End-to-End ABX Workflow
 * 
 * Verifies:
 * 1. HTML structure and asset inclusions (scientific-stats.js, scientific-audio.js).
 * 2. Complete element presence across all 6 views and 3 modal dialogs.
 * 3. Syntax validity of index.html inline script and CSS stylesheets.
 * 4. DOM state machine transitions: Mode Portal -> Standard Mode -> Scientific Setup -> Trial -> Rest -> Results.
 * 5. Pre-registration statistical summary dynamic updates.
 * 6. Audition engagement gate enforcement (2.0s per source threshold).
 * 7. Double-blind commitment, target revelation, and audit log generation.
 * 8. Regression-free execution of test-stats.js and test-audio.js.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execSync } = require('child_process');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

async function testAsync(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

console.log('Running Scientific ABX Full UI Integration & E2E Test Suite...\n');

const ROOT_DIR = path.resolve(__dirname, '..');
const INDEX_HTML_PATH = path.join(ROOT_DIR, 'index.html');
const TRACKS_CATALOG_PATH = path.join(ROOT_DIR, 'tracks-catalog.js');
const STATS_JS_PATH = path.join(ROOT_DIR, 'scientific-stats.js');
const AUDIO_JS_PATH = path.join(ROOT_DIR, 'scientific-audio.js');

const TracksCatalog = require(TRACKS_CATALOG_PATH);
const ScientificStats = require(STATS_JS_PATH);
const ScientificAudioEngine = require(AUDIO_JS_PATH);

const indexHTML = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

// ----------------------------------------------------------------------------
// 1. Static HTML Inspection & Resource Inclusions
// ----------------------------------------------------------------------------
async function runSuite() {
  console.log('1. Static HTML Structure & Resource Inclusions:');

  test('index.html exists and is readable with complete structure', () => {
  assert(indexHTML.length > 5000, 'index.html should have substantial content');
  assert(indexHTML.includes('<!doctype html>'), 'index.html must have HTML5 doctype');
});

test('index.html includes externalized style.css stylesheet and script tags', () => {
  assert(
    indexHTML.includes('<link rel="stylesheet" href="style.css">'),
    'index.html must link externalized style.css'
  );
  assert(
    indexHTML.includes('<script src="tracks-catalog.js"></script>'),
    'index.html must include <script src="tracks-catalog.js"></script>'
  );
  assert(
    indexHTML.includes('<script src="scientific-stats.js"></script>'),
    'index.html must include <script src="scientific-stats.js"></script>'
  );
  assert(
    indexHTML.includes('<script src="scientific-audio.js"></script>'),
    'index.html must include <script src="scientific-audio.js"></script>'
  );
});

test('index.html includes all 6 core Single Page Application views', () => {
  const views = [
    'id="view-mode-select"',
    'id="view-standard"',
    'id="view-scientific-setup"',
    'id="view-scientific-trial"',
    'id="view-scientific-rest"',
    'id="view-scientific-results"'
  ];
  views.forEach(v => {
    assert(indexHTML.includes(v), `index.html must contain view container with ${v}`);
  });
});

test('index.html top bar contains brand, mode badge, progress bar, reshuffle, and switch mode', () => {
  const navElements = [
    'id="brand-home"',
    'id="mode-badge"',
    'id="progress"',
    'id="segs"',
    'id="progress-text"',
    'id="btn-top-hotkeys"',
    'id="reshuffle"',
    'id="btn-switch-mode"'
  ];
  navElements.forEach(id => {
    assert(indexHTML.includes(id), `Top navigation bar must contain element with ${id}`);
  });
});

test('index.html Mode Select portal contains Standard and Scientific launch buttons', () => {
  assert(indexHTML.includes('id="btn-launch-standard"'), 'Must have #btn-launch-standard');
  assert(indexHTML.includes('id="btn-launch-scientific"'), 'Must have #btn-launch-scientific');
});

test('index.html Scientific Setup contains comparisons, batteries, presets, and stats box', () => {
  const setupElements = [
    'name="sci-codec"',
    'name="sci-tracks"',
    'name="sci-preset"',
    'id="sci-stat-box"',
    'id="stat-n"',
    'id="stat-scrit"',
    'id="stat-alpha"',
    'id="stat-mde"',
    'id="btn-show-hotkeys"',
    'id="btn-begin-scientific"'
  ];
  setupElements.forEach(el => {
    assert(indexHTML.includes(el), `Scientific setup must contain ${el}`);
  });
});

test('index.html Scientific Trial contains strictly modeled abx.digitalfeed.net layout', () => {
  const trialElements = [
    'id="trial-meta-track"',
    'id="trial-meta-trial"',
    'id="trial-meta-total"',
    'id="trial-progress-fill"',
    'id="sci-cover"',
    'id="sci-title"',
    'id="sci-artist"',
    'id="sci-cat"',
    'id="sci-hint"',
    'id="sci-wave"',
    'id="sci-time"',
    'id="btn-sci-play"',
    'id="btn-sci-rewind"',
    'id="btn-sci-seek-back"',
    'id="btn-sci-seek-fwd"',
    'id="btn-sci-stop"',
    'id="btn-source-a"',
    'id="btn-source-x"',
    'id="btn-source-b"',
    'id="gate-bar-a"',
    'id="gate-bar-x"',
    'id="gate-bar-b"',
    'id="gate-a"',
    'id="gate-x"',
    'id="gate-b"',
    'id="gate-message"',
    'id="btn-choose-a"',
    'id="btn-choose-b"',
    'id="btn-commit-next"',
    'id="commit-hint"'
  ];
  trialElements.forEach(el => {
    assert(indexHTML.includes(el), `Scientific trial view must contain ${el}`);
  });

  // Verify unbiased listen buttons (no codec information to prevent expectation bias)
  assert(!indexHTML.includes('source-sub'), 'Must not contain biasing codec subtitle elements on listen buttons');
  assert(!indexHTML.includes('id="source-b-sub"'), 'Must not contain biasing codec subtitle element on Source B button');
});

test('index.html contains zero distracting emojis across all UI elements', () => {
  const broadEmojiRegex = /[\u{1F000}-\u{1FAFF}\u{200D}\u{2300}-\u{23FF}\u{2460}-\u{24FF}\u{25A0}-\u{25FF}\u{2600}-\u{27BF}\u{2900}-\u{297F}\u{2B00}-\u{2BFF}]/u;
  assert(!broadEmojiRegex.test(indexHTML), 'UI elements must be clean without unicode emojis');
});

test('index.html Scientific Rest screen contains 30s countdown and continue button', () => {
  assert(indexHTML.includes('id="rest-completed-track"'), 'Must have #rest-completed-track');
  assert(indexHTML.includes('id="rest-seconds"'), 'Must have #rest-seconds');
  assert(indexHTML.includes('id="btn-rest-continue"'), 'Must have #btn-rest-continue');
});

test('index.html Scientific Results screen contains verdict banner, stats grid, and audit actions', () => {
  const resultElements = [
    'id="sci-verdict-banner"',
    'id="sci-verdict-tag"',
    'id="sci-verdict-title"',
    'id="sci-verdict-exp"',
    'id="res-score"',
    'id="res-p"',
    'id="res-ci"',
    'id="res-bias"',
    'id="sci-track-table"',
    'id="sci-track-tbody"',
    'id="sci-bias-box"',
    'id="btn-download-audit"',
    'id="btn-copy-markdown"',
    'id="btn-retake-scientific"',
    'id="btn-change-setup"'
  ];
  resultElements.forEach(el => {
    assert(indexHTML.includes(el), `Scientific results view must contain ${el}`);
  });
});

test('index.html contains required modal dialogs', () => {
  assert(indexHTML.includes('id="dlg"'), 'Standard reshuffle dialog #dlg must exist');
  assert(indexHTML.includes('id="dlg-switch-mode"'), 'Mode switch confirmation dialog #dlg-switch-mode must exist');
  assert(indexHTML.includes('id="dlg-instructions"'), 'Instructions & Hotkeys dialog #dlg-instructions must exist');
});

// ----------------------------------------------------------------------------
// 2. JavaScript Syntax and Module Compilation
// ----------------------------------------------------------------------------
console.log('\n2. Script Extraction & Syntax Validation:');

test('scientific-stats.js compiles without syntax errors', () => {
  const code = fs.readFileSync(STATS_JS_PATH, 'utf8');
  assert.doesNotThrow(() => {
    new vm.Script(code, { filename: 'scientific-stats.js' });
  });
});

test('scientific-audio.js compiles without syntax errors', () => {
  const code = fs.readFileSync(AUDIO_JS_PATH, 'utf8');
  assert.doesNotThrow(() => {
    new vm.Script(code, { filename: 'scientific-audio.js' });
  });
});

test('tracks-catalog.js compiles without syntax errors', () => {
  const code = fs.readFileSync(TRACKS_CATALOG_PATH, 'utf8');
  assert.doesNotThrow(() => {
    new vm.Script(code, { filename: 'tracks-catalog.js' });
  });
});

test('style.css exists, contains modernized tokens and has no !important on .btn-accent', () => {
  const stylePath = path.join(ROOT_DIR, 'style.css');
  assert(fs.existsSync(stylePath), 'style.css must exist');
  const css = fs.readFileSync(stylePath, 'utf8');
  assert(css.includes('--font-mono'), 'style.css must declare --font-mono for tabular timing');
  assert(css.includes('--audition'), 'style.css must declare --audition for active channel');
  assert(!css.includes('.btn-accent { background: var(--accent) !important'), '.btn-accent must not have !important overriding disabled state');
});

// Extract inline script from index.html
const scriptRegex = /<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
let scriptMatch;
let inlineScriptCode = '';
while ((scriptMatch = scriptRegex.exec(indexHTML)) !== null) {
  const content = scriptMatch[1].trim();
  if (content.length > 0) {
    inlineScriptCode = content;
    break;
  }
}

test('index.html inline script compiles cleanly in Node VM', () => {
  assert(inlineScriptCode.length > 500, 'inline script code should be extracted from index.html');
  assert.doesNotThrow(() => {
    new vm.Script(inlineScriptCode, { filename: 'index-inline.js' });
  });
});

// ----------------------------------------------------------------------------
// 3. DOM & State Machine Simulation
// ----------------------------------------------------------------------------
console.log('\n3. DOM & State Machine Functional Simulation:');

class MockClassList {
  constructor() {
    this.classes = new Set();
  }
  add(...args) { args.forEach(c => this.classes.add(c)); }
  remove(...args) { args.forEach(c => this.classes.delete(c)); }
  delete(c) { return this.classes.delete(c); }
  has(c) { return this.classes.has(c); }
  contains(c) { return this.classes.has(c); }
  toggle(cls, force) {
    if (force === undefined) {
      if (this.classes.has(cls)) {
        this.classes.delete(cls);
        return false;
      } else {
        this.classes.add(cls);
        return true;
      }
    }
    if (force) {
      this.classes.add(cls);
      return true;
    } else {
      this.classes.delete(cls);
      return false;
    }
  }
}

class MockElement {
  constructor(tagName = 'DIV', id = '') {
    this.tagName = tagName.toUpperCase();
    this.id = id;
    this.classList = new MockClassList();
    this.dataset = {};
    this.attributes = new Map();
    this.children = [];
    this.style = {
      display: '',
      setProperty: (k, v) => { this.style[k] = v; },
      getPropertyValue: (k) => this.style[k] || '',
      width: ''
    };
    this._textContent = '';
    this._innerHTML = '';
    this.hidden = false;
    this.disabled = false;
    this.value = '';
    this.checked = false;
    this.name = '';
    this.type = '';
    this.eventListeners = {};
    this.parentElement = null;
  }

  get textContent() { return this._textContent; }
  set textContent(v) { this._textContent = String(v); }

  get innerHTML() { return this._innerHTML; }
  set innerHTML(v) { this._innerHTML = String(v); }

  setAttribute(k, v) { this.attributes.set(k, String(v)); }
  getAttribute(k) { return this.attributes.get(k) || null; }
  hasAttribute(k) { return this.attributes.has(k); }

  addEventListener(event, handler) {
    if (!this.eventListeners[event]) this.eventListeners[event] = [];
    this.eventListeners[event].push(handler);
  }

  dispatchEvent(event) {
    const handlers = this.eventListeners[event.type] || [];
    handlers.forEach(h => h(event));
  }

  click() {
    this.dispatchEvent({ type: 'click', target: this, preventDefault() {} });
  }

  querySelector(selector) {
    if (selector.startsWith('.')) {
      const cls = selector.slice(1);
      return this.children.find(c => c.classList.has(cls)) || null;
    }
    if (selector === 'input[type="radio"]') {
      return this.children.find(c => c.tagName === 'INPUT' && c.type === 'radio') || null;
    }
    return null;
  }

  querySelectorAll(selector) {
    if (selector.startsWith('.')) {
      const cls = selector.slice(1);
      return this.children.filter(c => c.classList.has(cls));
    }
    return [];
  }

  showModal() { this.open = true; }
  close() { this.open = false; }
  focus() {}
  scrollIntoView() {}
}

function createMockEnvironment() {
  const domNodes = new Map();
  const allElements = [];

  const getOrCreate = (id, tag = 'DIV') => {
    if (!domNodes.has(id)) {
      const el = new MockElement(tag, id);
      domNodes.set(id, el);
      allElements.push(el);
    }
    return domNodes.get(id);
  };

  const requiredIds = [
    'view-mode-select', 'view-standard', 'view-scientific-setup',
    'view-scientific-trial', 'view-scientific-rest', 'view-scientific-results',
    'mode-badge', 'progress', 'segs', 'progress-text', 'reshuffle', 'btn-switch-mode',
    'btn-launch-standard', 'btn-launch-scientific',
    'sci-stat-box', 'stat-n', 'stat-scrit', 'stat-alpha', 'stat-mde', 'stat-note',
    'preset-busy-n', 'preset-curious-n', 'preset-serious-n',
    'btn-show-hotkeys', 'btn-begin-scientific',
    'trial-meta-track', 'trial-meta-trial', 'trial-meta-total', 'trial-progress-fill',
    'sci-cover', 'sci-title', 'sci-artist', 'sci-cat', 'sci-hint',
    'sci-wave-bg', 'sci-wave-fill', 'sci-wave', 'sci-time',
    'btn-sci-rewind', 'btn-sci-seek-back', 'btn-sci-seek-fwd', 'btn-sci-stop',
    'btn-source-a', 'btn-source-x', 'btn-source-b',
    'gate-a', 'gate-x', 'gate-b', 'gate-message',
    'btn-choose-a', 'btn-choose-b', 'btn-commit-next', 'commit-hint',
    'rest-completed-track', 'rest-seconds', 'btn-rest-continue',
    'sci-verdict-banner', 'sci-verdict-tag', 'sci-verdict-title', 'sci-verdict-exp',
    'res-score', 'res-score-pct', 'res-p', 'res-ci', 'res-bias', 'res-bias-sub',
    'sci-track-tbody', 'sci-bias-text',
    'btn-download-audit', 'btn-copy-markdown', 'btn-retake-scientific', 'btn-change-setup',
    'brand-home', 'dlg', 'dlg-switch-mode', 'dlg-instructions', 'dlg-switch-cancel', 'dlg-switch-ok',
    'dlg-cancel', 'dlg-ok', 'dlg-text', 'dlg-inst-close', 'tips', 'tips-ok', 'live', 'qlist', 'results'
  ];

  requiredIds.forEach(id => getOrCreate(id));

  // Gate child elements (gate-time and gate-status)
  ['a', 'x', 'b'].forEach(k => {
    const gate = getOrCreate(`gate-${k}`);
    const timeEl = new MockElement('SPAN');
    timeEl.classList.add('gate-time');
    const statusEl = new MockElement('SPAN');
    statusEl.classList.add('gate-status');
    gate.children.push(timeEl, statusEl);
  });

  // Setup cards and radio inputs
  const codecCards = [
    { codec: 'aac256', checked: true },
    { codec: 'opus128', checked: false },
    { codec: 'mp3128', checked: false }
  ].map(item => {
    const card = new MockElement('LABEL');
    card.classList.add('option-card');
    card.dataset.codec = item.codec;
    const input = new MockElement('INPUT');
    input.type = 'radio';
    input.name = 'sci-codec';
    input.value = item.codec;
    input.checked = item.checked;
    card.children.push(input);
    allElements.push(card, input);
    return card;
  });

  const trackCards = [
    { tracks: '5', checked: true },
    { tracks: '8', checked: false }
  ].map(item => {
    const card = new MockElement('LABEL');
    card.classList.add('option-card');
    card.dataset.tracks = item.tracks;
    const input = new MockElement('INPUT');
    input.type = 'radio';
    input.name = 'sci-tracks';
    input.value = item.tracks;
    input.checked = item.checked;
    card.children.push(input);
    allElements.push(card, input);
    return card;
  });

  const presetCards = [
    { preset: '5', checked: false },
    { preset: '10', checked: true },
    { preset: '20', checked: false }
  ].map(item => {
    const card = new MockElement('LABEL');
    card.classList.add('preset-card');
    card.dataset.preset = item.preset;
    const input = new MockElement('INPUT');
    input.type = 'radio';
    input.name = 'sci-preset';
    input.value = item.preset;
    input.checked = item.checked;
    card.children.push(input);
    allElements.push(card, input);
    return card;
  });

  const mockDocument = {
    body: new MockElement('BODY'),
    getElementById(id) { return domNodes.get(id) || null; },
    querySelector(selector) {
      if (selector.startsWith('#')) return domNodes.get(selector.slice(1)) || null;
      if (selector === 'input[name="sci-codec"]:checked') {
        const found = allElements.find(e => e.name === 'sci-codec' && e.checked);
        return found || { value: 'aac256' };
      }
      if (selector === 'input[name="sci-tracks"]:checked') {
        const found = allElements.find(e => e.name === 'sci-tracks' && e.checked);
        return found || { value: '5' };
      }
      if (selector === 'input[name="sci-preset"]:checked') {
        const found = allElements.find(e => e.name === 'sci-preset' && e.checked);
        return found || { value: '10' };
      }
      return null;
    },
    querySelectorAll(selector) {
      if (selector.includes('name="sci-codec"')) {
        return allElements.filter(e => e.tagName === 'INPUT' && e.name === 'sci-codec');
      }
      if (selector.includes('name="sci-tracks"')) {
        return allElements.filter(e => e.tagName === 'INPUT' && e.name === 'sci-tracks');
      }
      if (selector.includes('name="sci-preset"')) {
        return allElements.filter(e => e.tagName === 'INPUT' && e.name === 'sci-preset');
      }
      if (selector.includes('.option-card') && selector.includes('.codec-options')) {
        return codecCards;
      }
      if (selector.includes('.option-card') && selector.includes('.track-options')) {
        return trackCards;
      }
      if (selector.includes('.preset-card')) {
        return presetCards;
      }
      if (selector.includes('.option-card')) {
        return [...codecCards, ...trackCards];
      }
      return [];
    },
    createElement(tag) { return new MockElement(tag); },
    activeElement: null
  };

  mockDocument.body.appendChild = function() {};
  mockDocument.body.removeChild = function() {};

  const eventListeners = {};
  class MockAudio {
    constructor() {
      this.src = '';
      this.duration = 30.0;
      this.currentTime = 0.0;
      this.paused = true;
      this.listeners = {};
    }
    addEventListener(evt, fn) {
      if (!this.listeners[evt]) this.listeners[evt] = [];
      this.listeners[evt].push(fn);
    }
    removeEventListener(evt, fn) {
      if (this.listeners[evt]) {
        this.listeners[evt] = this.listeners[evt].filter(h => h !== fn);
      }
    }
    load() {}
    play() {
      this.paused = false;
      return Promise.resolve();
    }
    pause() {
      this.paused = true;
    }
  }

  global.Audio = MockAudio;

  const mockWindow = {
    document: mockDocument,
    Audio: MockAudio,
    addEventListener(event, fn) {
      if (!eventListeners[event]) eventListeners[event] = [];
      eventListeners[event].push(fn);
    },
    removeEventListener(event, fn) {
      if (eventListeners[event]) {
        eventListeners[event] = eventListeners[event].filter(h => h !== fn);
      }
    },
    trigger(event, eventObj) {
      if (eventListeners[event]) {
        eventListeners[event].forEach(fn => fn(eventObj));
      }
    },
    scrollTo() {},
    matchMedia() { return { matches: false }; },
    localStorage: {
      getItem() { return null; },
      setItem() {}
    },
    navigator: {
      clipboard: {
        writeText() { return Promise.resolve(); }
      }
    },
    URL: {
      createObjectURL() { return 'blob:mock-url'; },
      revokeObjectURL() {}
    },
    Blob: class MockBlob {
      constructor(content, opts) {
        this.content = content;
        this.opts = opts;
      }
    },
    setInterval: (fn) => 101,
    clearInterval: () => {},
    setTimeout: (fn) => setTimeout(fn, 0),
    ScientificStats,
    ScientificAudioEngine,
    TracksCatalog,
    CODECS: TracksCatalog.CODECS,
    KEYS: TracksCatalog.KEYS,
    SONG_CATEGORIES: TracksCatalog.SONG_CATEGORIES
  };

  return { mockWindow, mockDocument, domNodes, allElements, eventListeners };
}

function createSandbox(mockEnv, overrides = {}) {
  const { mockWindow, mockDocument } = mockEnv;
  return {
    window: mockWindow,
    document: mockDocument,
    ScientificStats,
    ScientificAudioEngine,
    TracksCatalog,
    CODECS: TracksCatalog.CODECS,
    KEYS: TracksCatalog.KEYS,
    SONG_CATEGORIES: TracksCatalog.SONG_CATEGORIES,
    Audio: mockWindow.Audio,
    matchMedia: mockWindow.matchMedia,
    localStorage: mockWindow.localStorage,
    setInterval: mockWindow.setInterval,
    clearInterval: mockWindow.clearInterval,
    setTimeout: mockWindow.setTimeout,
    console,
    ...overrides
  };
}

test('SPA state machine initializes landing view at view-mode-select', () => {
  const mockEnv = createMockEnvironment();
  const { domNodes } = mockEnv;
  const sandbox = createSandbox(mockEnv);

  vm.createContext(sandbox);
  vm.runInContext(inlineScriptCode, sandbox);

  const modeSelectView = domNodes.get('view-mode-select');
  assert.strictEqual(modeSelectView.hidden, false, 'view-mode-select should be visible initially');
  const standardView = domNodes.get('view-standard');
  assert.strictEqual(standardView.hidden, true, 'view-standard should be hidden initially');
  const sciSetupView = domNodes.get('view-scientific-setup');
  assert.strictEqual(sciSetupView.hidden, true, 'view-scientific-setup should be hidden initially');
});

test('Switching views updates DOM visibility and top bar state cleanly', () => {
  const mockEnv = createMockEnvironment();
  const { domNodes } = mockEnv;
  const sandbox = createSandbox(mockEnv);

  vm.createContext(sandbox);
  vm.runInContext(inlineScriptCode, sandbox);

  // Transition to Standard Mode
  vm.runInContext(`switchView(VIEWS.STANDARD);`, sandbox);
  assert.strictEqual(domNodes.get('view-standard').hidden, false);
  assert.strictEqual(domNodes.get('view-mode-select').hidden, true);
  const badge = domNodes.get('mode-badge');
  assert.strictEqual(badge.textContent, 'Standard Mode');
  assert.strictEqual(badge.style.display, 'inline-flex');

  // Transition to Scientific Setup
  vm.runInContext(`switchView(VIEWS.SCI_SETUP);`, sandbox);
  assert.strictEqual(domNodes.get('view-scientific-setup').hidden, false);
  assert.strictEqual(domNodes.get('view-standard').hidden, true);
  assert.strictEqual(badge.textContent, 'Scientific ABX');
});

test('Pre-registration statistical box updates dynamically on preset change', () => {
  const mockEnv = createMockEnvironment();
  const { domNodes } = mockEnv;
  const sandbox = createSandbox(mockEnv);

  vm.createContext(sandbox);
  vm.runInContext(inlineScriptCode, sandbox);

  // Default preset (5 tracks x 10 trials = 50 total)
  vm.runInContext(`
    sciSetup.trackCount = 5;
    sciSetup.trialsPerTrack = 10;
    updatePreRegStats();
  `, sandbox);

  assert.strictEqual(domNodes.get('stat-n').textContent, '50');
  assert.strictEqual(domNodes.get('stat-scrit').textContent, '32 correct (64%)');
  assert(domNodes.get('stat-alpha').textContent.includes('0.0325'));

  // Serious preset (8 tracks x 20 trials = 160 total)
  vm.runInContext(`
    const trackRadios = document.querySelectorAll('input[name="sci-tracks"]');
    trackRadios.forEach(r => { r.checked = (r.value === '8'); });
    const presetRadios = document.querySelectorAll('input[name="sci-preset"]');
    presetRadios.forEach(r => { r.checked = (r.value === '20'); });

    updatePreRegStats();
  `, sandbox);

  assert.strictEqual(domNodes.get('stat-n').textContent, '160');
  assert.strictEqual(domNodes.get('stat-scrit').textContent, '92 correct (57.5%)');
  assert(domNodes.get('stat-alpha').textContent.includes('0.0373'));
});

test('Trial workflow: engagement gate locks choices until threshold, unlocks at >= 2.0s', () => {
  const mockEnv = createMockEnvironment();
  const { domNodes } = mockEnv;
  const sandbox = createSandbox(mockEnv);

  vm.createContext(sandbox);
  vm.runInContext(inlineScriptCode, sandbox);

  // Initialize trial state
  vm.runInContext(`
    switchView(VIEWS.SCI_TRIAL);
    sciTestState = {
      codec: 'aac256',
      trackCount: 5,
      trialsPerTrack: 10,
      totalTrials: 50,
      tracks: SONG_CATEGORIES.slice(0, 5).map(c => c.contenders[0]),
      currentTrackIndex: 0,
      currentTrialIndex: 0,
      overallTrialIndex: 0,
      currentChoice: null,
      trials: []
    };
    updateTrialMeta();
  `, sandbox);

  const btnA = domNodes.get('btn-choose-a');
  const btnB = domNodes.get('btn-choose-b');
  const btnCommit = domNodes.get('btn-commit-next');

  assert.strictEqual(btnA.disabled, true, 'Choice A should be disabled before gate');
  assert.strictEqual(btnB.disabled, true, 'Choice B should be disabled before gate');
  assert.strictEqual(btnCommit.disabled, true, 'Commit button should be disabled before choice');

  // Attempting to select choice while locked should be ignored
  vm.runInContext(`setScientificChoice('A');`, sandbox);
  assert.strictEqual(vm.runInContext(`sciTestState.currentChoice`, sandbox), null);

  // Simulate audition satisfying gate (A=2.1s, X=2.0s, B=2.3s)
  vm.runInContext(`
    ScientificAudioEngine.getAuditionStats = () => ({
      durationA: 2.1,
      durationX: 2.0,
      durationB: 2.3,
      gateSatisfied: true
    });
    updateSciPlaybackUI();
  `, sandbox);

  assert.strictEqual(btnA.disabled, false, 'Choice A should unlock when gate satisfied');
  assert.strictEqual(btnB.disabled, false, 'Choice B should unlock when gate satisfied');

  // Now selecting choice succeeds and enables commit
  vm.runInContext(`setScientificChoice('A');`, sandbox);
  assert.strictEqual(vm.runInContext(`sciTestState.currentChoice`, sandbox), 'A');
  assert.strictEqual(btnCommit.disabled, false, 'Commit should be enabled when choice selected');
});

await testAsync('Commit workflow: reveals target, appends trial record, and advances trial index', async () => {
  const mockEnv = createMockEnvironment();
  const { domNodes } = mockEnv;
  const sandbox = createSandbox(mockEnv);

  vm.createContext(sandbox);
  vm.runInContext(inlineScriptCode, sandbox);

  // Setup trial with assigned target
  vm.runInContext(`
    switchView(VIEWS.SCI_TRIAL);
    sciTestState = {
      codec: 'aac256',
      trackCount: 5,
      trialsPerTrack: 10,
      totalTrials: 50,
      tracks: SONG_CATEGORIES.slice(0, 5).map(c => c.contenders[0]),
      currentTrackIndex: 0,
      currentTrialIndex: 0,
      overallTrialIndex: 0,
      currentChoice: 'A',
      trials: []
    };
    ScientificAudioEngine.assignTrialTarget(0, 0);
  `, sandbox);

  // Verify audio engine stop is called on commit
  let audioStopCalled = false;
  const origStop = ScientificAudioEngine.stop;
  ScientificAudioEngine.stop = () => {
    audioStopCalled = true;
    if (origStop) origStop.call(ScientificAudioEngine);
  };

  await vm.runInContext(`commitScientificTrial();`, sandbox);
  ScientificAudioEngine.stop = origStop;

  assert.strictEqual(audioStopCalled, true, 'ScientificAudioEngine.stop() must be called on trial commit');

  const trials = vm.runInContext(`sciTestState.trials`, sandbox);
  assert.strictEqual(trials.length, 1, 'Trial record should be committed');
  assert(trials[0].target === 'A' || trials[0].target === 'B', 'Target must be A or B');
  assert.strictEqual(trials[0].choice, 'A', 'Choice was A');
  assert.strictEqual(typeof trials[0].isCorrect, 'boolean', 'isCorrect must be boolean');
  assert.strictEqual(vm.runInContext(`sciTestState.currentTrialIndex`, sandbox), 1, 'Trial index advanced');
  assert.strictEqual(vm.runInContext(`sciTestState.overallTrialIndex`, sandbox), 1, 'Overall trial index advanced');
});

await testAsync('Track transition workflow: live animation loop and scrubber persist when continuing to Song 2 from Rest', async () => {
  const mockEnv = createMockEnvironment();
  const { domNodes } = mockEnv;
  const sandbox = createSandbox(mockEnv, {
    setInterval: (fn) => 102,
    clearInterval: () => {}
  });

  vm.createContext(sandbox);
  vm.runInContext(inlineScriptCode, sandbox);

  // Setup trial state at the last trial of Track 1 (Trial 5 of 5)
  vm.runInContext(`
    switchView(VIEWS.SCI_TRIAL);
    sciTestState = {
      codec: 'aac256',
      trackCount: 5,
      trialsPerTrack: 5,
      totalTrials: 25,
      tracks: SONG_CATEGORIES.slice(0, 5).map(c => c.contenders[0]),
      currentTrackIndex: 0,
      currentTrialIndex: 4, // 5th trial (0-indexed)
      overallTrialIndex: 4,
      currentChoice: 'A',
      trials: []
    };
    ScientificAudioEngine.assignTrialTarget(0, 4);
  `, sandbox);

  // Commit trial 5 of Track 1 -> transitions to Rest screen
  await vm.runInContext(`commitScientificTrial();`, sandbox);

  assert.strictEqual(domNodes.get('view-scientific-rest').hidden, false, 'Rest view should be visible');
  assert.strictEqual(domNodes.get('view-scientific-trial').hidden, true, 'Trial view should be hidden');
  assert.strictEqual(vm.runInContext(`sciPlayheadInterval`, sandbox), null, 'sciPlayheadInterval paused during rest');

  // User clicks "Continue to Next Track" (Song 2)
  await vm.runInContext(`continueFromRest();`, sandbox);

  assert.strictEqual(domNodes.get('view-scientific-trial').hidden, false, 'Trial view must be restored for Song 2');
  assert.strictEqual(domNodes.get('view-scientific-rest').hidden, true, 'Rest view must be hidden');
  assert.notStrictEqual(vm.runInContext(`sciPlayheadInterval`, sandbox), null, 'sciPlayheadInterval must be running on Song 2');
  assert.strictEqual(vm.runInContext(`sciTestState.currentTrackIndex`, sandbox), 1, 'Current track is Song 2 (index 1)');

  // Verify scrubber can control position on Song 2
  vm.runInContext(`
    const waveEl = document.getElementById('sci-wave');
    waveEl.getBoundingClientRect = () => ({ left: 0, width: 200, top: 0, height: 72 });
    seekSciFrom({ clientX: 100 }); // Seek to 50% = 15s
  `, sandbox);

  const pos = ScientificAudioEngine.getPlayheadPosition();
  assert(pos.currentTime >= 14 && pos.currentTime <= 16, 'Playhead position must be updated to 15s on Song 2');
  assert.strictEqual(domNodes.get('sci-wave').style.getPropertyValue('--p'), '50.00%', 'Scrubber style must reflect 50% on Song 2');
  assert(domNodes.get('sci-time').innerHTML.includes('0:15'), 'Time display must reflect 0:15 on Song 2');
});

test('Full battery completion: renders results banner, Holm table, and response bias', () => {
  const mockEnv = createMockEnvironment();
  const { domNodes } = mockEnv;
  const sandbox = createSandbox(mockEnv);

  vm.createContext(sandbox);
  vm.runInContext(inlineScriptCode, sandbox);

  // Simulate completed 50-trial battery with 32 correct (significant, p = 0.0325)
  vm.runInContext(`
    const testTracks = SONG_CATEGORIES.slice(0, 5).map(c => c.contenders[0]);
    const mockTrials = [];
    for (let i = 0; i < 50; i++) {
      const trackIdx = Math.floor(i / 10);
      const isCorrect = i < 32; // 32 correct
      const choice = (i % 2 === 0) ? 'A' : 'B';
      const target = isCorrect ? choice : (choice === 'A' ? 'B' : 'A');
      mockTrials.push({
        overallIndex: i,
        trackIndex: trackIdx,
        trackId: testTracks[trackIdx].id,
        trackTitle: testTracks[trackIdx].title,
        artist: testTracks[trackIdx].artist,
        cat: testTracks[trackIdx].cat,
        trialIndex: i % 10,
        target: target,
        choice: choice,
        isCorrect: isCorrect,
        durationA: 2.5,
        durationX: 2.2,
        durationB: 2.4,
        timestamp: new Date().toISOString()
      });
    }

    sciTestState = {
      codec: 'aac256',
      trackCount: 5,
      trialsPerTrack: 10,
      totalTrials: 50,
      tracks: testTracks,
      currentTrackIndex: 5,
      currentTrialIndex: 0,
      overallTrialIndex: 50,
      currentChoice: null,
      trials: mockTrials
    };

    showScientificResults();
  `, sandbox);

  assert.strictEqual(domNodes.get('view-scientific-results').hidden, false);
  assert.strictEqual(domNodes.get('res-score').textContent, '32 / 50');
  assert.strictEqual(domNodes.get('res-score-pct').textContent, '64.0% correct');
  assert(domNodes.get('res-p').textContent.includes('0.0325'));
  assert.strictEqual(domNodes.get('sci-verdict-title').textContent, 'Audible Difference Detected');
  assert.strictEqual(domNodes.get('res-bias').textContent, 'Unbiased');

  const tbody = domNodes.get('sci-track-tbody');
  assert(tbody.innerHTML.includes('<tr>'), 'Track breakdown table should contain table rows');

  // Verify descriptive-only badge rendered when T <= 5
  vm.runInContext(`
    // Change trials so each track has 5 trials
    sciTestState.trialsPerTrack = 5;
    sciTestState.trials = sciTestState.trials.filter(t => t.trialIndex < 5);
    showScientificResults();
  `, sandbox);
  assert(tbody.innerHTML.includes('Descriptive Only (T ≤ 5)'), 'Must render descriptive-only badge for T <= 5');
});

test('beforeunload listener guards against accidental navigation during active trial without sciSession ReferenceError', () => {
  const mockEnv = createMockEnvironment();
  const { mockWindow } = mockEnv;
  const sandbox = createSandbox(mockEnv);

  vm.createContext(sandbox);
  vm.runInContext(inlineScriptCode, sandbox);

  // When not in trial, event does not trigger preventDefault
  const evt1 = { defaultPrevented: false, preventDefault() { this.defaultPrevented = true; }, returnValue: undefined };
  mockWindow.trigger('beforeunload', evt1);
  assert.strictEqual(evt1.defaultPrevented, false, 'Should not prevent unload outside trial view');

  // When in trial with trials, it does prevent unload
  vm.runInContext(`
    switchView(VIEWS.SCI_TRIAL);
    sciTestState = {
      trials: [{ trialIndex: 0 }]
    };
  `, sandbox);

  const evt2 = { defaultPrevented: false, preventDefault() { this.defaultPrevented = true; }, returnValue: undefined };
  assert.doesNotThrow(() => {
    mockWindow.trigger('beforeunload', evt2);
  }, 'beforeunload handler must not throw ReferenceError');
  assert.strictEqual(evt2.defaultPrevented, true, 'Should prevent unload when active trial has progress');
  assert.strictEqual(evt2.returnValue, '', 'Should set returnValue');
});

// ----------------------------------------------------------------------------
// 4. Regression Verification of Underlying Engine Suites
// ----------------------------------------------------------------------------
console.log('\n4. Regression Verification of Subordinate Engine Test Suites:');

test('test-stats.js runs and passes with zero regressions', () => {
  const output = execSync('node tests/test-stats.js', { cwd: ROOT_DIR, encoding: 'utf8' });
  assert(output.includes('All tests passed successfully!'), 'test-stats.js must pass completely');
});

test('test-audio.js runs and passes with zero regressions', () => {
  const output = execSync('node tests/test-audio.js', { cwd: ROOT_DIR, encoding: 'utf8' });
  assert(output.includes('0 failed'), 'test-audio.js must pass completely with 0 failed');
});

// ----------------------------------------------------------------------------
// Test Suite Summary
// ----------------------------------------------------------------------------
  console.log('\n=============================================');
  console.log(`UI Integration Suite Finished: ${passed} passed, ${failed} failed.`);
  if (failed > 0) {
    console.error('FAILED: One or more integration tests failed.');
    process.exit(1);
  } else {
    console.log('SUCCESS: All UI integration tests passed cleanly!');
  }
}

runSuite().catch(err => {
  console.error('Test suite crashed with unhandled error:', err);
  process.exit(1);
});
