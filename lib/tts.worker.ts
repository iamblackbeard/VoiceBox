import { KokoroTTS } from 'kokoro-js';
import { env } from '@huggingface/transformers';
import { TtsSession } from '@mintplex-labs/piper-tts-web';
import { decodeWAV } from './audio';
import { DEFAULT_KOKORO_VOICE, DEFAULT_PIPER_VOICE } from './voices';
import type { TTSEngine } from './settings';

// Point ONNX Runtime (via Transformers.js) to the local WASM files instead of CDN
env.backends.onnx.wasm!.wasmPaths = '/ort/';

export const KOKORO_MODEL_ID = 'onnx-community/Kokoro-82M-v1.0-ONNX';

let activeEngine: TTSEngine | null = null;
let kokoroInstance: KokoroTTS | null = null;
let kokoroLoadingPromise: Promise<KokoroTTS> | null = null;

let piperSession: TtsSession | null = null;
let piperLoadingPromise: Promise<TtsSession> | null = null;
let piperVoiceId: string | null = null;

export function getActiveEngine(): TTSEngine | null {
  return activeEngine;
}

export function getKokoroInstance(): KokoroTTS | null {
  return kokoroInstance;
}

export function getPiperSession(): TtsSession | null {
  return piperSession;
}

function getAssetUrl(path: string): string {
  try {
    if (typeof (globalThis as any).browser?.runtime?.getURL === 'function') {
      return (globalThis as any).browser.runtime.getURL(path);
    }
    if (typeof (globalThis as any).chrome?.runtime?.getURL === 'function') {
      return (globalThis as any).chrome.runtime.getURL(path);
    }
  } catch {}
  if (typeof self !== 'undefined' && self.location?.origin) {
    return `${self.location.origin}${path.startsWith('/') ? path : '/' + path}`;
  }
  return path;
}

export function getPiperWasmPaths() {
  return {
    onnxWasm: getAssetUrl('/ort/'),
    piperData: getAssetUrl('/piper/piper_phonemize.data'),
    piperWasm: getAssetUrl('/piper/piper_phonemize.wasm'),
  };
}

/**
 * Tears down and unloads any currently active TTS engine from memory.
 * Ensures single-engine mutual exclusion to prevent browser tab RAM bloat.
 */
export async function unloadEngine(): Promise<void> {
  if (kokoroInstance) {
    try {
      (kokoroInstance.model as any)?.dispose?.();
    } catch (e) {
      console.warn('[tts.worker] Error disposing Kokoro model:', e);
    }
    kokoroInstance = null;
  }
  kokoroLoadingPromise = null;

  if (piperSession) {
    try {
      // Piper's TtsSession retains a static singleton reference
      (TtsSession as any)._instance = null;
    } catch (e) {
      console.warn('[tts.worker] Error disposing Piper session:', e);
    }
    piperSession = null;
    piperVoiceId = null;
  }
  piperLoadingPromise = null;

  activeEngine = null;
}

/**
 * Loads the requested TTS engine. If a different engine is currently loaded,
 * it is cleanly unloaded first.
 */
export async function loadEngine(
  engine: TTSEngine,
  voiceId?: string,
  progressCallback?: (progress: any) => void
): Promise<void> {
  if (activeEngine !== null && activeEngine !== engine) {
    await unloadEngine();
  }

  if (engine === 'kokoro') {
    if (!kokoroInstance) {
      if (!kokoroLoadingPromise) {
        kokoroLoadingPromise = KokoroTTS.from_pretrained(KOKORO_MODEL_ID, {
          dtype: 'q8',
          device: 'wasm',
          progress_callback: progressCallback,
        }).then((instance) => {
          kokoroInstance = instance;
          return instance;
        }).finally(() => {
          kokoroLoadingPromise = null;
        });
      }
      await kokoroLoadingPromise;
    }
    activeEngine = 'kokoro';
  } else if (engine === 'piper') {
    const voice = voiceId || DEFAULT_PIPER_VOICE;
    if (!piperSession || piperVoiceId !== voice) {
      if (piperSession && piperVoiceId !== voice) {
        (TtsSession as any)._instance = null;
        piperSession = null;
      }
      if (!piperLoadingPromise) {
        piperLoadingPromise = TtsSession.create({
          voiceId: voice as any,
          progress: (progress) => {
            if (progressCallback) {
              progressCallback({
                status: 'downloading',
                loaded: progress.loaded,
                total: progress.total,
                url: progress.url,
              });
            }
          },
          wasmPaths: getPiperWasmPaths(),
        }).then((session) => {
          piperSession = session;
          piperVoiceId = voice;
          return session;
        }).finally(() => {
          piperLoadingPromise = null;
        });
      }
      await piperLoadingPromise;
    }
    activeEngine = 'piper';
  } else {
    throw new Error(`Unsupported engine: ${engine}`);
  }
}

/**
 * Synthesizes speech for the given text using the specified or active engine.
 */
export async function generateSpeech(
  text: string,
  voiceId?: string,
  engine?: TTSEngine,
  progressCallback?: (progress: any) => void
): Promise<{ audio: Float32Array; sampleRate: number; engine: TTSEngine }> {
  const targetEngine: TTSEngine = engine || activeEngine || 'kokoro';

  if (activeEngine !== targetEngine) {
    await loadEngine(targetEngine, voiceId, progressCallback);
  }

  if (activeEngine === 'kokoro') {
    if (!kokoroInstance) {
      await loadEngine('kokoro', voiceId, progressCallback);
    }
    const voice = voiceId || DEFAULT_KOKORO_VOICE;
    const result = await kokoroInstance!.generate(text, { voice: voice as any });
    return {
      audio: result.audio,
      sampleRate: result.sampling_rate,
      engine: 'kokoro',
    };
  } else if (activeEngine === 'piper') {
    const voice = voiceId || DEFAULT_PIPER_VOICE;
    if (!piperSession || piperVoiceId !== voice) {
      await loadEngine('piper', voice, progressCallback);
    }
    const wavBlob = await piperSession!.predict(text);
    const arrayBuffer = await wavBlob.arrayBuffer();
    const decoded = decodeWAV(arrayBuffer);
    return {
      audio: decoded.audio,
      sampleRate: decoded.sampleRate,
      engine: 'piper',
    };
  }

  throw new Error(`Unsupported engine: ${activeEngine}`);
}

// Attach listener in Web Worker environment
if (typeof self !== 'undefined' && 'postMessage' in self) {
  self.onmessage = async (e: MessageEvent) => {
    const { type, id, text, voiceId, readingId, engine } = e.data || {};

    try {
      if (type === 'load') {
        const targetEngine: TTSEngine = engine || 'kokoro';
        await loadEngine(targetEngine, voiceId, (progress) => {
          self.postMessage({ type: 'progress', progress, engine: targetEngine });
        });
        self.postMessage({ type: 'loaded', id, engine: activeEngine });
      } else if (type === 'unload') {
        await unloadEngine();
        self.postMessage({ type: 'unloaded', id });
      } else if (type === 'generate') {
        const result = await generateSpeech(text, voiceId, engine, (progress) => {
          self.postMessage({ type: 'progress', progress, engine: activeEngine });
        });
        self.postMessage({
          type: 'audio',
          id,
          readingId,
          audio: result.audio,
          sampleRate: result.sampleRate,
          engine: result.engine,
        });
      }
    } catch (error: any) {
      console.error('[tts.worker] Worker caught error:', error);
      self.postMessage({ type: 'error', id, error: error.message || String(error) });
    }
  };
}
