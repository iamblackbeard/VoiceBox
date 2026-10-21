import { checkWebGpu } from './hardware';
import {
  DEFAULT_KOKORO_VOICE,
  DEFAULT_PIPER_VOICE,
} from './voices';

export type TTSEngine = 'kokoro' | 'piper';

export interface VoicePreferences {
  activeVoice: {
    kokoro: string; // e.g. 'af_heart'
    piper: string;  // e.g. 'en_US-hfc_female-medium'
  };
  favorites: {
    kokoro: string[]; // Max 5 voice IDs, defaults to ['af_heart']
    piper: string[];  // Max 5 voice IDs, defaults to ['en_US-hfc_female-medium']
  };
}

export interface EngineSettings {
  engine: TTSEngine;      // Currently active TTS engine ('kokoro' | 'piper')
  hasWebGpu: boolean;     // Cached WebGPU hardware capability
  checkedAt: number;      // Epoch timestamp when hardware was probed
}

export type TabCloseAction = 'stop' | 'continue';

export interface StoredSettings extends EngineSettings {
  voicePreferences: VoicePreferences;
  /** What happens when the originating tab is closed while audio plays. */
  onTabCloseAction: TabCloseAction;
}


export const SETTINGS_STORAGE_KEY = 'engine_settings';
export const MAX_FAVORITES_PER_ENGINE = 5;
export const DEFAULT_TAB_CLOSE_ACTION: TabCloseAction = 'continue';

export const DEFAULT_VOICE_PREFERENCES: VoicePreferences = {
  activeVoice: {
    kokoro: DEFAULT_KOKORO_VOICE,
    piper: DEFAULT_PIPER_VOICE,
  },
  favorites: {
    kokoro: [DEFAULT_KOKORO_VOICE],
    piper: [DEFAULT_PIPER_VOICE],
  },
};

function getBrowser(): any {
  if (typeof browser !== 'undefined' && browser?.storage) return browser;
  if (typeof globalThis !== 'undefined' && (globalThis as any).browser) return (globalThis as any).browser;
  if (typeof (globalThis as any).chrome !== 'undefined') return (globalThis as any).chrome;
  return undefined;
}

/**
 * Returns saved engine and voice settings, or inspects hardware and initializes default settings
 * if not yet cached in browser.storage.local.
 */
export async function getOrInitializeSettings(): Promise<StoredSettings> {
  const b = getBrowser();
  try {
    const stored = await b?.storage?.local?.get(SETTINGS_STORAGE_KEY);
    const existing = stored?.[SETTINGS_STORAGE_KEY] as any;

    if (
      existing &&
      (existing.engine === 'kokoro' || existing.engine === 'piper') &&
      typeof existing.hasWebGpu === 'boolean'
    ) {
      // Ensure voicePreferences is present and properly shaped
      const voicePreferences: VoicePreferences = {
        activeVoice: {
          kokoro: existing.voicePreferences?.activeVoice?.kokoro || DEFAULT_KOKORO_VOICE,
          piper: existing.voicePreferences?.activeVoice?.piper || DEFAULT_PIPER_VOICE,
        },
        favorites: {
          kokoro:
            Array.isArray(existing.voicePreferences?.favorites?.kokoro) &&
            existing.voicePreferences.favorites.kokoro.length > 0
              ? existing.voicePreferences.favorites.kokoro.slice(0, MAX_FAVORITES_PER_ENGINE)
              : [DEFAULT_KOKORO_VOICE],
          piper:
            Array.isArray(existing.voicePreferences?.favorites?.piper) &&
            existing.voicePreferences.favorites.piper.length > 0
              ? existing.voicePreferences.favorites.piper.slice(0, MAX_FAVORITES_PER_ENGINE)
              : [DEFAULT_PIPER_VOICE],
        },
      };

      const completeSettings: StoredSettings = {
        engine: existing.engine,
        hasWebGpu: existing.hasWebGpu,
        checkedAt: existing.checkedAt || Date.now(),
        voicePreferences,
        onTabCloseAction: existing.onTabCloseAction === 'stop' ? 'stop' : DEFAULT_TAB_CLOSE_ACTION,
      };

      // If existing lacked voicePreferences or onTabCloseAction, persist the complete settings
      if (!existing.voicePreferences || !existing.onTabCloseAction) {
        await b?.storage?.local?.set({ [SETTINGS_STORAGE_KEY]: completeSettings });
      }

      return completeSettings;
    }
  } catch (err) {
    console.warn('[settings] Error reading stored settings:', err);
  }

  // First run: detect WebGPU capability
  const hasWebGpu = await checkWebGpu();
  const defaultEngine: TTSEngine = hasWebGpu ? 'kokoro' : 'piper';

  const newSettings: StoredSettings = {
    engine: defaultEngine,
    hasWebGpu,
    checkedAt: Date.now(),
    voicePreferences: {
      activeVoice: { ...DEFAULT_VOICE_PREFERENCES.activeVoice },
      favorites: {
        kokoro: [...DEFAULT_VOICE_PREFERENCES.favorites.kokoro],
        piper: [...DEFAULT_VOICE_PREFERENCES.favorites.piper],
      },
    },
    onTabCloseAction: DEFAULT_TAB_CLOSE_ACTION,
  };


  try {
    await b?.storage?.local?.set({ [SETTINGS_STORAGE_KEY]: newSettings });
  } catch (err) {
    console.warn('[settings] Error saving initial settings:', err);
  }

  return newSettings;
}

