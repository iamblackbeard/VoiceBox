import { KokoroTTS } from 'kokoro-js';
import { env } from '@huggingface/transformers';

// Point ONNX Runtime (via Transformers.js) to the local WASM files instead of CDN
env.backends.onnx.wasm!.wasmPaths = '/ort/';

const MODEL_ID = 'onnx-community/Kokoro-82M-v1.0-ONNX';

let ttsInstance: KokoroTTS | null = null;
let loadingPromise: Promise<KokoroTTS> | null = null;

async function getTTS(progress_callback?: (progress: any) => void) {
  if (ttsInstance) return ttsInstance;
  if (!loadingPromise) {
    loadingPromise = KokoroTTS.from_pretrained(MODEL_ID, {
      dtype: 'q8',
      device: 'wasm',
      progress_callback
    }).then(instance => {
      ttsInstance = instance;
      return instance;
    });
  }
  return loadingPromise;
}

self.onmessage = async (e: MessageEvent) => {
  const { type, id, text, voiceId, readingId } = e.data;

  try {
    if (type === 'load') {
      await getTTS((progress) => {
        self.postMessage({ type: 'progress', progress });
      });
      self.postMessage({ type: 'loaded', id });
    } else if (type === 'generate') {
      const tts = await getTTS();
      // tts.generate returns a Promise that resolves to the generated audio data
      const audio = await tts.generate(text, { voice: voiceId });
      self.postMessage({
        type: 'audio',
        id,
        readingId,
        audio: audio.audio,
        sampleRate: audio.sampling_rate
      });
    }
  } catch (error: any) {
    console.error("Worker caught error:", error);
    self.postMessage({ type: 'error', id, error: error.message || String(error) });
  }
};
