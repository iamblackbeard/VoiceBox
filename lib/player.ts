import { browser } from 'wxt/browser';
import { ttsClient } from './tts-client';
import { DEFAULT_VOICE } from './voices';

export type PlayerStatus = 'idle' | 'downloading' | 'buffering' | 'playing' | 'paused' | 'ended' | 'error';

export interface PlayerState {
  status: PlayerStatus;
  message: string | null;
}

export type StateListener = (state: PlayerState) => void;

function floatTo16BitPCM(output: DataView, offset: number, input: Float32Array) {
  for (let i = 0; i < input.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, input[i] as number));
    output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

export function encodeWAV(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  /* RIFF identifier */
  writeString(view, 0, 'RIFF');
  /* RIFF chunk length */
  view.setUint32(4, 36 + samples.length * 2, true);
  /* RIFF type */
  writeString(view, 8, 'WAVE');
  /* format chunk identifier */
  writeString(view, 12, 'fmt ');
  /* format chunk length */
  view.setUint32(16, 16, true);
  /* sample format (raw) */
  view.setUint16(20, 1, true);
  /* channel count */
  view.setUint16(22, 1, true);
  /* sample rate */
  view.setUint32(24, sampleRate, true);
  /* byte rate (sample rate * block align) */
  view.setUint32(28, sampleRate * 2, true);
  /* block align (channel count * bytes per sample) */
  view.setUint16(32, 2, true);
  /* bits per sample */
  view.setUint16(34, 16, true);
  /* data chunk identifier */
  writeString(view, 36, 'data');
  /* data chunk length */
  view.setUint32(40, samples.length * 2, true);

  floatTo16BitPCM(view, 44, samples);

  return new Blob([view], { type: 'audio/wav' });
}

export class Player {
  private status: PlayerStatus = 'idle';
  private message: string | null = null;
  private listeners: StateListener[] = [];
  
  private chunks: string[] = [];
  private readingId: string = '';
  private currentIndex = 0;
  private audioElement = new Audio();

  constructor() {
    this.audioElement.onended = () => {
      this.playNextChunk();
    };
    
    ttsClient.onProgress((msg) => {
      if (this.status !== 'playing' && this.status !== 'paused') {
        this.updateState('downloading', 'Downloading the voice ....');
      }
    });
  }

  subscribe(listener: StateListener) {
    this.listeners.push(listener);
    listener(this.getState());
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private updateState(status: PlayerStatus, message: string | null = null) {
    this.status = status;
    this.message = message;
    const state = this.getState();
    this.listeners.forEach(l => l(state));
  }

  private getState(): PlayerState {
    return { status: this.status, message: this.message };
  }

  private tabId: number | null = null;
  private connection: any = null;

  async play(chunks: string[], readingId: string, tabId: number) {
    this.chunks = chunks;
    this.readingId = readingId;
    this.currentIndex = 0;
    this.audioElement.pause();
    
    // Connect to the tab to allow clearing on panel close.
    // If it's a new tab, disconnect the old one. If it's the same tab,
    // reuse the connection so we don't trigger a disconnect event that
    // wipes out the new selection's chunkRanges.
    if (this.connection && this.tabId !== tabId) {
      this.connection.disconnect();
      this.connection = null;
    }
    
    this.tabId = tabId;

    if (!this.connection) {
      try {
        this.connection = browser.tabs.connect(tabId);
      } catch (e) {
        // Ignore if tab is closed or connection fails
      }
    }

    if (chunks.length === 0) return;
    
    this.updateState('buffering');

    try {
      await ttsClient.load();
      this.playNextChunk();
    } catch (err: any) {
      this.updateState('error', err.message);
    }
  }

  private async playNextChunk() {
    if (this.currentIndex >= this.chunks.length) {
      this.updateState('ended');
      if (this.tabId !== null) {
        browser.tabs.sendMessage(this.tabId, { type: 'clear' }).catch(() => {});
      }
      return;
    }

    this.updateState('buffering');
    
    const expectedReadingId = this.readingId;
    const expectedIndex = this.currentIndex;

    try {
      const chunkText = this.chunks[this.currentIndex] as string;
      const result = await ttsClient.generate(chunkText, DEFAULT_VOICE, this.readingId);
      
      if (this.readingId !== expectedReadingId || this.currentIndex !== expectedIndex) {
        return;
      }

      const wavBlob = encodeWAV(result.audio, result.sampleRate);
      const url = URL.createObjectURL(wavBlob);
      
      this.audioElement.src = url;
      await this.audioElement.play();
      this.updateState('playing');
      
      if (this.tabId !== null) {
        browser.tabs.sendMessage(this.tabId, { type: 'highlight', chunkIndex: this.currentIndex }).catch(() => {});
      }
      
      this.currentIndex++;
    } catch (err: any) {
      if (this.readingId === expectedReadingId && this.currentIndex === expectedIndex) {
        this.updateState('error', err.message);
      }
    }
  }

  pause() {
    if (this.status === 'playing') {
      this.audioElement.pause();
      this.updateState('paused');
    }
  }

  resume() {
    if (this.status === 'paused') {
      this.audioElement.play();
      this.updateState('playing');
    }
  }
}

export const player = new Player();
