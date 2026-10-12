import { checkWebGpu } from './hardware';

export type TTSEngine = 'kokoro' | 'piper';

export interface EngineSettings {
  engine: TTSEngine;      // Currently active TTS engine ('kokoro' | 'piper')
  hasWebGpu: boolean;     // Cached WebGPU hardware capability
  checkedAt: number;      // Epoch timestamp when hardware was probed
}

export const SETTINGS_STORAGE_KEY = 'engine_settings';

/**
 * Returns saved engine settings, or inspects hardware and initializes default settings
 * if not yet cached in browser.storage.local.
 */
export async function getOrInitializeSettings(): Promise<EngineSettings> {
  try {
    const stored = await browser.storage.local.get(SETTINGS_STORAGE_KEY);
    const existing = stored?.[SETTINGS_STORAGE_KEY] as EngineSettings | undefined;

    if (
      existing &&
      (existing.engine === 'kokoro' || existing.engine === 'piper') &&
      typeof existing.hasWebGpu === 'boolean'
    ) {
      return existing;
    }
  } catch (err) {
    console.warn('[settings] Error reading stored settings:', err);
  }

  // First run: detect WebGPU capability
  const hasWebGpu = await checkWebGpu();
  const defaultEngine: TTSEngine = hasWebGpu ? 'kokoro' : 'piper';

  const newSettings: EngineSettings = {
    engine: defaultEngine,
    hasWebGpu,
    checkedAt: Date.now(),
  };

  try {
    await browser.storage.local.set({ [SETTINGS_STORAGE_KEY]: newSettings });
  } catch (err) {
    console.warn('[settings] Error saving initial settings:', err);
  }

  return newSettings;
}

/**
 * Updates the user's selected engine and persists immediately to browser.storage.local.
 */
export async function saveEnginePreference(engine: TTSEngine): Promise<EngineSettings> {
  const current = await getOrInitializeSettings();
  const updated: EngineSettings = {
    ...current,
    engine,
  };

  await browser.storage.local.set({ [SETTINGS_STORAGE_KEY]: updated });
  return updated;
}
