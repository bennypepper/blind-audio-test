/**
 * Automated Test Suite for ScientificAudioEngine
 * Verifies gapless synchronous playback, 10ms micro-crossfade gain parameters,
 * playhead tracking, engagement gate thresholding, CSPRNG blinding, and trial lifecycle.
 */

const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

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

function approxEqual(actual, expected, tol = 1e-3, msg = '') {
  const diff = Math.abs(actual - expected);
  assert(
    diff <= tol,
    `${msg} Expected ${expected.toFixed(4)}, got ${actual.toFixed(4)} (diff: ${diff.toExponential(3)})`
  );
}

// -------------------------------------------------------------
// Mock Web Audio API for Headless Node Environment
// -------------------------------------------------------------
class MockAudioParam {
  constructor(defaultValue = 1) {
    this.value = defaultValue;
    this.events = [];
  }
  setValueAtTime(value, time) {
    this.events.push({ type: 'setValueAtTime', value, time });
    this.value = value;
  }
  linearRampToValueAtTime(value, time) {
    this.events.push({ type: 'linearRampToValueAtTime', value, time });
    this.value = value;
  }
}

class MockGainNode {
  constructor() {
    this.gain = new MockAudioParam(1);
    this.connectedTo = null;
  }
  connect(dest) {
    this.connectedTo = dest;
  }
  disconnect() {
    this.connectedTo = null;
  }
}

class MockAudioBufferSourceNode {
  constructor() {
    this.buffer = null;
    this.connectedTo = null;
    this.startedAt = null;
    this.stoppedAt = null;
    this.startOffset = null;
    this.onended = null;
    this.isPlaying = false;
  }
  connect(dest) {
    this.connectedTo = dest;
  }
  disconnect() {
    this.connectedTo = null;
  }
  start(when = 0, offset = 0, duration) {
    this.startedAt = when;
    this.startOffset = offset;
    this.isPlaying = true;
  }
  stop(when = 0) {
    this.stoppedAt = when;
    this.isPlaying = false;
  }
}

class MockAudioBuffer {
  constructor({ duration = 30, sampleRate = 44100, numberOfChannels = 2 } = {}) {
    this.duration = duration;
    this.sampleRate = sampleRate;
    this.numberOfChannels = numberOfChannels;
  }
  getChannelData(channel) {
    return new Float32Array(Math.floor(this.duration * this.sampleRate));
  }
}

class MockAudioContext {
  constructor() {
    this.currentTime = 0.0;
    this.state = 'suspended';
    this.destination = {};
    this.createdSources = [];
    this.createdGains = [];
  }
  resume() {
    this.state = 'running';
    return Promise.resolve();
  }
  createGain() {
    const node = new MockGainNode();
    this.createdGains.push(node);
    return node;
  }
  createBufferSource() {
    const node = new MockAudioBufferSourceNode();
    this.createdSources.push(node);
    return node;
  }
  decodeAudioData(arrayBuffer) {
    return Promise.resolve(new MockAudioBuffer({ duration: 30.0 }));
  }
  advanceTime(seconds) {
    this.currentTime = +(this.currentTime + seconds).toFixed(6);
  }
}

