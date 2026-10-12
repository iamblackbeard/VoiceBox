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

function getBrowser(): any {
  if (typeof browser !== 'undefined' && browser?.storage) return browser;
  if (typeof globalThis !== 'undefined' && (globalThis as any).browser) return (globalThis as any).browser;
  if (typeof chrome !== 'undefined') return chrome;
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
  private generationToken = 0;

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

    this.client.onProgress((msg) => {
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

  async handleEngineChange(newEngine: TTSEngine) {
    if (this.activeEngine === newEngine) return;
    this.activeEngine = newEngine;

    if (this.status === 'playing' || this.status === 'buffering') {
      this.generationToken++;
      if (this.audioElement.pause) {
        this.audioElement.pause();
      }
      if (this.currentAudioUrl && typeof URL !== 'undefined' && URL.revokeObjectURL) {
        URL.revokeObjectURL(this.currentAudioUrl);
        this.currentAudioUrl = null;
      }
      this.updateState('buffering');

      try {
        await this.client.unload();
        const voiceId = getDefaultVoiceForEngine(this.activeEngine);
        await this.client.load(this.activeEngine, voiceId);
        if (this.currentIndex < this.chunks.length) {
          await this.playNextChunk();
        } else {
          this.updateState('ended');
        }
      } catch (err: any) {
        this.updateState('error', err.message);
      }
    } else if (this.status === 'paused') {
      this.generationToken++;
      if (this.currentAudioUrl && typeof URL !== 'undefined' && URL.revokeObjectURL) {
        URL.revokeObjectURL(this.currentAudioUrl);
        this.currentAudioUrl = null;
      }
      try {
        await this.client.unload();
        const voiceId = getDefaultVoiceForEngine(this.activeEngine);
        await this.client.load(this.activeEngine, voiceId);
      } catch (err: any) {
        this.updateState('error', err.message);
      }
    } else {
      // If idle/ended, unload the worker model so memory is freed immediately
      this.client.unload().catch(() => {});
    }
  }

  async play(chunks: string[], readingId: string, tabId: number) {
    this.chunks = chunks;
    this.readingId = readingId;
    this.currentIndex = 0;
    this.generationToken++;

    if (this.audioElement.pause) {
      this.audioElement.pause();
    }
    if (this.currentAudioUrl && typeof URL !== 'undefined' && URL.revokeObjectURL) {
      URL.revokeObjectURL(this.currentAudioUrl);
      this.currentAudioUrl = null;
    }

    const b = getBrowser();

    // Connect to the tab to allow clearing on panel close.
    // If it's a new tab, disconnect the old one. If it's the same tab,
    // reuse the connection so we don't trigger a disconnect event that
    // wipes out the new selection's chunkRanges.
    if (this.connection && this.tabId !== tabId) {
      try {
        this.connection.disconnect();
      } catch (e) {}
      this.connection = null;
    }

    this.tabId = tabId;

    if (!this.connection && b?.tabs?.connect) {
      try {
        this.connection = b.tabs.connect(tabId);
      } catch (e) {
        // Ignore if tab is closed or connection fails
      }
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
      this.activeEngine = settings.engine || 'kokoro';
      const voiceId = getDefaultVoiceForEngine(this.activeEngine);
      await this.client.load(this.activeEngine, voiceId);
      await this.playNextChunk();
    } catch (err: any) {
      this.updateState('error', err.message);
    }
  }

  private async playNextChunk() {
    const b = getBrowser();

    if (this.currentIndex >= this.chunks.length) {
      this.updateState('ended');
      if (this.tabId !== null && b?.tabs?.sendMessage) {
        b.tabs.sendMessage(this.tabId, { type: 'clear' }).catch(() => {});
      }
      if (this.currentAudioUrl && typeof URL !== 'undefined' && URL.revokeObjectURL) {
        URL.revokeObjectURL(this.currentAudioUrl);
        this.currentAudioUrl = null;
      }
      return;
    }

    this.updateState('buffering');

    const expectedReadingId = this.readingId;
    const expectedIndex = this.currentIndex;
    const currentToken = this.generationToken;

    try {
      const chunkText = this.chunks[this.currentIndex] as string;
      const voiceId = getDefaultVoiceForEngine(this.activeEngine);
      const result = await this.client.generate(
        chunkText,
        voiceId,
        this.readingId,
        this.activeEngine
      );

      if (
        this.readingId !== expectedReadingId ||
        this.currentIndex !== expectedIndex ||
        this.generationToken !== currentToken
      ) {
        return;
      }

      const wavBlob = encodeWAV(result.audio, result.sampleRate);
      if (this.currentAudioUrl && typeof URL !== 'undefined' && URL.revokeObjectURL) {
        URL.revokeObjectURL(this.currentAudioUrl);
      }
      if (typeof URL !== 'undefined' && URL.createObjectURL) {
        this.currentAudioUrl = URL.createObjectURL(wavBlob);
        this.audioElement.src = this.currentAudioUrl;
      }

      if (this.status === 'paused') {
        return;
      }

      if (this.audioElement.play) {
        await this.audioElement.play();
      }
      this.updateState('playing');

      if (this.tabId !== null && b?.tabs?.sendMessage) {
        b.tabs.sendMessage(this.tabId, {
          type: 'highlight',
          chunkIndex: this.currentIndex,
        }).catch(() => {});
      }

      this.currentIndex++;
    } catch (err: any) {
      if (
        this.readingId === expectedReadingId &&
        this.currentIndex === expectedIndex &&
        this.generationToken === currentToken
      ) {
        this.updateState('error', err.message);
      }
    }
  }

  pause() {
    if (this.status === 'playing' || this.status === 'buffering') {
      if (this.audioElement.pause) {
        this.audioElement.pause();
      }
      this.updateState('paused');
    }
  }

  resume() {
    if (this.status === 'paused') {
      if (this.audioElement.src) {
        if (this.audioElement.play) {
          this.audioElement
            .play()
            .then(() => {
              this.updateState('playing');
            })
            .catch((err) => {
              this.updateState('error', err.message);
            });
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
    if (this.audioElement.pause) {
      this.audioElement.pause();
    }
    if (this.currentAudioUrl && typeof URL !== 'undefined' && URL.revokeObjectURL) {
      URL.revokeObjectURL(this.currentAudioUrl);
      this.currentAudioUrl = null;
    }
    this.chunks = [];
    this.currentIndex = 0;
    this.updateState('idle');
    const b = getBrowser();
    if (this.tabId !== null && b?.tabs?.sendMessage) {
      b.tabs.sendMessage(this.tabId, { type: 'clear' }).catch(() => {});
    }
  }
}

export const player = new Player();
