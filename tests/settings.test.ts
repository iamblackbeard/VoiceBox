import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { checkWebGpu } from '../lib/hardware';
import {
  getOrInitializeSettings,
  saveEnginePreference,
  SETTINGS_STORAGE_KEY,
} from '../lib/settings';

describe('checkWebGpu', () => {
  const originalNavigator = globalThis.navigator;

  afterEach(() => {
    Object.defineProperty(globalThis, 'navigator', {
      value: originalNavigator,
      configurable: true,
      writable: true,
    });
  });

  it('returns false when navigator.gpu is not available', async () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: {},
      configurable: true,
      writable: true,
    });
    const result = await checkWebGpu(50);
    expect(result).toBe(false);
  });

  it('returns true when navigator.gpu.requestAdapter resolves with an adapter', async () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: {
        gpu: {
          requestAdapter: vi.fn().mockResolvedValue({}),
        },
      },
      configurable: true,
      writable: true,
    });
    const result = await checkWebGpu(50);
    expect(result).toBe(true);
  });

  it('returns false when navigator.gpu.requestAdapter resolves with null', async () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: {
        gpu: {
          requestAdapter: vi.fn().mockResolvedValue(null),
        },
      },
      configurable: true,
      writable: true,
    });
    const result = await checkWebGpu(50);
    expect(result).toBe(false);
  });

  it('returns false when requestAdapter rejects', async () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: {
        gpu: {
          requestAdapter: vi.fn().mockRejectedValue(new Error('GPU failed')),
        },
      },
      configurable: true,
      writable: true,
    });
    const result = await checkWebGpu(50);
    expect(result).toBe(false);
  });

  it('returns false when requestAdapter times out', async () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: {
        gpu: {
          requestAdapter: vi.fn().mockReturnValue(new Promise(() => {})), // hangs
        },
      },
      configurable: true,
      writable: true,
    });
    const result = await checkWebGpu(20);
    expect(result).toBe(false);
  });
});

