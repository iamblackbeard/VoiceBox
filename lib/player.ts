import { browser } from 'wxt/browser';
import { ttsClient, type TTSClient } from './tts-client';
import { getDefaultVoiceForEngine } from './voices';
import {
  getOrInitializeSettings,
  SETTINGS_STORAGE_KEY,
  type StoredSettings,
  type TTSEngine,
} from './settings';

export { encodeWAV, decodeWAV } from './audio';

/** Number of chunks to synthesize and cache ahead of the current position. */
export const LOOKAHEAD_SIZE = 5;

/** Idle timeout before the audio chunk cache is fully evicted (10 minutes). */
const CACHE_IDLE_EVICT_MS = 10 * 60 * 1000;

export type PlayerStatus =
  | 'idle'
  | 'downloading'
  | 'buffering'
  | 'playing'
  | 'paused'
  | 'ended'
  | 'error';

export interface PlayerState {
  status: PlayerStatus;
  message: string | null;
  engine?: TTSEngine;
  voice?: string;
  /** Currently-active sentence index (0-based). -1 when not playing. */
  sentenceIndex: number;
  /** Total number of sentences in the current reading. */
  totalSentences: number;
}

export type StateListener = (state: PlayerState) => void;

/** One entry in the look-ahead queue: a pending AudioBuffer promise. */
interface QueueEntry {
  promise: Promise<AudioBuffer>;
  cancelled: boolean;
}

function getBrowser(): any {
  if (typeof browser !== 'undefined' && browser?.storage) return browser;
  if (typeof globalThis !== 'undefined' && (globalThis as any).browser) return (globalThis as any).browser;
  if (typeof (globalThis as any).chrome !== 'undefined') return (globalThis as any).chrome;
  return undefined;
}

/** Decode raw Float32 PCM samples into a Web Audio AudioBuffer. */
function samplesToAudioBuffer(
  ctx: AudioContext,
  samples: Float32Array,
  sampleRate: number
): AudioBuffer {
  const buf = ctx.createBuffer(1, samples.length, sampleRate);
  // copyToChannel requires Float32Array<ArrayBuffer>; create an explicit copy
  const plain = new Float32Array(new ArrayBuffer(samples.byteLength));
  plain.set(samples);
  buf.copyToChannel(plain, 0);
  return buf;
}

export class Player {
  private status: PlayerStatus = 'idle';
  private message: string | null = null;
  private listeners: StateListener[] = [];

  private chunks: string[] = [];
  private readingId: string = '';
  private currentIndex = 0;
  private client: TTSClient;
  private activeEngine: TTSEngine = 'kokoro';
  private activeVoice: string = getDefaultVoiceForEngine('kokoro');

  /**
   * Monotonically-increasing token. Incremented on every replace / stop /
   * engine-change / voice-change. Any async closure that captured an older value is stale.
   */
  private generationToken = 0;

  // ── Web Audio API ──────────────────────────────────────────────────────────
  private audioCtx: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private activeSource: AudioBufferSourceNode | null = null;
  private gainValue = 1.0;

  /** The in-memory sentence chunk cache: sentence index → decoded AudioBuffer. */
  private cache: Map<number, AudioBuffer> = new Map();

  /** Look-ahead synthesis queue: sentence index → QueueEntry (pending AudioBuffer). */
  private queue: Map<number, QueueEntry> = new Map();

  private tabId: number | null = null;
  private connection: any = null;

  /** Timer ID for the 10-minute idle cache eviction. */
  private idleEvictTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(client?: TTSClient) {
    this.client = client || ttsClient;

    this.client.onProgress((_msg) => {
      if (this.status !== 'playing' && this.status !== 'paused') {
        this.updateState('downloading', 'Downloading the voice ....');
      }
    });

    const b = getBrowser();
    if (b?.storage?.onChanged) {
      b.storage.onChanged.addListener(async (changes: any, area: string) => {
        if (area === 'local' && changes[SETTINGS_STORAGE_KEY]) {
          const newSettings = changes[SETTINGS_STORAGE_KEY].newValue as
            | StoredSettings
            | undefined;
          if (newSettings) {
            if (newSettings.engine && newSettings.engine !== this.activeEngine) {
              await this.handleEngineChange(newSettings.engine);
            }
            const targetVoice =
              newSettings.voicePreferences?.activeVoice?.[this.activeEngine];
            if (targetVoice && targetVoice !== this.activeVoice) {
              await this.handleVoiceChange(targetVoice);
            }
          }
        }
      });
    }
  }

  // ── Subscriptions ──────────────────────────────────────────────────────────

