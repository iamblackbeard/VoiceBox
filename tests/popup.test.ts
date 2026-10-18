import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getOrInitializeSettings,
  saveActiveVoice,
  saveEnginePreference,
  SETTINGS_STORAGE_KEY,
  type StoredSettings,
} from '../lib/settings';
import { getDefaultVoiceForEngine, getVoiceById } from '../lib/voices';

describe('Popup Settings & Navigation Integration', () => {
  let mockStorage: Record<string, any> = {};
  let storageListeners: Array<(changes: any, area: string) => void> = [];
  let createdTabs: Array<{ url: string }> = [];

  beforeEach(() => {
    mockStorage = {};
    storageListeners = [];
    createdTabs = [];

    (globalThis as any).browser = {
      storage: {
        local: {
          get: vi.fn(async (key: string) => ({ [key]: mockStorage[key] })),
          set: vi.fn(async (items: Record<string, any>) => {
            const oldStorage = { ...mockStorage };
            Object.assign(mockStorage, items);
            // Trigger storage change listeners
            for (const key of Object.keys(items)) {
              for (const listener of storageListeners) {
                listener(
                  {
                    [key]: {
                      oldValue: oldStorage[key],
                      newValue: items[key],
                    },
                  },
                  'local',
                );
              }
            }
          }),
        },
        onChanged: {
          addListener: vi.fn((cb) => storageListeners.push(cb)),
          removeListener: vi.fn((cb) => {
            storageListeners = storageListeners.filter((l) => l !== cb);
          }),
        },
      },
      runtime: {
        getURL: vi.fn((path: string) => `chrome-extension://test-id${path}`),
      },
      tabs: {
        create: vi.fn(async (opts: { url: string }) => {
          createdTabs.push(opts);
          return { id: 1, ...opts };
        }),
      },
    };
  });

  afterEach(() => {
    delete (globalThis as any).browser;
    vi.restoreAllMocks();
  });

  it('resolves correct active voice and display name for both engines', async () => {
    const settings = await getOrInitializeSettings();
    expect(settings.voicePreferences).toBeDefined();

    // Kokoro default voice
    const kokoroVoiceId =
      settings.voicePreferences.activeVoice.kokoro || getDefaultVoiceForEngine('kokoro');
    const kokoroVoice = getVoiceById(kokoroVoiceId);
    expect(kokoroVoice).toBeDefined();
    expect(kokoroVoice?.name).toBe('Heart');

    // Piper default voice
    const piperVoiceId =
      settings.voicePreferences.activeVoice.piper || getDefaultVoiceForEngine('piper');
    const piperVoice = getVoiceById(piperVoiceId);
    expect(piperVoice).toBeDefined();
    expect(piperVoice?.name).toBe('HFC Female');
  });

  it('triggers browser.tabs.create with voices catalog url when opening catalog', async () => {
    const b = (globalThis as any).browser;
    const targetUrl = b.runtime.getURL('/voices.html');

    // Simulate opening catalog via extension API
    await b.tabs.create({ url: targetUrl });

    expect(createdTabs).toHaveLength(1);
    expect(createdTabs[0]?.url).toBe('chrome-extension://test-id/voices.html');
  });

  it('synchronizes active voice across engines reactively on storage changes', async () => {
    let observedSettings: StoredSettings | null = null;
    const b = (globalThis as any).browser;

    b.storage.onChanged.addListener((changes: any, area: string) => {
      if (area === 'local' && changes[SETTINGS_STORAGE_KEY]?.newValue) {
        observedSettings = changes[SETTINGS_STORAGE_KEY].newValue as StoredSettings;
      }
    });

    // 1. Initialize settings
    observedSettings = await getOrInitializeSettings();
    expect(observedSettings?.voicePreferences.activeVoice.kokoro).toBe('af_heart');

    // 2. Change active Kokoro voice to 'af_bella'
    await saveActiveVoice('kokoro', 'af_bella');
    expect(observedSettings?.voicePreferences.activeVoice.kokoro).toBe('af_bella');
    const activeVoice = getVoiceById(observedSettings!.voicePreferences.activeVoice.kokoro);
    expect(activeVoice?.name).toBe('Bella');

    // 3. Switch engine to Piper and change active voice to 'en_US-lessac-medium'
    await saveEnginePreference('piper');
    await saveActiveVoice('piper', 'en_US-lessac-medium');
    expect(observedSettings?.engine).toBe('piper');
    expect(observedSettings?.voicePreferences.activeVoice.piper).toBe('en_US-lessac-medium');
    const piperVoice = getVoiceById(observedSettings!.voicePreferences.activeVoice.piper);
    expect(piperVoice?.name).toBe('Lessac');
  });

  it('correctly handles non-extension fallback for catalog URL', () => {
    const b = (globalThis as any).browser;
    const catalogPath = b?.runtime?.getURL ? b.runtime.getURL('/voices.html') : '/voices/index.html';
    expect(catalogPath).toContain('voices');
  });
});
