import { browser } from 'wxt/browser';
import { ttsClient, type TTSClient } from './tts-client';
import { getDefaultVoiceForEngine } from './voices';
import {
  getOrInitializeSettings,
  SETTINGS_STORAGE_KEY,
  type EngineSettings,
  type TTSEngine,
} from './settings';
import { encodeWAV, decodeWAV } from './audio';

export { encodeWAV, decodeWAV };

/** Number of chunks to keep generated ahead of what is currently playing. */
export const LOOKAHEAD_SIZE = 5;

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
}

export type StateListener = (state: PlayerState) => void;

/** One entry in the look-ahead queue: a pending object-URL promise. */
interface QueueEntry {
  promise: Promise<string>;
  cancelled: boolean;
}

function getBrowser(): any {
  if (typeof browser !== 'undefined' && browser?.storage) return browser;
  if (typeof globalThis !== 'undefined' && (globalThis as any).browser) return (globalThis as any).browser;
  if (typeof (globalThis as any).chrome !== 'undefined') return (globalThis as any).chrome;
  return undefined;
}

export class Player {
  private status: PlayerStatus = 'idle';
  private message: string | null = null;
  private listeners: StateListener[] = [];

  private chunks: string[] = [];
  private readingId: string = '';
  private currentIndex = 0;
  private audioElement: HTMLAudioElement;
  private client: TTSClient;
  private activeEngine: TTSEngine = 'kokoro';
  private currentAudioUrl: string | null = null;

  /**
   * Monotonically-increasing token. Incremented on every replace / stop /
   * engine-change. Any async closure that captured an older value is stale.
   */
  private generationToken = 0;

  /** Look-ahead queue: chunk index -> QueueEntry (pre-generated object URL). */
  private queue: Map<number, QueueEntry> = new Map();

  private tabId: number | null = null;
  private connection: any = null;

