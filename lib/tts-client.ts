import { mapErrorToMessage } from './errors';

type ProgressCallback = (status: string) => void;

interface GenerateResult {
  audio: Float32Array;
  sampleRate: number;
}

export class TTSClient {
  private worker: Worker;
  private messageIdCounter = 0;
  private pendingRequests = new Map<number, { resolve: (val: any) => void, reject: (err: any) => void }>();
  private progressCallback?: ProgressCallback;

  constructor() {
    this.worker = new Worker(new URL('./tts.worker.ts', import.meta.url), { type: 'module' });
    this.worker.onmessage = (e) => {
      const data = e.data;
      if (data.type === 'progress') {
        if (this.progressCallback && data.progress?.status) {
          this.progressCallback(data.progress.status);
        }
      } else if (data.type === 'audio' || data.type === 'loaded') {
        const req = this.pendingRequests.get(data.id);
        if (req) {
          this.pendingRequests.delete(data.id);
          req.resolve(data);
        }
      } else if (data.type === 'error') {
        const req = this.pendingRequests.get(data.id);
        if (req) {
          this.pendingRequests.delete(data.id);
          req.reject(new Error(data.error));
        }
      }
    };
  }

  onProgress(callback: ProgressCallback) {
    this.progressCallback = callback;
  }

  async load(): Promise<void> {
    return new Promise((resolve, reject) => {
      const id = ++this.messageIdCounter;
      this.pendingRequests.set(id, { resolve, reject });
      this.worker.postMessage({ type: 'load', id });
    }).catch(err => {
      throw new Error(mapErrorToMessage(err));
    }) as Promise<void>;
  }

  async generate(text: string, voiceId: string, readingId: string): Promise<GenerateResult> {
    return new Promise((resolve, reject) => {
      const id = ++this.messageIdCounter;
      this.pendingRequests.set(id, { resolve, reject });
      this.worker.postMessage({ type: 'generate', id, text, voiceId, readingId });
    }).catch(err => {
      throw new Error(mapErrorToMessage(err));
    }) as Promise<GenerateResult>;
  }
}

// Export a singleton instance
export const ttsClient = new TTSClient();
