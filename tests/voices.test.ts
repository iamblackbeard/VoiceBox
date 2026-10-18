import { describe, expect, it } from 'vitest';
import {
  DEFAULT_KOKORO_VOICE,
  DEFAULT_PIPER_VOICE,
  DEFAULT_VOICE,
  formatPopupVoiceList,
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

describe('formatPopupVoiceList dynamic formatting', () => {
  const kokoroFavs = ['af_heart', 'af_bella', 'af_nicole', 'af_sarah', 'af_sky'];

  it('returns only favorites when active voice is already in favorites', () => {
    const result = formatPopupVoiceList('kokoro', 'af_bella', kokoroFavs);
    expect(result.favorites).toHaveLength(5);
    expect(result.unpinned).toBeUndefined();
    expect(result.totalCount).toBe(5);
    expect(result.favorites.map((v) => v.id)).toEqual(kokoroFavs);
  });

  it('returns 5 favorites + 1 unpinned active voice when active voice is unpinned', () => {
    // am_adam is a Kokoro voice NOT in kokoroFavs
    const result = formatPopupVoiceList('kokoro', 'am_adam', kokoroFavs);
    expect(result.favorites).toHaveLength(5);
    expect(result.unpinned).toBeDefined();
    expect(result.unpinned?.id).toBe('am_adam');
    expect(result.unpinned?.name).toBe('Adam');
    expect(result.totalCount).toBe(6);
  });

  it('automatically dismisses the unpinned voice when switching active voice to a favorite', () => {
    // 1. Initially with unpinned voice (am_adam)
    const initial = formatPopupVoiceList('kokoro', 'am_adam', kokoroFavs);
    expect(initial.totalCount).toBe(6);
    expect(initial.unpinned?.id).toBe('am_adam');

    // 2. User selects one of the 5 favorites (e.g. af_heart)
    const afterSwitch = formatPopupVoiceList('kokoro', 'af_heart', kokoroFavs);
    expect(afterSwitch.totalCount).toBe(5);
    expect(afterSwitch.unpinned).toBeUndefined();
  });

  it('caps favorites at 5 and filters out voices from a different engine', () => {
    const mixedIds = [
      'af_heart',
      'en_US-hfc_female-medium', // Piper voice (should be filtered out for kokoro)
      'af_bella',
      'af_nicole',
      'af_sarah',
      'af_sky',
      'am_adam', // 6th kokoro voice (should be capped at 5)
    ];

    const result = formatPopupVoiceList('kokoro', 'af_heart', mixedIds);
    expect(result.favorites).toHaveLength(5);
    expect(result.favorites.every((v) => v.engine === 'kokoro')).toBe(true);
    expect(result.favorites.map((v) => v.id)).toEqual([
      'af_heart',
      'af_bella',
      'af_nicole',
      'af_sarah',
      'af_sky',
    ]);
  });

  it('formats Piper voice lists correctly', () => {
    const piperFavs = [
      'en_US-hfc_female-medium',
      'en_US-lessac-medium',
      'en_US-amy-medium',
    ];
    // Active voice is unpinned piper voice
    const result = formatPopupVoiceList('piper', 'en_GB-alba-medium', piperFavs);
    expect(result.favorites).toHaveLength(3);
    expect(result.unpinned?.id).toBe('en_GB-alba-medium');
    expect(result.totalCount).toBe(4);
  });
});

