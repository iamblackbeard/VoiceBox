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
      engine: 'piper',
      hasWebGpu: true,
      checkedAt: 12345678,
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
    };

    const updated = await saveEnginePreference('piper');
    expect(updated.engine).toBe('piper');
    expect(mockStorage[SETTINGS_STORAGE_KEY].engine).toBe('piper');
  });
});
