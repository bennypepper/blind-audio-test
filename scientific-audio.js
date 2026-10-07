/**
 * ScientificAudioEngine — Web Audio Gapless Synchronous ABX Audio Engine
 * 
 * Delivers sample-accurate, gapless, double-blind audio switching between
 * Lossless Reference (A), Lossy Target (B), and Hidden Secret Target (X).
 * 
 * Features:
 * 1. Pre-decoded AudioBuffer memory caching for immediate, latency-free auditioning.
 * 2. Continuous sample-accurate playhead tracking across source switches.
 * 3. 10ms linear micro-crossfade gain ramps on source transitions to eliminate switching clicks.
 * 4. Continuous listening time accumulation per source (A, X, B) with 2.0s engagement gate.
 * 5. Strict double-blind CSPRNG target assignment via crypto.getRandomValues.
 * 6. Dual export: window.ScientificAudioEngine and CommonJS module.exports.
 */

(function () {
  'use strict';

  // Private storage for double-blind secret targets to prevent property inspection
  const secretTargets = new WeakMap();

  /**
   * Helper to retrieve cryptographic PRNG across Browser and Node environments
   */
  function getCrypto() {
    if (typeof globalThis !== 'undefined' && globalThis.crypto && typeof globalThis.crypto.getRandomValues === 'function') {
      return globalThis.crypto;
    }
    if (typeof window !== 'undefined' && window.crypto && typeof window.crypto.getRandomValues === 'function') {
      return window.crypto;
    }
    try {
      const nodeCrypto = require('crypto');
      if (nodeCrypto.webcrypto && typeof nodeCrypto.webcrypto.getRandomValues === 'function') {
        return nodeCrypto.webcrypto;
      }
    } catch (e) {}
    throw new Error('Cryptographically secure PRNG (crypto.getRandomValues) is not available');
  }

  /**
   * Check if an object behaves like an AudioBuffer
   */
  function isAudioBuffer(obj) {
    return Boolean(
      obj &&
      typeof obj.duration === 'number' &&
      typeof obj.sampleRate === 'number' &&
      typeof obj.getChannelData === 'function'
    );
  }

  /**
   * Minimal mock AudioContext for headless/Node testing when no custom mock is provided
   */
  function createHeadlessAudioContext() {
    class HeadlessAudioParam {
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

    class HeadlessGainNode {
      constructor() {
        this.gain = new HeadlessAudioParam(1);
        this.connectedTo = null;
      }
      connect(dest) { this.connectedTo = dest; }
      disconnect() { this.connectedTo = null; }
    }

    class HeadlessBufferSourceNode {
      constructor() {
        this.buffer = null;
        this.connectedTo = null;
        this.startedAt = null;
        this.stoppedAt = null;
        this.startOffset = null;
        this.onended = null;
        this.isPlaying = false;
      }
      connect(dest) { this.connectedTo = dest; }
      disconnect() { this.connectedTo = null; }
      start(when = 0, offset = 0) {
        this.startedAt = when;
        this.startOffset = offset;
        this.isPlaying = true;
      }
      stop(when = 0) {
        this.stoppedAt = when;
        this.isPlaying = false;
      }
    }

    class HeadlessAudioBuffer {
      constructor({ duration = 30, sampleRate = 44100, numberOfChannels = 2 } = {}) {
        this.duration = duration;
        this.sampleRate = sampleRate;
        this.numberOfChannels = numberOfChannels;
      }
      getChannelData() {
        return new Float32Array(Math.floor(this.duration * this.sampleRate));
      }
    }

    return {
      currentTime: 0.0,
      state: 'running',
      destination: {},
      resume() { return Promise.resolve(); },
      createGain() { return new HeadlessGainNode(); },
      createBufferSource() { return new HeadlessBufferSourceNode(); },
      decodeAudioData() { return Promise.resolve(new HeadlessAudioBuffer({ duration: 30 })); }
    };
  }

  /**
   * ScientificAudioEngine class definition
   */
  class ScientificAudioEngine {
    constructor(options = {}) {
      this.audioContext = options.audioContext || null;
      this.masterGain = null;

      // Audio buffers
      this.bufferA = null; // Reference (Lossless FLAC)
      this.bufferB = null; // Test (Lossy)
      this.duration = 0.0;
      this.bufferCache = new Map();

      // Playback state
      this.isPlaying = false;
      this.activeSource = null; // 'A' | 'B' | 'X' | null
      this.playheadStartOffset = 0.0;
      this.playheadStartTime = 0.0;

      // Active audio graph nodes
      this.currentSourceNode = null;
      this.currentGainNode = null;

      // Audition timer tracking for engagement gating (threshold = 2.0s each)
      this.durationA = 0.0;
      this.durationX = 0.0;
      this.durationB = 0.0;
      this.lastAuditionTimestamp = 0.0;

      // Crossfade duration: 10 milliseconds
      this.CROSSFADE_SEC = 0.010;

      if (options.audioContext) {
        this.init(options.audioContext);
      }
    }

    /**
     * Initializes or resumes the AudioContext and configures the master gain node.
     * @param {AudioContext} [customAudioContext] - Optional custom or mock AudioContext.
     * @returns {ScientificAudioEngine}
     */
    init(customAudioContext) {
      if (customAudioContext) {
        this.audioContext = customAudioContext;
      } else if (!this.audioContext) {
        const AudioCtxClass = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
        if (AudioCtxClass) {
          this.audioContext = new AudioCtxClass();
        } else {
          this.audioContext = createHeadlessAudioContext();
        }
      }

      if (this.audioContext && this.audioContext.state === 'suspended' && typeof this.audioContext.resume === 'function') {
        this.audioContext.resume();
      }

      if (this.audioContext && !this.masterGain) {
        this.masterGain = this.audioContext.createGain();
        if (this.masterGain.connect && this.audioContext.destination) {
          this.masterGain.connect(this.audioContext.destination);
        }
        if (this.masterGain.gain && typeof this.masterGain.gain.setValueAtTime === 'function') {
          this.masterGain.gain.setValueAtTime(1.0, this.audioContext.currentTime);
        }
      }

      return this;
    }

    /**
     * Checks whether both Reference and Target audio buffers are loaded in memory.
     * @returns {boolean}
     */
    isLoaded() {
      return Boolean(this.bufferA && this.bufferB && this.duration > 0);
    }

    /**
     * Helper to decode an audio file from URL or local path into an AudioBuffer.
     * @private
     */
    async _fetchAndDecode(source) {
      if (isAudioBuffer(source)) {
        return source;
      }
      if (typeof source !== 'string') {
        throw new Error('Invalid audio source: expected URL string or AudioBuffer');
      }
      if (this.bufferCache.has(source)) {
        return this.bufferCache.get(source);
      }

      let arrayBuffer;
      if (typeof fetch === 'function') {
        const response = await fetch(source);
        if (!response.ok) {
          throw new Error(`Failed to load audio from ${source}: HTTP ${response.status}`);
        }
        arrayBuffer = await response.arrayBuffer();
      } else if (typeof window === 'undefined') {
        // Node.js local file read fallback
        const fs = require('fs');
        const fileData = fs.readFileSync(source);
        arrayBuffer = fileData.buffer.slice(fileData.byteOffset, fileData.byteOffset + fileData.byteLength);
      } else {
        throw new Error('No fetch or file reader available to load audio');
      }

      if (!this.audioContext) {
        this.init();
      }

      const decodedBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      this.bufferCache.set(source, decodedBuffer);
      return decodedBuffer;
    }

    /**
     * Loads and decodes FLAC reference and Lossy target audio files into memory.
     * @param {string|AudioBuffer} flacSource - Lossless reference FLAC URL or AudioBuffer.
     * @param {string|AudioBuffer} lossySource - Lossy comparison format URL or AudioBuffer.
     * @returns {Promise<{ duration: number }>}
     */
    async loadTrack(flacSource, lossySource) {
      if (!this.audioContext) {
        this.init();
      }

      // Stop any existing playback and reset state
      this.stop();
      this.playheadStartOffset = 0.0;
      this.playheadStartTime = 0.0;

      const [bufA, bufB] = await Promise.all([
        this._fetchAndDecode(flacSource),
        this._fetchAndDecode(lossySource)
      ]);

      this.bufferA = bufA;
      this.bufferB = bufB;
      // Duration bounded by the shortest decoded buffer for safety
      this.duration = Math.min(this.bufferA.duration, this.bufferB.duration);

      return { duration: this.duration };
    }

    /**
     * Assigns a cryptographically secure random target ('A' or 'B') to hidden source X.
     * Target identity is stored strictly in private enclosed memory.
     */
    assignTrialTarget() {
      const cryptoObj = getCrypto();
      const randBytes = new Uint8Array(1);
      cryptoObj.getRandomValues(randBytes);
      const target = (randBytes[0] % 2 === 0) ? 'A' : 'B';
      secretTargets.set(this, target);
    }

    /**
     * Reveals the hidden target identity for logging after trial commitment.
     * @returns {'A'|'B'}
     */
    revealTarget() {
      let target = secretTargets.get(this);
      if (!target) {
        // If not assigned yet, lazily assign
        this.assignTrialTarget();
        target = secretTargets.get(this);
      }
      return target;
    }

    /**
     * Resolves the actual AudioBuffer corresponding to a requested source type.
     * @private
     */
    _getBufferForSource(sourceType) {
      if (sourceType === 'A') return this.bufferA;
      if (sourceType === 'B') return this.bufferB;
      if (sourceType === 'X') {
        const target = this.revealTarget();
        return target === 'A' ? this.bufferA : this.bufferB;
      }
      throw new Error(`Invalid source type: ${sourceType}. Expected 'A', 'B', or 'X'.`);
    }

    /**
     * Internal helper to accumulate audition duration for active source up to timestamp.
     * @private
     */
    _accumulateAudition(now) {
      if (this.isPlaying && this.activeSource) {
        const elapsed = Math.max(0, now - this.lastAuditionTimestamp);
        if (this.activeSource === 'A') this.durationA += elapsed;
        else if (this.activeSource === 'X') this.durationX += elapsed;
        else if (this.activeSource === 'B') this.durationB += elapsed;
      }
      this.lastAuditionTimestamp = now;
    }

    /**
     * Computes the current playhead position clamped to [0, duration].
     * @private
     */
    _computeCurrentPlayhead(now) {
      if (!this.isPlaying) {
        return Math.min(this.duration, Math.max(0, this.playheadStartOffset));
      }
      const elapsed = Math.max(0, now - this.playheadStartTime);
      const pos = this.playheadStartOffset + elapsed;
      if (this.duration > 0 && pos >= this.duration) {
        return this.duration;
      }
      return Math.max(0, pos);
    }

    /**
     * Switches playback to the designated source ('A', 'B', or 'X') with seamless
     * continuous playhead synchronization and a 10ms linear micro-crossfade.
     * @param {'A'|'B'|'X'} sourceType
     */
    playSource(sourceType) {
      if (!this.isLoaded()) {
        throw new Error('Cannot play: audio buffers are not loaded. Call loadTrack() first.');
      }
      if (sourceType !== 'A' && sourceType !== 'B' && sourceType !== 'X') {
        throw new Error(`Invalid sourceType "${sourceType}". Expected 'A', 'B', or 'X'.`);
      }

      if (!this.audioContext) {
        this.init();
      }

      const now = this.audioContext.currentTime;

      // If already playing this exact source, maintain playback without interruption
      if (this.isPlaying && this.activeSource === sourceType) {
        return;
      }

      // Accumulate audition time for the currently playing source
      this._accumulateAudition(now);

      // Calculate continuous playhead position
      const currentPlayhead = this._computeCurrentPlayhead(now);

      // If playhead reached or exceeded duration, loop back to start
      const startOffset = currentPlayhead >= this.duration ? 0.0 : currentPlayhead;

      // 1. Perform 10ms micro-crossfade on outgoing source (if active)
      if (this.currentGainNode && this.currentSourceNode) {
        const outgoingGain = this.currentGainNode;
        const outgoingSource = this.currentSourceNode;
        const currentGainVal = outgoingGain.gain.value;

        outgoingGain.gain.setValueAtTime(currentGainVal, now);
        outgoingGain.gain.linearRampToValueAtTime(0.0, now + this.CROSSFADE_SEC);
        if (typeof outgoingSource.stop === 'function') {
          outgoingSource.stop(now + this.CROSSFADE_SEC + 0.005);
        }
      }

      // 2. Instantiate and connect incoming source node & gain node
      const incomingBuffer = this._getBufferForSource(sourceType);
      const incomingGainNode = this.audioContext.createGain();
      incomingGainNode.gain.setValueAtTime(0.0, now);
      incomingGainNode.gain.linearRampToValueAtTime(1.0, now + this.CROSSFADE_SEC);
      incomingGainNode.connect(this.masterGain);

      const incomingSourceNode = this.audioContext.createBufferSource();
      incomingSourceNode.buffer = incomingBuffer;
      incomingSourceNode.connect(incomingGainNode);

      // Handle natural end of buffer
      incomingSourceNode.onended = () => {
        if (this.currentSourceNode === incomingSourceNode) {
          this.stop();
          this.playheadStartOffset = this.duration;
        }
      };

      incomingSourceNode.start(now, startOffset);

      // 3. Update active playback state
      this.currentSourceNode = incomingSourceNode;
      this.currentGainNode = incomingGainNode;
      this.activeSource = sourceType;
      this.isPlaying = true;
      this.playheadStartTime = now;
      this.playheadStartOffset = startOffset;
      this.lastAuditionTimestamp = now;
    }

    /**
     * Stops audio playback, records current playhead position, and updates audition timer.
     */
    stop() {
      if (!this.audioContext) return;

      const now = this.audioContext.currentTime;
      this._accumulateAudition(now);
      this.playheadStartOffset = this._computeCurrentPlayhead(now);

      if (this.currentGainNode && this.currentSourceNode) {
        const outgoingGain = this.currentGainNode;
        const outgoingSource = this.currentSourceNode;

        if (typeof outgoingGain.gain.setValueAtTime === 'function') {
          outgoingGain.gain.setValueAtTime(outgoingGain.gain.value, now);
          outgoingGain.gain.linearRampToValueAtTime(0.0, now + this.CROSSFADE_SEC);
        }
        if (typeof outgoingSource.stop === 'function') {
          outgoingSource.stop(now + this.CROSSFADE_SEC + 0.005);
        }

        this.currentGainNode = null;
        this.currentSourceNode = null;
      }

      this.isPlaying = false;
      this.activeSource = null;
    }

    /**
     * Seeks playback position by deltaSeconds (+5, -5, etc.), clamped to [0, duration].
     * @param {number} deltaSeconds
     * @returns {number} New playhead position in seconds.
     */
    seek(deltaSeconds) {
      const now = this.audioContext ? this.audioContext.currentTime : 0;
      const currentPos = this._computeCurrentPlayhead(now);
      return this.setPlayhead(currentPos + deltaSeconds);
    }

    /**
     * Sets playhead to an explicit timestamp in seconds, clamped to [0, duration].
     * If currently playing, seamlessly restarts current source from new position.
     * @param {number} targetSeconds
     * @returns {number} Clamped new playhead position in seconds.
     */
    setPlayhead(targetSeconds) {
      const clamped = Math.min(this.duration, Math.max(0, targetSeconds));

      if (this.isPlaying && this.activeSource) {
        const currentSource = this.activeSource;
        const now = this.audioContext.currentTime;
        this._accumulateAudition(now);

        // Stop outgoing node
        if (this.currentGainNode && this.currentSourceNode) {
          const outgoingGain = this.currentGainNode;
          const outgoingSource = this.currentSourceNode;
          outgoingGain.gain.setValueAtTime(outgoingGain.gain.value, now);
          outgoingGain.gain.linearRampToValueAtTime(0.0, now + this.CROSSFADE_SEC);
          if (typeof outgoingSource.stop === 'function') {
            outgoingSource.stop(now + this.CROSSFADE_SEC + 0.005);
          }
        }

        // Start new source at requested offset
        const incomingBuffer = this._getBufferForSource(currentSource);
        const incomingGainNode = this.audioContext.createGain();
        incomingGainNode.gain.setValueAtTime(0.0, now);
        incomingGainNode.gain.linearRampToValueAtTime(1.0, now + this.CROSSFADE_SEC);
        incomingGainNode.connect(this.masterGain);

        const incomingSourceNode = this.audioContext.createBufferSource();
        incomingSourceNode.buffer = incomingBuffer;
        incomingSourceNode.connect(incomingGainNode);

        incomingSourceNode.onended = () => {
          if (this.currentSourceNode === incomingSourceNode) {
            this.stop();
            this.playheadStartOffset = this.duration;
          }
        };

        incomingSourceNode.start(now, clamped);

        this.currentSourceNode = incomingSourceNode;
        this.currentGainNode = incomingGainNode;
        this.playheadStartTime = now;
        this.playheadStartOffset = clamped;
        this.lastAuditionTimestamp = now;
      } else {
        this.playheadStartOffset = clamped;
      }

      return clamped;
    }

    /**
     * Returns the current playback state and playhead timestamp.
     * @returns {{ currentTime: number, duration: number, isPlaying: boolean, activeSource: 'A'|'B'|'X'|null }}
     */
    getPlayheadPosition() {
      const now = this.audioContext ? this.audioContext.currentTime : 0;
      const currentTime = this._computeCurrentPlayhead(now);
      return {
        currentTime,
        duration: this.duration,
        isPlaying: this.isPlaying,
        activeSource: this.activeSource
      };
    }

    /**
     * Returns accumulated audition statistics for each source in the current trial,
     * including gate threshold validation (true iff A >= 2.0s, X >= 2.0s, and B >= 2.0s).
     * @returns {{ durationA: number, durationX: number, durationB: number, gateSatisfied: boolean }}
     */
    getAuditionStats() {
      const now = this.audioContext ? this.audioContext.currentTime : 0;
      let durA = this.durationA;
      let durX = this.durationX;
      let durB = this.durationB;

      if (this.isPlaying && this.activeSource) {
        const liveDelta = Math.max(0, now - this.lastAuditionTimestamp);
        if (this.activeSource === 'A') durA += liveDelta;
        else if (this.activeSource === 'X') durX += liveDelta;
        else if (this.activeSource === 'B') durB += liveDelta;
      }

      const gateSatisfied = durA >= 2.0 && durX >= 2.0 && durB >= 2.0;

      return {
        durationA: durA,
        durationX: durX,
        durationB: durB,
        gateSatisfied
      };
    }

    /**
     * Resets trial audition counters (durationA = 0, durationX = 0, durationB = 0).
     */
    resetTrialAudition() {
      this.durationA = 0.0;
      this.durationX = 0.0;
      this.durationB = 0.0;
      if (this.audioContext) {
        this.lastAuditionTimestamp = this.audioContext.currentTime;
      }
    }
  }

  // Create default singleton instance for direct module invocation
  const defaultEngine = new ScientificAudioEngine();

  // Attach static methods delegating to the default singleton
  ScientificAudioEngine.init = (...args) => defaultEngine.init(...args);
  ScientificAudioEngine.isLoaded = (...args) => defaultEngine.isLoaded(...args);
  ScientificAudioEngine.loadTrack = (...args) => defaultEngine.loadTrack(...args);
  ScientificAudioEngine.playSource = (...args) => defaultEngine.playSource(...args);
  ScientificAudioEngine.stop = (...args) => defaultEngine.stop(...args);
  ScientificAudioEngine.seek = (...args) => defaultEngine.seek(...args);
  ScientificAudioEngine.setPlayhead = (...args) => defaultEngine.setPlayhead(...args);
  ScientificAudioEngine.getPlayheadPosition = (...args) => defaultEngine.getPlayheadPosition(...args);
  ScientificAudioEngine.getAuditionStats = (...args) => defaultEngine.getAuditionStats(...args);
  ScientificAudioEngine.resetTrialAudition = (...args) => defaultEngine.resetTrialAudition(...args);
  ScientificAudioEngine.assignTrialTarget = (...args) => defaultEngine.assignTrialTarget(...args);
  ScientificAudioEngine.revealTarget = (...args) => defaultEngine.revealTarget(...args);
  ScientificAudioEngine.ScientificAudioEngine = ScientificAudioEngine;

  // Dual exports
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = ScientificAudioEngine;
  }
  if (typeof window !== 'undefined') {
    window.ScientificAudioEngine = ScientificAudioEngine;
  }
})();
