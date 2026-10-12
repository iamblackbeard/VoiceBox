import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { mockKokoroModel, mockKokoroInstance, mockPiperSession, setPiperWavBlob } =
  vi.hoisted(() => {
    const model = {
      dispose: vi.fn(),
    };

    const kokoro = {
      model,
      generate: vi.fn().mockResolvedValue({
        audio: new Float32Array([0.1, 0.2, 0.3]),
        sampling_rate: 24000,
      }),
    };

    let wavBlob: Blob = new Blob([]);

    const piper = {
      predict: vi.fn().mockImplementation(() => Promise.resolve(wavBlob)),
    };

    return {
      mockKokoroModel: model,
      mockKokoroInstance: kokoro,
      mockPiperSession: piper,
      setPiperWavBlob: (blob: Blob) => {
        wavBlob = blob;
      },
    };
  });

vi.mock('kokoro-js', () => ({
  KokoroTTS: {
    from_pretrained: vi.fn().mockResolvedValue(mockKokoroInstance),
  },
}));

vi.mock('@huggingface/transformers', () => ({
  env: {
    backends: {
      onnx: {
        wasm: {},
      },
    },
  },
}));

vi.mock('@mintplex-labs/piper-tts-web', () => {
  class MockTtsSession {
    static _instance: any = null;
    static create = vi.fn().mockResolvedValue(mockPiperSession);
  }
  return {
    TtsSession: MockTtsSession,
  };
});

import { encodeWAV } from '../lib/audio';
import {
  generateSpeech,
  getActiveEngine,
  getKokoroInstance,
  getPiperSession,
  loadEngine,
  unloadEngine,
} from '../lib/tts.worker';
import { TtsSession } from '@mintplex-labs/piper-tts-web';

describe('Unified TTS Worker memory management & engine switching', () => {
  beforeEach(async () => {
    await unloadEngine();
    vi.clearAllMocks();

    const sampleBlob = encodeWAV(new Float32Array([0.4, 0.5, 0.6]), 22050);
    setPiperWavBlob(sampleBlob);
  });

  afterEach(async () => {
    await unloadEngine();
  });

  it('starts with no active engine in memory', () => {
    expect(getActiveEngine()).toBeNull();
    expect(getKokoroInstance()).toBeNull();
    expect(getPiperSession()).toBeNull();
  });

  it('loads Kokoro and initializes instance in memory', async () => {
    await loadEngine('kokoro');

    expect(getActiveEngine()).toBe('kokoro');
    expect(getKokoroInstance()).toBe(mockKokoroInstance);
    expect(getPiperSession()).toBeNull();
  });

  it('enforces single-engine mutual exclusion when switching from Kokoro to Piper', async () => {
    // 1. Load Kokoro first
    await loadEngine('kokoro');
    expect(getActiveEngine()).toBe('kokoro');
    expect(getKokoroInstance()).not.toBeNull();

    // 2. Switch to Piper -> must dispose Kokoro first
    await loadEngine('piper');

    expect(mockKokoroModel.dispose).toHaveBeenCalled();
    expect(getKokoroInstance()).toBeNull(); // Kokoro unloaded from RAM
    expect(getActiveEngine()).toBe('piper');
    expect(getPiperSession()).toBe(mockPiperSession);
  });

  it('enforces single-engine mutual exclusion when switching from Piper back to Kokoro', async () => {
    // 1. Load Piper first
    await loadEngine('piper');
    expect(getActiveEngine()).toBe('piper');
    expect(getPiperSession()).not.toBeNull();

    // 2. Switch back to Kokoro -> must clear Piper instance and static singleton
    await loadEngine('kokoro');

    expect((TtsSession as any)._instance).toBeNull();
    expect(getPiperSession()).toBeNull(); // Piper unloaded from RAM
    expect(getActiveEngine()).toBe('kokoro');
    expect(getKokoroInstance()).toBe(mockKokoroInstance);
  });

  it('unloadEngine clears all engines and resets state completely', async () => {
    await loadEngine('piper');
    expect(getActiveEngine()).toBe('piper');

    await unloadEngine();

    expect(getActiveEngine()).toBeNull();
    expect(getPiperSession()).toBeNull();
    expect(getKokoroInstance()).toBeNull();
  });

  it('synthesizes speech with Kokoro and returns expected audio structure', async () => {
    const result = await generateSpeech('Kokoro test', 'af_heart', 'kokoro');

    expect(result.engine).toBe('kokoro');
    expect(result.sampleRate).toBe(24000);
    expect(result.audio).toBeInstanceOf(Float32Array);
    expect(result.audio.length).toBe(3);
  });

  it('synthesizes speech with Piper, decodes WAV, and returns expected audio structure', async () => {
    const result = await generateSpeech('Piper test', 'en_US-hfc_female-medium', 'piper');

    expect(result.engine).toBe('piper');
    expect(result.sampleRate).toBe(22050);
    expect(result.audio).toBeInstanceOf(Float32Array);
    expect(result.audio.length).toBe(3);
    // Values converted from mock WAV samples [0.4, 0.5, 0.6]
    expect(result.audio[0]).toBeCloseTo(0.4, 2);
    expect(result.audio[1]).toBeCloseTo(0.5, 2);
    expect(result.audio[2]).toBeCloseTo(0.6, 2);
  });
});
