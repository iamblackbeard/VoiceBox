import { describe, expect, it } from 'vitest';
import {
  DEFAULT_KOKORO_VOICE,
  DEFAULT_PIPER_VOICE,
  DEFAULT_VOICE,
  getDefaultVoiceForEngine,
  VOICES,
} from '../lib/voices';

describe('voices configuration', () => {
  it('defines default voices for Kokoro and Piper', () => {
    expect(DEFAULT_KOKORO_VOICE).toBe('af_heart');
    expect(DEFAULT_PIPER_VOICE).toBe('en_US-hfc_female-medium');
    expect(DEFAULT_VOICE).toBe(DEFAULT_KOKORO_VOICE);
  });

  it('lists voices containing both engines', () => {
    const kokoroVoice = VOICES.find((v) => v.engine === 'kokoro');
    const piperVoice = VOICES.find((v) => v.engine === 'piper');

    expect(kokoroVoice).toBeDefined();
    expect(kokoroVoice?.id).toBe(DEFAULT_KOKORO_VOICE);

    expect(piperVoice).toBeDefined();
    expect(piperVoice?.id).toBe(DEFAULT_PIPER_VOICE);
  });

  it('resolves correct default voice for each engine', () => {
    expect(getDefaultVoiceForEngine('kokoro')).toBe(DEFAULT_KOKORO_VOICE);
    expect(getDefaultVoiceForEngine('piper')).toBe(DEFAULT_PIPER_VOICE);
  });
});