describe('getOrInitializeSettings and saveEnginePreference', () => {
  let mockStorage: Record<string, any> = {};

  beforeEach(() => {
    mockStorage = {};
    (globalThis as any).browser = {
      storage: {
        local: {
          get: vi.fn(async (key: string) => ({ [key]: mockStorage[key] })),
          set: vi.fn(async (items: Record<string, any>) => {
            Object.assign(mockStorage, items);
          }),
        },
      },
    };
  });

  afterEach(() => {
    delete (globalThis as any).browser;
  });

  it('initializes Kokoro when WebGPU is available and no settings cached', async () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: {
        gpu: {
          requestAdapter: vi.fn().mockResolvedValue({}),
        },
      },
      configurable: true,
      writable: true,
    });

    const settings = await getOrInitializeSettings();
    expect(settings.hasWebGpu).toBe(true);
    expect(settings.engine).toBe('kokoro');
    expect(mockStorage[SETTINGS_STORAGE_KEY]).toEqual(settings);
  });

  it('initializes Piper when WebGPU is missing and no settings cached', async () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: {},
      configurable: true,
      writable: true,
    });

    const settings = await getOrInitializeSettings();
    expect(settings.hasWebGpu).toBe(false);
    expect(settings.engine).toBe('piper');
    expect(mockStorage[SETTINGS_STORAGE_KEY]).toEqual(settings);
  });

  it('returns cached settings if already present without probing', async () => {
    const cached = {
      engine: 'piper' as const,
      hasWebGpu: true,
      checkedAt: 12345678,
      voicePreferences: {
        activeVoice: { kokoro: 'af_bella', piper: 'en_US-lessac-medium' },
        favorites: { kokoro: ['af_bella'], piper: ['en_US-lessac-medium'] },
      },
    };
    mockStorage[SETTINGS_STORAGE_KEY] = cached;

    // Even if navigator.gpu would say true, cached is returned
    const settings = await getOrInitializeSettings();
    expect(settings).toEqual(cached);
  });

  it('saveEnginePreference updates and persists selected engine', async () => {
    mockStorage[SETTINGS_STORAGE_KEY] = {
      engine: 'kokoro',
      hasWebGpu: true,
      checkedAt: 100,
      voicePreferences: {
        activeVoice: { kokoro: 'af_heart', piper: 'en_US-hfc_female-medium' },
        favorites: { kokoro: ['af_heart'], piper: ['en_US-hfc_female-medium'] },
      },
    };

    const updated = await saveEnginePreference('piper');
    expect(updated.engine).toBe('piper');
    expect(mockStorage[SETTINGS_STORAGE_KEY].engine).toBe('piper');
  });

  it('initializes default voice preferences when initializing fresh settings', async () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: {},
      configurable: true,
      writable: true,
    });

    const settings = await getOrInitializeSettings();
    expect(settings.voicePreferences).toBeDefined();
    expect(settings.voicePreferences.activeVoice.kokoro).toBe('af_heart');
    expect(settings.voicePreferences.activeVoice.piper).toBe('en_US-hfc_female-medium');
    expect(settings.voicePreferences.favorites.kokoro).toEqual(['af_heart']);
    expect(settings.voicePreferences.favorites.piper).toEqual(['en_US-hfc_female-medium']);
  });

  it('migrates legacy settings without voicePreferences to include default voice preferences', async () => {
    mockStorage[SETTINGS_STORAGE_KEY] = {
      engine: 'piper',
      hasWebGpu: false,
      checkedAt: 99999,
    };

    const settings = await getOrInitializeSettings();
    expect(settings.engine).toBe('piper');
    expect(settings.voicePreferences).toBeDefined();
    expect(settings.voicePreferences.activeVoice.piper).toBe('en_US-hfc_female-medium');
    expect(mockStorage[SETTINGS_STORAGE_KEY].voicePreferences).toBeDefined();
  });

  it('saveActiveVoice updates and persists active voice for specified engine', async () => {
    mockStorage[SETTINGS_STORAGE_KEY] = {
      engine: 'kokoro',
      hasWebGpu: true,
      checkedAt: 100,
      voicePreferences: {
        activeVoice: { kokoro: 'af_heart', piper: 'en_US-hfc_female-medium' },
        favorites: { kokoro: ['af_heart'], piper: ['en_US-hfc_female-medium'] },
      },
    };

    const { saveActiveVoice } = await import('../lib/settings');
    const updated = await saveActiveVoice('kokoro', 'af_bella');
    expect(updated.voicePreferences.activeVoice.kokoro).toBe('af_bella');
    expect(mockStorage[SETTINGS_STORAGE_KEY].voicePreferences.activeVoice.kokoro).toBe('af_bella');
    // Piper voice remains untouched
    expect(updated.voicePreferences.activeVoice.piper).toBe('en_US-hfc_female-medium');
  });

  it('toggleFavoriteVoice adds and removes voice favorites', async () => {
    mockStorage[SETTINGS_STORAGE_KEY] = {
      engine: 'kokoro',
      hasWebGpu: true,
      checkedAt: 100,
      voicePreferences: {
        activeVoice: { kokoro: 'af_heart', piper: 'en_US-hfc_female-medium' },
        favorites: { kokoro: ['af_heart'], piper: ['en_US-hfc_female-medium'] },
      },
    };

    const { toggleFavoriteVoice } = await import('../lib/settings');

    // Add a second favorite
    const res1 = await toggleFavoriteVoice('kokoro', 'af_bella');
    expect(res1.added).toBe(true);
    expect(res1.settings.voicePreferences.favorites.kokoro).toEqual(['af_heart', 'af_bella']);

    // Remove af_bella
    const res2 = await toggleFavoriteVoice('kokoro', 'af_bella');
    expect(res2.added).toBe(false);
    expect(res2.settings.voicePreferences.favorites.kokoro).toEqual(['af_heart']);
  });

  it('toggleFavoriteVoice enforces the 5-favorite maximum limit', async () => {
    mockStorage[SETTINGS_STORAGE_KEY] = {
      engine: 'kokoro',
      hasWebGpu: true,
      checkedAt: 100,
      voicePreferences: {
        activeVoice: { kokoro: 'af_heart', piper: 'en_US-hfc_female-medium' },
        favorites: {
          kokoro: ['v1', 'v2', 'v3', 'v4', 'v5'],
          piper: ['en_US-hfc_female-medium'],
        },
      },
    };

    const { toggleFavoriteVoice } = await import('../lib/settings');
    const res = await toggleFavoriteVoice('kokoro', 'v6');
    expect(res.added).toBe(false);
    expect(res.error).toBeDefined();
    expect(res.settings.voicePreferences.favorites.kokoro).toHaveLength(5);
  });
});