async function runSuite() {
  console.log('Running ScientificAudioEngine Test Suite...\n');

  // -------------------------------------------------------------
  // 0. Module Loading & Environment Exports
  // -------------------------------------------------------------
  console.log('0. Module Exports & Browser Compatibility:');

  let ScientificAudioEngine;
  test('Node.js module export loads correctly', () => {
    ScientificAudioEngine = require('../scientific-audio.js');
    assert(ScientificAudioEngine !== null && (typeof ScientificAudioEngine === 'function' || typeof ScientificAudioEngine === 'object'));
    assert.strictEqual(typeof ScientificAudioEngine.init, 'function');
    assert.strictEqual(typeof ScientificAudioEngine.loadTrack, 'function');
    assert.strictEqual(typeof ScientificAudioEngine.playSource, 'function');
    assert.strictEqual(typeof ScientificAudioEngine.stop, 'function');
    assert.strictEqual(typeof ScientificAudioEngine.seek, 'function');
    assert.strictEqual(typeof ScientificAudioEngine.setPlayhead, 'function');
    assert.strictEqual(typeof ScientificAudioEngine.getPlayheadPosition, 'function');
    assert.strictEqual(typeof ScientificAudioEngine.getAuditionStats, 'function');
    assert.strictEqual(typeof ScientificAudioEngine.resetTrialAudition, 'function');
    assert.strictEqual(typeof ScientificAudioEngine.assignTrialTarget, 'function');
    assert.strictEqual(typeof ScientificAudioEngine.revealTarget, 'function');
    assert.strictEqual(typeof ScientificAudioEngine.isLoaded, 'function');
  });

  test('Browser window.ScientificAudioEngine export works in browser context', () => {
    const code = fs.readFileSync(require.resolve('../scientific-audio.js'), 'utf8');
    const windowContext = { window: {}, crypto: globalThis.crypto };
    vm.createContext(windowContext);
    vm.runInContext(code, windowContext);
    assert(windowContext.window.ScientificAudioEngine !== undefined, 'window.ScientificAudioEngine must be defined');
    assert.strictEqual(typeof windowContext.window.ScientificAudioEngine.playSource, 'function');
  });

  // -------------------------------------------------------------
  // 1. Engine State Initialization & Loading
  // -------------------------------------------------------------
  console.log('\n1. State Initialization & Track Loading:');

  let mockCtx;
  let engine;

  function createTestEngine() {
    mockCtx = new MockAudioContext();
    // Support new ScientificAudioEngine() or new ScientificAudioEngine.ScientificAudioEngine()
    const EngineClass = typeof ScientificAudioEngine === 'function' ? ScientificAudioEngine : ScientificAudioEngine.ScientificAudioEngine;
    const instance = new EngineClass({ audioContext: mockCtx });
    instance.init(mockCtx);
    return instance;
  }

  test('Initial state reflects unloaded engine', () => {
    engine = createTestEngine();
    assert.strictEqual(engine.isLoaded(), false);
    const pos = engine.getPlayheadPosition();
    assert.strictEqual(pos.currentTime, 0);
    assert.strictEqual(pos.duration, 0);
    assert.strictEqual(pos.isPlaying, false);
    assert.strictEqual(pos.activeSource, null);
  });

  await testAsync('loadTrack decodes FLAC and Lossy buffers and sets duration', async () => {
    const bufA = new MockAudioBuffer({ duration: 42.5 });
    const bufB = new MockAudioBuffer({ duration: 42.5 });
    const res = await engine.loadTrack(bufA, bufB);
    assert.strictEqual(engine.isLoaded(), true);
    approxEqual(res.duration, 42.5, 0.01, 'Track duration');
    const pos = engine.getPlayheadPosition();
    approxEqual(pos.duration, 42.5, 0.01, 'Playhead duration');
    assert.strictEqual(pos.currentTime, 0);
    assert.strictEqual(pos.isPlaying, false);
  });

  // -------------------------------------------------------------
  // 2. Playhead Synchronization & Continuous Tracking
  // -------------------------------------------------------------
  console.log('\n2. Playhead Synchronization & Gapless Source Switching:');

  test('Playing source A advances playhead accurately with audio clock', () => {
    engine.playSource('A');
    let pos = engine.getPlayheadPosition();
    assert.strictEqual(pos.isPlaying, true);
    assert.strictEqual(pos.activeSource, 'A');
    approxEqual(pos.currentTime, 0.0, 0.001);

    mockCtx.advanceTime(3.75);
    pos = engine.getPlayheadPosition();
    assert.strictEqual(pos.isPlaying, true);
    approxEqual(pos.currentTime, 3.75, 0.001, 'Playhead after 3.75s');
  });

  test('Switching from A to B maintains continuous playhead without reset', () => {
    // Current playhead is 3.75s. Switch to B.
    const sourceCountBefore = mockCtx.createdSources.length;
    engine.playSource('B');
    const sourceCountAfter = mockCtx.createdSources.length;
    assert(sourceCountAfter > sourceCountBefore, 'A new AudioBufferSourceNode must be spawned for B');

    const latestSource = mockCtx.createdSources[sourceCountAfter - 1];
    approxEqual(latestSource.startOffset, 3.75, 0.001, 'Source B must start at exact continuous playhead offset');
    approxEqual(latestSource.startedAt, mockCtx.currentTime, 0.001, 'Source B starts at context.currentTime');

    let pos = engine.getPlayheadPosition();
    assert.strictEqual(pos.activeSource, 'B');
    approxEqual(pos.currentTime, 3.75, 0.001);

    // Advance 2.25s more
    mockCtx.advanceTime(2.25);
    pos = engine.getPlayheadPosition();
    approxEqual(pos.currentTime, 6.0, 0.001, 'Playhead at 6.0s');
  });

  test('Switching to X plays target at continuous playhead', () => {
    engine.assignTrialTarget(); // Assigns X to A or B
    engine.playSource('X');

    const sourceCount = mockCtx.createdSources.length;
    const latestSource = mockCtx.createdSources[sourceCount - 1];
    approxEqual(latestSource.startOffset, 6.0, 0.001, 'Source X must start at 6.0s');

    let pos = engine.getPlayheadPosition();
    assert.strictEqual(pos.activeSource, 'X');
    approxEqual(pos.currentTime, 6.0, 0.001);

    mockCtx.advanceTime(1.5);
    pos = engine.getPlayheadPosition();
    approxEqual(pos.currentTime, 7.5, 0.001);
  });

  // -------------------------------------------------------------
  // 3. 10ms Micro-Crossfade Gain Parameters
  // -------------------------------------------------------------
  console.log('\n3. 10ms Micro-Crossfade Gain Parameters:');

  test('Switching sources executes 10ms linear ramps on outgoing and incoming gains', () => {
    // Current state: playing X at 7.5s, mockCtx.currentTime is known
    const switchTime = mockCtx.currentTime;
    const gainsBefore = mockCtx.createdGains.length;

    // Switch to A
    engine.playSource('A');

    const gainsAfter = mockCtx.createdGains.length;
    assert(gainsAfter > gainsBefore, 'New GainNode created for incoming source');

    const incomingGain = mockCtx.createdGains[gainsAfter - 1];
    // Check incoming gain events: starts at 0 at switchTime, ramps to 1 at switchTime + 0.010
    const inEvents = incomingGain.gain.events;
    const inSet = inEvents.find(e => e.type === 'setValueAtTime' && e.value === 0);
    const inRamp = inEvents.find(e => e.type === 'linearRampToValueAtTime' && e.value === 1);

    assert(inSet, 'Incoming gain must setValueAtTime(0, switchTime)');
    approxEqual(inSet.time, switchTime, 0.001, 'Incoming setValueAtTime timestamp');

    assert(inRamp, 'Incoming gain must linearRampToValueAtTime(1, switchTime + 0.010)');
    approxEqual(inRamp.time, switchTime + 0.010, 0.001, 'Incoming ramp must be exactly 10ms (0.010s)');

    // Outgoing gain: previous gain must have ramped to 0 at switchTime + 0.010
    const outgoingGain = mockCtx.createdGains[gainsAfter - 2];
    const outEvents = outgoingGain.gain.events;
    const outRamp = outEvents.find(e => e.type === 'linearRampToValueAtTime' && e.value === 0);

    assert(outRamp, 'Outgoing gain must linearRampToValueAtTime(0, switchTime + 0.010)');
    approxEqual(outRamp.time, switchTime + 0.010, 0.001, 'Outgoing ramp must be exactly 10ms (0.010s)');
  });

  // -------------------------------------------------------------
  // 4. Seeking & Boundary Clamping
  // -------------------------------------------------------------
  console.log('\n4. Seeking & Duration Clamping:');

  test('Seek +5s and -5s updates playhead position accurately', () => {
    const posBefore = engine.getPlayheadPosition().currentTime;
    const newPosPlus = engine.seek(5);
    approxEqual(newPosPlus, posBefore + 5, 0.001, 'Seek +5s');
    approxEqual(engine.getPlayheadPosition().currentTime, posBefore + 5, 0.001);

    const newPosMinus = engine.seek(-5);
    approxEqual(newPosMinus, posBefore, 0.001, 'Seek -5s');
    approxEqual(engine.getPlayheadPosition().currentTime, posBefore, 0.001);
  });

  test('Seeking clamps to [0, duration] on underflow and overflow', () => {
    const clampedZero = engine.seek(-9999);
    assert.strictEqual(clampedZero, 0, 'Seek below 0 must clamp to 0');
    assert.strictEqual(engine.getPlayheadPosition().currentTime, 0);

    const clampedMax = engine.seek(99999);
    approxEqual(clampedMax, 42.5, 0.001, 'Seek beyond duration must clamp to duration (42.5)');
    approxEqual(engine.getPlayheadPosition().currentTime, 42.5, 0.001);
  });

  test('setPlayhead sets explicit target second offset and clamps', () => {
    engine.setPlayhead(12.34);
    approxEqual(engine.getPlayheadPosition().currentTime, 12.34, 0.001);

    engine.setPlayhead(-15);
    assert.strictEqual(engine.getPlayheadPosition().currentTime, 0);

    engine.setPlayhead(100);
    approxEqual(engine.getPlayheadPosition().currentTime, 42.5, 0.001);
  });

  // -------------------------------------------------------------
  // 5. Audition Timer Tracking & Engagement Gate (>= 2.0s for A, X, B)
  // -------------------------------------------------------------
  console.log('\n5. Audition Timer Tracking & Engagement Gate:');

  test('Gate requires >= 2.0s of audition on ALL THREE sources (A, X, and B)', () => {
    // Reset trial audition
    engine.resetTrialAudition();
    let stats = engine.getAuditionStats();
    assert.strictEqual(stats.durationA, 0);
    assert.strictEqual(stats.durationX, 0);
    assert.strictEqual(stats.durationB, 0);
    assert.strictEqual(stats.gateSatisfied, false);

    // Audition A for 2.1s
    engine.playSource('A');
    mockCtx.advanceTime(2.1);
    stats = engine.getAuditionStats();
    approxEqual(stats.durationA, 2.1, 0.01);
    assert.strictEqual(stats.durationX, 0);
    assert.strictEqual(stats.durationB, 0);
    assert.strictEqual(stats.gateSatisfied, false, 'Only A auditioned, gate must remain locked');

    // Audition X for 2.5s
    engine.playSource('X');
    mockCtx.advanceTime(2.5);
    stats = engine.getAuditionStats();
    approxEqual(stats.durationA, 2.1, 0.01);
    approxEqual(stats.durationX, 2.5, 0.01);
    assert.strictEqual(stats.durationB, 0);
    assert.strictEqual(stats.gateSatisfied, false, 'A and X auditioned, B still 0, gate must remain locked');

    // Audition B for 1.8s (just under 2.0s threshold)
    engine.playSource('B');
    mockCtx.advanceTime(1.8);
    stats = engine.getAuditionStats();
    approxEqual(stats.durationB, 1.8, 0.01);
    assert.strictEqual(stats.gateSatisfied, false, 'B is 1.8s (< 2.0s), gate must still be locked');

    // Audition B for 0.3s more (total 2.1s >= 2.0s)
    mockCtx.advanceTime(0.3);
    stats = engine.getAuditionStats();
    approxEqual(stats.durationB, 2.1, 0.01);
    assert.strictEqual(stats.gateSatisfied, true, 'A, X, and B all >= 2.0s, gate must be satisfied');

    // Stop audio: gate remains satisfied
    engine.stop();
    assert.strictEqual(engine.getPlayheadPosition().isPlaying, false);
    stats = engine.getAuditionStats();
    assert.strictEqual(stats.gateSatisfied, true);

    // resetTrialAudition clears audition counters and locks gate
    engine.resetTrialAudition();
    stats = engine.getAuditionStats();
    assert.strictEqual(stats.durationA, 0);
    assert.strictEqual(stats.durationX, 0);
    assert.strictEqual(stats.durationB, 0);
    assert.strictEqual(stats.gateSatisfied, false, 'Gate must be locked after resetTrialAudition');
  });

  // -------------------------------------------------------------
  // 6. Double-Blind Encapsulation & CSPRNG Uniformity
  // -------------------------------------------------------------
  console.log('\n6. Double-Blind Encapsulation & Cryptographic CSPRNG:');

  test('Target identity is strictly concealed in private state until revealTarget()', () => {
    engine.assignTrialTarget();

    // Verify target identity is NOT leaked as a direct public property
    assert.strictEqual(engine.target, undefined, 'engine.target must not be exposed');
    assert.strictEqual(engine.secretTarget, undefined, 'engine.secretTarget must not be exposed');
    assert.strictEqual(engine.currentTarget, undefined, 'engine.currentTarget must not be exposed');
    assert.strictEqual(engine.targetIdentity, undefined, 'engine.targetIdentity must not be exposed');

    // Playing X must report activeSource as 'X', never revealing whether it is A or B
    engine.playSource('X');
    assert.strictEqual(engine.getPlayheadPosition().activeSource, 'X');

    // Calling revealTarget() reveals either 'A' or 'B'
    const target = engine.revealTarget();
    assert(target === 'A' || target === 'B', `Target must be 'A' or 'B', got: ${target}`);
  });

  test('revealTarget() throws if assignTrialTarget() has not been called', () => {
    const EngineClass = typeof ScientificAudioEngine === 'function' ? ScientificAudioEngine : ScientificAudioEngine.ScientificAudioEngine;
    const freshEngine = new EngineClass({ audioContext: new MockAudioContext() });
    assert.throws(() => freshEngine.revealTarget(), /Trial target is unassigned/);
  });

  test('_getBufferForSource("X") throws if assignTrialTarget() has not been called', () => {
    const EngineClass = typeof ScientificAudioEngine === 'function' ? ScientificAudioEngine : ScientificAudioEngine.ScientificAudioEngine;
    const freshEngine = new EngineClass({ audioContext: new MockAudioContext() });
    assert.throws(() => freshEngine._getBufferForSource('X'), /Trial target is unassigned/);
  });

  test('Concurrent _fetchAndDecode calls for the same URL return the exact same Promise instance', () => {
    const EngineClass = typeof ScientificAudioEngine === 'function' ? ScientificAudioEngine : ScientificAudioEngine.ScientificAudioEngine;
    const freshEngine = new EngineClass({ audioContext: new MockAudioContext() });
    // Intentionally pass string paths with an unsupported fetch to trigger fallback
    const prevFetch = global.fetch;
    global.fetch = () => new Promise(resolve => setTimeout(resolve, 100)); // never resolves quickly
    try {
      const p1 = freshEngine._fetchAndDecode('dummy.wav');
      const p2 = freshEngine._fetchAndDecode('dummy.wav');
      assert.strictEqual(p1, p2, 'Concurrent calls must return the identical Promise instance');
    } finally {
      global.fetch = prevFetch;
    }
  });

  test('CSPRNG produces balanced distribution across 1000 trials (binomial p > 0.001)', () => {
    let countA = 0;
    let countB = 0;
    const trials = 1000;

    for (let i = 0; i < trials; i++) {
      engine.assignTrialTarget();
      const t = engine.revealTarget();
      if (t === 'A') countA++;
      else if (t === 'B') countB++;
      else assert.fail(`Invalid target identity: ${t}`);
    }

    assert.strictEqual(countA + countB, trials);

    // In 1000 trials with p = 0.5, mean = 500, std dev = sqrt(250) ≈ 15.81
    // Normal approximation for p > 0.001 two-tailed requires |countA - 500| <= 3.29 * 15.81 ≈ 52
    // Let's verify countA is within [440, 560]
    const dev = Math.abs(countA - 500);
    console.log(`    CSPRNG 1000 trials: A=${countA}, B=${countB}, dev=${dev}`);
    assert(
      dev <= 60,
      `CSPRNG distribution anomaly: countA=${countA}, countB=${countB}, deviation=${dev} > 60`
    );
  });

  // -------------------------------------------------------------
  // 7. Edge Cases & Robustness
  // -------------------------------------------------------------
  console.log('\n7. Edge Cases & Idempotence:');

  test('Calling playSource with already active source maintains uninterrupted playback', () => {
    engine.playSource('A');
    const sourceCountBefore = mockCtx.createdSources.length;
    // Call playSource('A') again
    engine.playSource('A');
    const sourceCountAfter = mockCtx.createdSources.length;
    assert.strictEqual(
      sourceCountAfter,
      sourceCountBefore,
      'Calling playSource with the currently active source must not recreate nodes'
    );
    assert.strictEqual(engine.getPlayheadPosition().activeSource, 'A');
    assert.strictEqual(engine.getPlayheadPosition().isPlaying, true);
  });

  test('Calling stop() when already stopped is completely safe', () => {
    engine.stop();
    assert.strictEqual(engine.getPlayheadPosition().isPlaying, false);
    // Call stop() again
    assert.doesNotThrow(() => engine.stop());
    assert.strictEqual(engine.getPlayheadPosition().isPlaying, false);
  });

  test('Resetting audition counters while audio is actively playing continues tracking', () => {
    engine.playSource('B');
    mockCtx.advanceTime(1.5);
    let stats = engine.getAuditionStats();
    approxEqual(stats.durationB, 1.5, 0.01);

    // Reset trial counters while actively playing
    engine.resetTrialAudition();
    stats = engine.getAuditionStats();
    approxEqual(stats.durationB, 0.0, 0.01, 'B counter immediately resets to 0');

    // Advance 1.0s more while still playing B
    mockCtx.advanceTime(1.0);
    stats = engine.getAuditionStats();
    approxEqual(stats.durationB, 1.0, 0.01, 'B counter continues accumulating from reset point');
    engine.stop();
  });

  // -------------------------------------------------------------
  // 8. Direct Singleton / Static API Invocations
  // -------------------------------------------------------------
  console.log('\n8. Direct Singleton / Static Module API:');

  await testAsync('Static ScientificAudioEngine methods work as a direct singleton', async () => {
    const staticCtx = new MockAudioContext();
    ScientificAudioEngine.init(staticCtx);
    const bufA = new MockAudioBuffer({ duration: 25.0 });
    const bufB = new MockAudioBuffer({ duration: 25.0 });

    const loadRes = await ScientificAudioEngine.loadTrack(bufA, bufB);
    assert.strictEqual(ScientificAudioEngine.isLoaded(), true);
    approxEqual(loadRes.duration, 25.0, 0.01);

    ScientificAudioEngine.assignTrialTarget();
    ScientificAudioEngine.playSource('A');
    assert.strictEqual(ScientificAudioEngine.getPlayheadPosition().activeSource, 'A');
    assert.strictEqual(ScientificAudioEngine.getPlayheadPosition().isPlaying, true);

    staticCtx.advanceTime(2.5);
    ScientificAudioEngine.playSource('B');
    staticCtx.advanceTime(2.5);
    ScientificAudioEngine.playSource('X');
    staticCtx.advanceTime(2.5);

    const stats = ScientificAudioEngine.getAuditionStats();
    assert.strictEqual(stats.gateSatisfied, true, 'Singleton audition gate satisfied');

    const revealed = ScientificAudioEngine.revealTarget();
    assert(revealed === 'A' || revealed === 'B');

    ScientificAudioEngine.stop();
    assert.strictEqual(ScientificAudioEngine.getPlayheadPosition().isPlaying, false);
  });

  // -------------------------------------------------------------
  // 9. HTML5 Audio Element Fallback Mode
  // -------------------------------------------------------------
  console.log('\n9. HTML5 Audio Element Fallback Mode:');

  await testAsync('loadTrack falls back to HTML5 Audio elements when passing URLs or on decoding fallback', async () => {
    class MockHTMLAudio {
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
      load() {}
      play() {
        this.paused = false;
        return Promise.resolve();
      }
      pause() {
        this.paused = true;
      }
    }

    const prevAudio = global.Audio;
    global.Audio = MockHTMLAudio;

    try {
      const mockCtx = new MockAudioContext();
      const htmlEngine = new ScientificAudioEngine.ScientificAudioEngine({ audioContext: mockCtx });

      // Intentionally pass string paths with an unsupported fetch to trigger fallback
      const prevFetch = global.fetch;
      global.fetch = () => Promise.reject(new Error('Simulated network/CORS error on file:// or decode failure'));

      try {
        const res = await htmlEngine.loadTrack('audio/song1_flac.flac', 'audio/song1_opus.opus');
        assert.strictEqual(htmlEngine.isLoaded(), true, 'HTML5 engine must report isLoaded = true');
        assert.strictEqual(htmlEngine.mode, 'html5', 'Mode must be html5');
        approxEqual(res.duration, 30.0, 0.01);

        htmlEngine.assignTrialTarget();
        htmlEngine.playSource('A');
        assert.strictEqual(htmlEngine.activeSource, 'A');
        assert.strictEqual(htmlEngine.isPlaying, true);
        assert.strictEqual(htmlEngine.htmlAudioA.paused, false);

        // Switch to B
        htmlEngine.playSource('B');
        assert.strictEqual(htmlEngine.activeSource, 'B');
        assert.strictEqual(htmlEngine.htmlAudioA.paused, true);
        assert.strictEqual(htmlEngine.htmlAudioB.paused, false);

        // Seek
        htmlEngine.seek(5);
        approxEqual(htmlEngine.getPlayheadPosition().currentTime, 5.0, 0.5);

        // Stop
        htmlEngine.stop();
        assert.strictEqual(htmlEngine.isPlaying, false);
        assert.strictEqual(htmlEngine.htmlAudioB.paused, true);
      } finally {
        global.fetch = prevFetch;
      }
    } finally {
      global.Audio = prevAudio;
    }
  });

  // -------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------
  console.log(`\nTest Summary: ${passed} passed, ${failed} failed\n`);
  if (failed > 0) {
    process.exit(1);
  }
}

runSuite().catch(err => {
  console.error('Unexpected test error:', err);
  process.exit(1);
});