  constructor(client?: TTSClient, audioElement?: HTMLAudioElement) {
    this.client = client || ttsClient;
    this.audioElement =
      audioElement ||
      (typeof Audio !== 'undefined' ? new Audio() : ({} as HTMLAudioElement));

    if (this.audioElement) {
      this.audioElement.onended = async () => {
        await this.playNextChunk();
      };
    }

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
            | EngineSettings
            | undefined;
          if (newSettings && newSettings.engine) {
            await this.handleEngineChange(newSettings.engine);
          }
        }
      });
    }
  }

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
    };
  }

  getActiveEngine(): TTSEngine {
    return this.activeEngine;
  }

  getCurrentIndex(): number {
    return this.currentIndex;
  }

  /** Return how many entries are currently buffered in the queue (for tests). */
  getQueueSize(): number {
    return this.queue.size;
  }

  // ---------------------------------------------------------------------------
  // Look-ahead queue
  // ---------------------------------------------------------------------------

  /**
   * Schedule generation of up to LOOKAHEAD_SIZE chunks starting at fromIndex.
   * Skips indices already in the queue or out of range.
   */
  private scheduleAhead(fromIndex: number, token: number) {
    const rid = this.readingId;
    const limit = Math.min(fromIndex + LOOKAHEAD_SIZE, this.chunks.length);
    for (let i = fromIndex; i < limit; i++) {
      if (this.queue.has(i)) continue;

      const entry: QueueEntry = { cancelled: false, promise: Promise.resolve('') };

      const chunkText = this.chunks[i] as string;
      const voiceId = getDefaultVoiceForEngine(this.activeEngine);
      const engine = this.activeEngine;

      entry.promise = this.client
        .generate(chunkText, voiceId, rid, engine)
        .then((result): string => {
          if (entry.cancelled || this.generationToken !== token || this.readingId !== rid) {
            throw new Error('stale');
          }
          const blob = encodeWAV(result.audio, result.sampleRate);
          if (typeof URL !== 'undefined' && URL.createObjectURL) {
            return URL.createObjectURL(blob);
          }
          throw new Error('stale');
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

  /** Cancel every queued entry and revoke the current audio object URL. */
  private clearQueue() {
    for (const entry of this.queue.values()) {
      entry.cancelled = true;
    }
    this.queue.clear();
    if (this.currentAudioUrl && typeof URL !== 'undefined' && URL.revokeObjectURL) {
      URL.revokeObjectURL(this.currentAudioUrl);
      this.currentAudioUrl = null;
    }
  }

  // ---------------------------------------------------------------------------
  // Engine change
  // ---------------------------------------------------------------------------

  async handleEngineChange(newEngine: TTSEngine) {
    if (this.activeEngine === newEngine) return;
    this.activeEngine = newEngine;

    if (this.status === 'playing' || this.status === 'buffering') {
      this.generationToken++;
      const token = this.generationToken;
      if (this.audioElement.pause) this.audioElement.pause();
      this.clearQueue();
      this.updateState('buffering');

      try {
        await this.client.unload();
        const voiceId = getDefaultVoiceForEngine(this.activeEngine);
        await this.client.load(this.activeEngine, voiceId);
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
      this.clearQueue();
      try {
        await this.client.unload();
        const voiceId = getDefaultVoiceForEngine(this.activeEngine);
        await this.client.load(this.activeEngine, voiceId);
        // Re-schedule so resume() has audio ready
        this.scheduleAhead(this.currentIndex, token);
      } catch (err: any) {
        if (this.generationToken === token) this.updateState('error', err.message);
      }
    } else {
      // idle / ended — free model memory immediately
      this.client.unload().catch(() => {});
    }
  }

  // ---------------------------------------------------------------------------
  // Public playback API
  // ---------------------------------------------------------------------------

  async play(chunks: string[], readingId: string, tabId: number) {
    // Tear down any active reading before starting the new one
    this.generationToken++;
    const token = this.generationToken;

    if (this.audioElement.pause) this.audioElement.pause();
    this.clearQueue();

    this.chunks = chunks;
    this.readingId = readingId;
    this.currentIndex = 0;

    const b = getBrowser();

    // Connect to the tab to allow clearing the highlight on panel close.
    // Reuse the connection for the same tab so we don't trigger a disconnect
    // event that would wipe out the new selection's chunkRanges.
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
      }));

      if (this.generationToken !== token) return;

      this.activeEngine = settings.engine || 'kokoro';
      const voiceId = getDefaultVoiceForEngine(this.activeEngine);

      // Unload any stale engine model before loading the replacement
      await this.client.unload().catch(() => {});

      if (this.generationToken !== token) return;

      await this.client.load(this.activeEngine, voiceId);

      if (this.generationToken !== token) return;

      // Kick off look-ahead generation for the first LOOKAHEAD_SIZE chunks
      this.scheduleAhead(0, token);

      await this.playNextChunk();
    } catch (err: any) {
      if (this.generationToken === token) this.updateState('error', err.message);
    }
  }

  private async playNextChunk() {
    const token = this.generationToken;
    const b = getBrowser();

    if (this.currentIndex >= this.chunks.length) {
      this.updateState('ended');
      if (this.tabId !== null && b?.tabs?.sendMessage) {
        b.tabs.sendMessage(this.tabId, { type: 'clear' }).catch(() => {});
      }
      return;
    }

    const entry = this.queue.get(this.currentIndex);
    if (!entry) {
      // Shouldn't happen if scheduleAhead was called before playNextChunk
      this.updateState('error', 'Encounter some error, while fetching voice');
      return;
    }

    // Show buffering while waiting for the chunk to be ready
    if (this.status !== 'buffering') {
      this.updateState('buffering');
    }

    let url: string;
    try {
      url = await entry.promise;
    } catch (err: any) {
      if (this.generationToken !== token || err?.message === 'stale') return;
      this.updateState('error', err.message);
      return;
    }

    if (this.generationToken !== token) return;

    if (this.status === 'paused') {
      // Audio is ready; store it so resume() can play immediately
      if (this.currentAudioUrl && typeof URL !== 'undefined' && URL.revokeObjectURL) {
        URL.revokeObjectURL(this.currentAudioUrl);
      }
      this.currentAudioUrl = url;
      this.audioElement.src = url;
      return;
    }

    // Remove from queue, then play
    this.queue.delete(this.currentIndex);
    if (this.currentAudioUrl && typeof URL !== 'undefined' && URL.revokeObjectURL) {
      URL.revokeObjectURL(this.currentAudioUrl);
    }
    this.currentAudioUrl = url;
    this.audioElement.src = url;

    if (this.audioElement.play) {
      await this.audioElement.play();
    }

    if (this.generationToken !== token) return;

    this.updateState('playing');

    if (this.tabId !== null && b?.tabs?.sendMessage) {
      b.tabs.sendMessage(this.tabId, {
        type: 'highlight',
        chunkIndex: this.currentIndex,
      }).catch(() => {});
    }

    this.currentIndex++;

    // Extend the look-ahead window forward
    this.scheduleAhead(this.currentIndex, token);
  }

  pause() {
    if (this.status === 'playing' || this.status === 'buffering') {
      if (this.audioElement.pause) this.audioElement.pause();
      this.updateState('paused');
    }
  }

  resume() {
    if (this.status === 'paused') {
      if (this.audioElement.src) {
        if (this.audioElement.play) {
          this.audioElement
            .play()
            .then(() => { this.updateState('playing'); })
            .catch((err) => { this.updateState('error', err.message); });
        } else {
          this.updateState('playing');
        }
      } else if (this.currentIndex < this.chunks.length) {
        this.playNextChunk();
      }
    }
  }

  stop() {
    this.generationToken++;
    if (this.audioElement.pause) this.audioElement.pause();
    this.clearQueue();
    this.chunks = [];
    this.currentIndex = 0;
    this.updateState('idle');
    const b = getBrowser();
    if (this.tabId !== null && b?.tabs?.sendMessage) {
      b.tabs.sendMessage(this.tabId, { type: 'clear' }).catch(() => {});
    }
  }

  /** Apply playback rate to the current audio element (speed slider, slice 5). */
  setSpeed(rate: number) {
    if (this.audioElement && typeof this.audioElement.playbackRate !== 'undefined') {
      this.audioElement.playbackRate = rate;
    }
  }
}

export const player = new Player();
