import { describe, expect, it } from 'vitest';
import {
  DEFAULT_KOKORO_VOICE,
  DEFAULT_PIPER_VOICE,
  DEFAULT_VOICE,
  getDefaultVoiceForEngine,
  getVoiceById,
  getVoicesForEngine,
  KOKORO_VOICES,
  PIPER_VOICES,
  VOICES,
} from '../lib/voices';

describe('voices configuration', () => {
  it('defines default voices for Kokoro and Piper', () => {
    expect(DEFAULT_KOKORO_VOICE).toBe('af_heart');
    expect(DEFAULT_PIPER_VOICE).toBe('en_US-hfc_female-medium');
    expect(DEFAULT_VOICE).toBe(DEFAULT_KOKORO_VOICE);
  });

  it('contains exactly 12 Kokoro voices and 12 Piper voices (24 total)', () => {
    expect(KOKORO_VOICES).toHaveLength(12);
    expect(PIPER_VOICES).toHaveLength(12);
    expect(VOICES).toHaveLength(24);
  });

  it('validates that every voice has required metadata and valid previewUrl', () => {
    for (const v of VOICES) {
      expect(v.id).toBeTruthy();
      expect(v.name).toBeTruthy();
      expect(['kokoro', 'piper']).toContain(v.engine);
      expect(['Female', 'Male']).toContain(v.gender);
      expect(['American', 'British']).toContain(v.accent);
      expect(v.style).toBeTruthy();
      expect(v.previewUrl).toMatch(/^https:\/\//);
    }
  });

  it('resolves correct default voice for each engine', () => {
    expect(getDefaultVoiceForEngine('kokoro')).toBe(DEFAULT_KOKORO_VOICE);
    expect(getDefaultVoiceForEngine('piper')).toBe(DEFAULT_PIPER_VOICE);
  });

  it('filters voices correctly using getVoicesForEngine', () => {
    const kokoroList = getVoicesForEngine('kokoro');
    expect(kokoroList).toHaveLength(12);
    expect(kokoroList.every((v) => v.engine === 'kokoro')).toBe(true);

    const piperList = getVoicesForEngine('piper');
    expect(piperList).toHaveLength(12);
    expect(piperList.every((v) => v.engine === 'piper')).toBe(true);
  });

  it('retrieves specific voices by ID using getVoiceById', () => {
    const heart = getVoiceById('af_heart');
    expect(heart).toBeDefined();
    expect(heart?.name).toBe('Heart');
    expect(heart?.engine).toBe('kokoro');

    const hfc = getVoiceById('en_US-hfc_female-medium');
    expect(hfc).toBeDefined();
    expect(hfc?.name).toBe('HFC Female');
    expect(hfc?.engine).toBe('piper');

    const nonExistent = getVoiceById('invalid_id');
    expect(nonExistent).toBeUndefined();
  });
});