/**
 * Updates the user's selected engine and persists immediately to browser.storage.local.
 */
export async function saveEnginePreference(engine: TTSEngine): Promise<StoredSettings> {
  const current = await getOrInitializeSettings();
  const updated: StoredSettings = {
    ...current,
    engine,
  };

  const b = getBrowser();
  await b?.storage?.local?.set({ [SETTINGS_STORAGE_KEY]: updated });
  return updated;
}

/**
 * Updates the active voice for a given engine and persists immediately to browser.storage.local.
 */
export async function saveActiveVoice(
  engine: TTSEngine,
  voiceId: string
): Promise<StoredSettings> {
  const current = await getOrInitializeSettings();
  const updated: StoredSettings = {
    ...current,
    voicePreferences: {
      ...current.voicePreferences,
      activeVoice: {
        ...current.voicePreferences.activeVoice,
        [engine]: voiceId,
      },
    },
  };

  const b = getBrowser();
  await b?.storage?.local?.set({ [SETTINGS_STORAGE_KEY]: updated });
  return updated;
}

/**
 * Toggles a voice as a favorite for a given engine (capped at MAX_FAVORITES_PER_ENGINE).
 */
export async function toggleFavoriteVoice(
  engine: TTSEngine,
  voiceId: string
): Promise<{ settings: StoredSettings; added: boolean; error?: string }> {
  const current = await getOrInitializeSettings();
  const list = current.voicePreferences.favorites[engine] || [];
  const exists = list.includes(voiceId);

  if (exists) {
    const updatedFavorites = list.filter((id) => id !== voiceId);
    const updated: StoredSettings = {
      ...current,
      voicePreferences: {
        ...current.voicePreferences,
        favorites: {
          ...current.voicePreferences.favorites,
          [engine]: updatedFavorites,
        },
      },
    };
    const b = getBrowser();
    await b?.storage?.local?.set({ [SETTINGS_STORAGE_KEY]: updated });
    return { settings: updated, added: false };
  } else {
    if (list.length >= MAX_FAVORITES_PER_ENGINE) {
      return {
        settings: current,
        added: false,
        error:
          'You can only have up to 5 favorite voices in the quick popup. Unfavorite a voice first.',
      };
    }
    const updatedFavorites = [...list, voiceId];
    const updated: StoredSettings = {
      ...current,
      voicePreferences: {
        ...current.voicePreferences,
        favorites: {
          ...current.voicePreferences.favorites,
          [engine]: updatedFavorites,
        },
      },
    };
    const b = getBrowser();
    await b?.storage?.local?.set({ [SETTINGS_STORAGE_KEY]: updated });
    return { settings: updated, added: true };
  }
}

/**
 * Saves the user's preferred tab-close action and persists it to browser.storage.local.
 */
export async function saveTabCloseAction(action: TabCloseAction): Promise<StoredSettings> {
  const current = await getOrInitializeSettings();
  const updated: StoredSettings = { ...current, onTabCloseAction: action };
  const b = getBrowser();
  await b?.storage?.local?.set({ [SETTINGS_STORAGE_KEY]: updated });
  return updated;
}
