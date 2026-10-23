export type AudioPlaybackStatus = 'idle' | 'loading' | 'playing' | 'error';

export interface AudioPreviewState {
  voiceId: string | null;
  status: AudioPlaybackStatus;
  errorMessage?: string;
}

type StateListener = (state: AudioPreviewState) => void;

/**
 * Resolves an audio URL. If given a relative path (e.g. '/voice_sample/...'),
 * converts it to an extension URL using browser.runtime.getURL / chrome.runtime.getURL if available.
 */
export function resolveAudioUrl(url: string): string {
  if (
    !url ||
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('blob:') ||
    url.startsWith('data:')
  ) {
    return url;
  }

  try {
    const b = (globalThis as any).browser ?? (globalThis as any).chrome;
    if (typeof b?.runtime?.getURL === 'function') {
      return b.runtime.getURL(url);
    }
  } catch {
    // Fall back to relative URL
  }

  return url;
}

/**
 * Singleton AudioPreviewManager ensures only one voice sample audio
 * plays at any given time across the voice catalog, with graceful error handling.
 */
export class AudioPreviewManager {
  private currentAudio: HTMLAudioElement | null = null;
  private state: AudioPreviewState = {
    voiceId: null,
    status: 'idle',
  };
  private listeners = new Set<StateListener>();

  public getState(): AudioPreviewState {
    return { ...this.state };
  }

  public subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const currentState = this.getState();
    for (const listener of this.listeners) {
      listener(currentState);
    }
  }

  /**
   * Plays a sample preview clip for a given voice.
   * If the voice is already playing, toggles to pause.
   * If another voice is playing, stops it and starts the new voice.
   */
  public async play(voiceId: string, url: string): Promise<void> {
    // If the same voice is currently playing, pause/stop it
    if (this.state.voiceId === voiceId && this.state.status === 'playing') {
      this.pause();
      return;
    }

    // Stop and cleanup any previously playing audio
    this.stopCurrentAudio();

    this.state = {
      voiceId,
      status: 'loading',
    };
    this.notify();

    if (typeof Audio === 'undefined') {
      // In non-browser / mock test environments without Audio constructor
      this.state = {
        voiceId,
        status: 'playing',
      };
      this.notify();
      return;
    }

    try {
      const resolvedUrl = resolveAudioUrl(url);
      const audio = new Audio(resolvedUrl);
      audio.preload = 'auto';
      this.currentAudio = audio;

      audio.onplay = () => {
        if (this.state.voiceId === voiceId) {
          this.state = {
            voiceId,
            status: 'playing',
          };
          this.notify();
        }
      };

      audio.onended = () => {
        if (this.state.voiceId === voiceId) {
          this.state = {
            voiceId: null,
            status: 'idle',
          };
          this.currentAudio = null;
          this.notify();
        }
      };

      audio.onerror = () => {
        if (this.state.voiceId === voiceId) {
          this.state = {
            voiceId,
            status: 'error',
            errorMessage: 'Sample audio could not be played',
          };
          this.currentAudio = null;
          this.notify();
        }
      };

      await audio.play();
    } catch (err) {
      if (this.state.voiceId === voiceId) {
        this.state = {
          voiceId,
          status: 'error',
          errorMessage: 'Sample audio could not be played',
        };
        this.currentAudio = null;
        this.notify();
      }
    }
  }

  /**
   * Pauses the currently playing audio.
   */
  public pause(): void {
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
      } catch {
        // Ignore pause errors
      }
    }
    this.state = {
      voiceId: null,
      status: 'idle',
    };
    this.notify();
  }

  /**
   * Completely stops playback and resets state.
   */
  public stop(): void {
    this.stopCurrentAudio();
    this.state = {
      voiceId: null,
      status: 'idle',
    };
    this.notify();
  }

  private stopCurrentAudio(): void {
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
        this.currentAudio.onplay = null;
        this.currentAudio.onended = null;
        this.currentAudio.onerror = null;
      } catch {
        // Ignore cleanup errors
      }
      this.currentAudio = null;
    }
  }
}

// Global shared singleton instance
export const audioPreviewManager = new AudioPreviewManager();
