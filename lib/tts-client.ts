import { mapErrorToMessage } from './errors';
import type { TTSEngine } from './settings';

export type ProgressCallback = (status: string) => void;

export interface GenerateResult {
  audio: Float32Array;
  sampleRate: number;
  engine?: TTSEngine;
}

export class TTSClient {
  private worker: Worker | null = null;
  private messageIdCounter = 0;
  private pendingRequests = new Map<
    number,
    { resolve: (val: any) => void; reject: (err: any) => void }
  >();
  private progressCallback?: ProgressCallback;
  private activeEngine: TTSEngine | null = null;

  constructor(worker?: Worker) {
    if (worker) {
      this.worker = worker;
      this.setupWorker();
    } else if (typeof Worker !== 'undefined') {
      this.worker = new Worker(new URL('./tts.worker.ts', import.meta.url), {
        type: 'module',
      });
      this.setupWorker();
    }
  }

  private setupWorker() {
    if (!this.worker) return;

    this.worker.onmessage = (e: MessageEvent) => {
      const data = e.data || {};
      if (data.type === 'progress') {
        if (this.progressCallback) {
          const status =
            data.progress?.status ||
            (typeof data.progress === 'string' ? data.progress : 'loading');
          this.progressCallback(status);
        }
      } else if (
        data.type === 'audio' ||
        data.type === 'loaded' ||
        data.type === 'unloaded'
      ) {
        if (data.type === 'loaded') {
          this.activeEngine = data.engine ?? this.activeEngine;
        } else if (data.type === 'unloaded') {
          this.activeEngine = null;
        }
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

  private ensureWorker(): Worker {
    if (!this.worker) {
      if (typeof Worker === 'undefined') {
        throw new Error('Web Worker is not supported in this environment');
      }
      this.worker = new Worker(new URL('./tts.worker.ts', import.meta.url), {
        type: 'module',
      });
      this.setupWorker();
    }
    return this.worker;
  }

  getActiveEngine(): TTSEngine | null {
    return this.activeEngine;
  }

  onProgress(callback: ProgressCallback) {
    this.progressCallback = callback;
  }

  async load(engine: TTSEngine = 'kokoro', voiceId?: string): Promise<void> {
    const worker = this.ensureWorker();
    return new Promise((resolve, reject) => {
      const id = ++this.messageIdCounter;
      this.pendingRequests.set(id, { resolve, reject });
      worker.postMessage({ type: 'load', id, engine, voiceId });
    })
      .then((data: any) => {
        this.activeEngine = data?.engine ?? engine;
      })
      .catch((err) => {
        throw new Error(mapErrorToMessage(err));
      }) as Promise<void>;
  }

  async unload(): Promise<void> {
    const worker = this.ensureWorker();
    return new Promise((resolve, reject) => {
      const id = ++this.messageIdCounter;
      this.pendingRequests.set(id, { resolve, reject });
      worker.postMessage({ type: 'unload', id });
    })
      .then(() => {
        this.activeEngine = null;
      })
      .catch((err) => {
        throw new Error(mapErrorToMessage(err));
      }) as Promise<void>;
  }

  async generate(
    text: string,
    voiceId: string,
    readingId: string,
    engine?: TTSEngine
  ): Promise<GenerateResult> {
    const worker = this.ensureWorker();
    return new Promise((resolve, reject) => {
      const id = ++this.messageIdCounter;
      this.pendingRequests.set(id, { resolve, reject });
      worker.postMessage({
        type: 'generate',
        id,
        text,
        voiceId,
        readingId,
        engine,
      });
    })
      .then((data: any) => {
        if (data?.engine) {
          this.activeEngine = data.engine;
        } else if (engine) {
          this.activeEngine = engine;
        }
        return data as GenerateResult;
      })
      .catch((err) => {
        throw new Error(mapErrorToMessage(err));
      }) as Promise<GenerateResult>;
  }
}

// Export a singleton instance
export const ttsClient = new TTSClient();