  subscribe(listener: StateListener) {
    this.listeners.push(listener);
    listener(this.getState());
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private updateState(status: PlayerStatus, message: string | null = null) {
    this.status = status;
    this.message = message;
    const state = this.getState();
    this.listeners.forEach((l) => l(state));
  }

  getState(): PlayerState {
    return {
      status: this.status,
      message: this.message,
      engine: this.activeEngine,
      voice: this.activeVoice,
      sentenceIndex: this.status === 'playing' || this.status === 'paused' || this.status === 'buffering'
        ? Math.max(0, this.currentIndex - 1)
        : this.status === 'ended'
        ? Math.max(0, this.chunks.length - 1)
        : -1,
      totalSentences: this.chunks.length,
    };
  }

  getActiveEngine(): TTSEngine {
    return this.activeEngine;
  }

  getActiveVoice(): string {
    return this.activeVoice;
  }

  getCurrentIndex(): number {
    return this.currentIndex;
  }

  /** Return how many entries are currently pending in the synthesis queue (for tests). */
  getQueueSize(): number {
    return this.queue.size;
  }

  // ── Web Audio context management ────────────────────────────────────────────

  private ensureAudioCtx(): AudioContext {
    if (!this.audioCtx || this.audioCtx.state === 'closed') {
      this.audioCtx = new AudioContext();
      this.gainNode = this.audioCtx.createGain();
      this.gainNode.gain.value = this.gainValue;
      this.gainNode.connect(this.audioCtx.destination);
    }
    return this.audioCtx;
  }

  private stopActiveSource() {
    if (this.activeSource) {
      try {
        this.activeSource.onended = null;
        this.activeSource.stop();
        this.activeSource.disconnect();
      } catch (_) {}
      this.activeSource = null;
    }
  }

  private playBuffer(buffer: AudioBuffer, onEnded: () => void): AudioBufferSourceNode {
    const ctx = this.ensureAudioCtx();
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(this.gainNode!);
    source.onended = () => {
      if (source === this.activeSource) {
        this.activeSource = null;
      }
      onEnded();
    };
    source.start();
    return source;
  }

  // ── GainNode volume control (for Slice 3 VolumePopover) ───────────────────

  setGain(value: number) {
    this.gainValue = Math.max(0, Math.min(1, value));
    if (this.gainNode) {
      this.gainNode.gain.value = this.gainValue;
    }
  }

  getGain(): number {
    return this.gainValue;
  }

  // ── Cache eviction ─────────────────────────────────────────────────────────

  private scheduleIdleEvict() {
    this.cancelIdleEvict();
    this.idleEvictTimer = setTimeout(() => {
      this.evictCache();
    }, CACHE_IDLE_EVICT_MS);
  }

  private cancelIdleEvict() {
    if (this.idleEvictTimer !== null) {
      clearTimeout(this.idleEvictTimer);
      this.idleEvictTimer = null;
    }
  }

  private evictCache() {
    this.cache.clear();
    this.cancelIdleEvict();
  }

  // ── Synthesis look-ahead queue ─────────────────────────────────────────────

  /**
   * Schedule synthesis of up to LOOKAHEAD_SIZE chunks starting at fromIndex.
   * Skips indices already in the cache or the synthesis queue, or out of range.
   */
  private scheduleAhead(fromIndex: number, token: number) {
    const rid = this.readingId;
    const limit = Math.min(fromIndex + LOOKAHEAD_SIZE, this.chunks.length);

    for (let i = fromIndex; i < limit; i++) {
      if (this.cache.has(i) || this.queue.has(i)) continue;

      const entry: QueueEntry = { cancelled: false, promise: Promise.resolve(null as any) };

      const chunkText = this.chunks[i] as string;
      const voiceId = this.activeVoice || getDefaultVoiceForEngine(this.activeEngine);
      const engine = this.activeEngine;

      entry.promise = this.client
        .generate(chunkText, voiceId, rid, engine)
        .then((result): AudioBuffer => {
          if (entry.cancelled || this.generationToken !== token || this.readingId !== rid) {
            throw new Error('stale');
          }
          // Decode into AudioBuffer for the cache
          const ctx = this.ensureAudioCtx();
          const buf = samplesToAudioBuffer(ctx, result.audio, result.sampleRate);
          // Cache it immediately so seek() can hit it
          if (!entry.cancelled && this.generationToken === token) {
            this.cache.set(i, buf);
          }
          return buf;
        })
        .catch((err: any) => {
          if (entry.cancelled || this.generationToken !== token || this.readingId !== rid) {
            throw new Error('stale');
          }
          throw err;
        });

      this.queue.set(i, entry);
    }
  }

  /** Cancel all pending synthesis entries but keep the in-memory cache intact. */
  private cancelQueue() {
    for (const entry of this.queue.values()) {
      entry.cancelled = true;
    }
    this.queue.clear();
  }

  /** Cancel queue AND flush cache (call on new reading or manual clear). */
  private clearAll() {
    this.cancelQueue();
    this.evictCache();
    this.stopActiveSource();
  }

  // ── Engine & Voice change ──────────────────────────────────────────────────

  async handleEngineChange(newEngine: TTSEngine) {
    if (this.activeEngine === newEngine) return;
    this.activeEngine = newEngine;

    const settings = await getOrInitializeSettings().catch(() => null);
    this.activeVoice =
      settings?.voicePreferences?.activeVoice?.[this.activeEngine] ||
      getDefaultVoiceForEngine(this.activeEngine);

    if (this.status === 'playing' || this.status === 'buffering') {
      this.generationToken++;
      const token = this.generationToken;
      this.stopActiveSource();
      this.clearAll();
      this.updateState('buffering');

      try {
        await this.client.unload();
        await this.client.load(this.activeEngine, this.activeVoice);
        if (this.currentIndex < this.chunks.length) {
          this.scheduleAhead(this.currentIndex, token);
          await this.playNextChunk();
        } else {
          this.updateState('ended');
        }
      } catch (err: any) {
        if (this.generationToken === token) this.updateState('error', err.message);
      }
    } else if (this.status === 'paused') {
      this.generationToken++;
      const token = this.generationToken;
      this.clearAll();
      try {
        await this.client.unload();
        await this.client.load(this.activeEngine, this.activeVoice);
        this.scheduleAhead(this.currentIndex, token);
      } catch (err: any) {
        if (this.generationToken === token) this.updateState('error', err.message);
      }
    } else {
      this.client.unload().catch(() => {});
    }
  }

  async handleVoiceChange(newVoice: string) {
    if (this.activeVoice === newVoice) return;
    this.activeVoice = newVoice;

    if (this.status === 'playing' || this.status === 'buffering') {
      this.generationToken++;
      const token = this.generationToken;
      this.clearAll();

      try {
        if (this.activeEngine === 'piper') {
          this.updateState('buffering');
          await this.client.load(this.activeEngine, this.activeVoice);
        }
        if (this.currentIndex < this.chunks.length) {
          this.scheduleAhead(this.currentIndex, token);
          if (this.status === 'buffering') {
            await this.playNextChunk();
          }
        } else {
          this.updateState('ended');
        }
      } catch (err: any) {
        if (this.generationToken === token) this.updateState('error', err.message);
      }
    } else if (this.status === 'paused') {
      this.generationToken++;
      const token = this.generationToken;
      this.clearAll();
      try {
        if (this.activeEngine === 'piper') {
          await this.client.load(this.activeEngine, this.activeVoice);
        }
        this.scheduleAhead(this.currentIndex, token);
      } catch (err: any) {
        if (this.generationToken === token) this.updateState('error', err.message);
      }
    }
  }

  // ── Public playback API ────────────────────────────────────────────────────

  async play(chunks: string[], readingId: string, tabId: number) {
    this.generationToken++;
    const token = this.generationToken;

    this.stopActiveSource();
    this.clearAll();

    this.chunks = chunks;
    this.readingId = readingId;
    this.currentIndex = 0;

    const b = getBrowser();

    if (this.connection && this.tabId !== tabId) {
      try { this.connection.disconnect(); } catch (e) {}
      this.connection = null;
    }
    this.tabId = tabId;
    if (!this.connection && b?.tabs?.connect) {
      try { this.connection = b.tabs.connect(tabId); } catch (e) {}
    }

    if (chunks.length === 0) {
      this.updateState('idle');
      return;
    }

    this.updateState('buffering');

    try {
      const settings = await getOrInitializeSettings().catch(() => ({
        engine: 'kokoro' as TTSEngine,
        hasWebGpu: true,
        checkedAt: Date.now(),
        voicePreferences: {
          activeVoice: { kokoro: 'af_heart', piper: 'en_US-hfc_female-medium' },
          favorites: { kokoro: ['af_heart'], piper: ['en_US-hfc_female-medium'] },
        },
      }));

      if (this.generationToken !== token) return;

      this.activeEngine = settings.engine || 'kokoro';
      this.activeVoice =
        settings.voicePreferences?.activeVoice?.[this.activeEngine] ||
        getDefaultVoiceForEngine(this.activeEngine);

      await this.client.unload().catch(() => {});
      if (this.generationToken !== token) return;

      await this.client.load(this.activeEngine, this.activeVoice);
      if (this.generationToken !== token) return;

      this.scheduleAhead(0, token);
      await this.playNextChunk();
    } catch (err: any) {
      if (this.generationToken === token) this.updateState('error', err.message);
    }
  }

  /**
   * Seek to a specific sentence index.
   * Cache hit: plays immediately. Cache miss: aborts background prefetch, prioritizes the target.
   */
  async seek(index: number) {
    if (index < 0 || index >= this.chunks.length) return;
    if (this.status === 'idle' || this.status === 'error') return;

    this.generationToken++;
    const token = this.generationToken;

    // Stop whatever is playing right now
    this.stopActiveSource();
    // Cancel background prefetch but keep the cache
    this.cancelQueue();

    this.currentIndex = index;
    this.updateState('buffering');

    // Reschedule from the new position
    this.scheduleAhead(index, token);

    // If we have a cached buffer, play immediately
    await this.playNextChunk();
  }

  /**
   * Replay from sentence 0 using the in-memory cache — zero synthesis latency.
   */
  async replay() {
    if (this.chunks.length === 0) return;

    this.generationToken++;
    const token = this.generationToken;

    this.stopActiveSource();
    this.cancelQueue();

    this.currentIndex = 0;
    this.updateState('buffering');

    // Re-queue only what isn't cached yet
    this.scheduleAhead(0, token);
    await this.playNextChunk();
  }

  private async playNextChunk() {
    const token = this.generationToken;
    const b = getBrowser();

    if (this.currentIndex >= this.chunks.length) {
      this.updateState('ended');
      this.scheduleIdleEvict();
      if (this.tabId !== null && b?.tabs?.sendMessage) {
        b.tabs.sendMessage(this.tabId, { type: 'clear' }).catch(() => {});
      }
      return;
    }

    // Check the in-memory cache first — this is the zero-latency path
    const cached = this.cache.get(this.currentIndex);
    if (cached) {
      this.queue.delete(this.currentIndex);
      this.cancelIdleEvict();
      this._startPlayback(cached, token, this.currentIndex, b);
      return;
    }

    // Not cached yet — wait for synthesis
    const entry = this.queue.get(this.currentIndex);
    if (!entry) {
      // Shouldn't happen if scheduleAhead was called before playNextChunk
      this.updateState('error', 'Encountered an error while fetching voice');
      return;
    }

    if (this.status !== 'buffering') {
      this.updateState('buffering');
    }

    let buffer: AudioBuffer;
    try {
      buffer = await entry.promise;
    } catch (err: any) {
      if (this.generationToken !== token || err?.message === 'stale') return;
      this.updateState('error', err.message);
      return;
    }

    if (this.generationToken !== token) return;

    if (this.status === 'paused') {
      // Audio is ready; it will be picked up by resume()
      return;
    }

    this.queue.delete(this.currentIndex);
    this.cancelIdleEvict();
    this._startPlayback(buffer, token, this.currentIndex, b);
  }

  private _startPlayback(buffer: AudioBuffer, token: number, index: number, b: any) {
    const sentenceIndex = index;

    this.activeSource = this.playBuffer(buffer, async () => {
      if (this.generationToken !== token) return;
      // currentIndex was already advanced to sentenceIndex + 1 below; don't increment again
      this.scheduleAhead(this.currentIndex, token);
      await this.playNextChunk();
    });

    if (this.generationToken !== token) return;

    this.currentIndex = sentenceIndex + 1;
    this.updateState('playing');

    // Notify the content script to highlight on the page
    if (this.tabId !== null && b?.tabs?.sendMessage) {
      b.tabs.sendMessage(this.tabId, {
        type: 'highlight',
        chunkIndex: sentenceIndex,
      }).catch(() => {});
    }

    // Extend the look-ahead window
    this.scheduleAhead(this.currentIndex, token);
  }

  pause() {
    if (this.status === 'playing' || this.status === 'buffering') {
      this.stopActiveSource();
      this.updateState('paused');
    }
  }

  resume() {
    if (this.status !== 'paused') return;

    const resumeIndex = Math.max(0, this.currentIndex - 1);
    const token = this.generationToken;
    const b = getBrowser();

    // Check cache for the current sentence
    const cached = this.cache.get(resumeIndex);
    if (cached) {
      this.currentIndex = resumeIndex;
      this._startPlayback(cached, token, resumeIndex, b);
    } else {
      // Re-queue and play
      this.scheduleAhead(resumeIndex, token);
      this.playNextChunk();
    }
  }

  stop() {
    this.generationToken++;
    this.stopActiveSource();
    this.clearAll();
    this.chunks = [];
    this.currentIndex = 0;
    this.updateState('idle');
    const b = getBrowser();
    if (this.tabId !== null && b?.tabs?.sendMessage) {
      b.tabs.sendMessage(this.tabId, { type: 'clear' }).catch(() => {});
    }
  }

  /** Apply playback rate (speed slider). Web Audio nodes don't directly support
   * playback rate on AudioBufferSourceNode post-creation; new nodes respect it. */
  setSpeed(_rate: number) {
    // Speed control is intentionally deferred — AudioBufferSourceNode.playbackRate
    // can be set at start. We store it here for Slice 3 if needed.
  }
}

export const player = new Player();
