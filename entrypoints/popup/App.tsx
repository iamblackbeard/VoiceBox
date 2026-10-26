import { useEffect, useState } from 'react';
import { ThemeToggle } from '@/lib/ThemeToggle';
import {
  getOrInitializeSettings,
  recheckWebGpu,
  saveEnginePreference,
  saveTabCloseAction,
  SETTINGS_STORAGE_KEY,
  type StoredSettings,
  type TabCloseAction,
  type TTSEngine,
} from '@/lib/settings';

import {
  getDefaultVoiceForEngine,
  getVoiceById,
} from '@/lib/voices';

function getBrowser(): any {
  if (typeof browser !== 'undefined' && browser?.storage) return browser;
  if (typeof globalThis !== 'undefined' && (globalThis as any).browser) return (globalThis as any).browser;
  if (typeof (globalThis as any).chrome !== 'undefined') return (globalThis as any).chrome;
  return undefined;
}

export default function App() {
  const [settings, setSettings] = useState<StoredSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCheckingGpu, setIsCheckingGpu] = useState(false);

  useEffect(() => {
    let mounted = true;
    getOrInitializeSettings()
      .then((s) => {
        if (mounted) {
          setSettings(s);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('[popup] Failed to load settings:', err);
        if (mounted) setLoading(false);
      });

    const b = getBrowser();
    const handleStorageChange = (changes: any, area: string) => {
      if (area === 'local' && changes[SETTINGS_STORAGE_KEY]?.newValue) {
        if (mounted) {
          setSettings(changes[SETTINGS_STORAGE_KEY].newValue as StoredSettings);
        }
      }
    };

    if (b?.storage?.onChanged) {
      b.storage.onChanged.addListener(handleStorageChange);
    }

    return () => {
      mounted = false;
      if (b?.storage?.onChanged) {
        b.storage.onChanged.removeListener(handleStorageChange);
      }
    };
  }, []);

  const handleRecheckWebGpu = async () => {
    if (isCheckingGpu) return;
    setIsCheckingGpu(true);
    try {
      const minDelayPromise = new Promise((resolve) => setTimeout(resolve, 350));
      const [updated] = await Promise.all([recheckWebGpu(), minDelayPromise]);
      if (settings && updated.hasWebGpu !== settings.hasWebGpu) {
        setSettings(updated);
      }
    } catch (err) {
      console.error('[popup] Failed to recheck WebGPU:', err);
    } finally {
      setIsCheckingGpu(false);
    }
  };

  const handleSelectEngine = async (engine: TTSEngine) => {
    if (!settings || settings.engine === engine) return;
    setSettings({ ...settings, engine });
    try {
      await saveEnginePreference(engine);
    } catch (err) {
      console.error('[popup] Failed to persist engine choice:', err);
    }
  };

  const handleTabCloseAction = async (action: TabCloseAction) => {
    if (!settings || settings.onTabCloseAction === action) return;
    setSettings({ ...settings, onTabCloseAction: action });
    try {
      await saveTabCloseAction(action);
    } catch (err) {
      console.error('[popup] Failed to persist tab close action:', err);
    }
  };

  const handleOpenVoiceCatalog = () => {
    try {
      const b = getBrowser();
      const targetUrl = b?.runtime?.getURL ? b.runtime.getURL('/voices.html') : '/voices/index.html';
      if (b?.tabs?.create) {
        b.tabs.create({ url: targetUrl });
      } else if (typeof window !== 'undefined') {
        window.open(targetUrl, '_blank');
      }
    } catch (err) {
      console.error('[popup] Failed to open voice catalog:', err);
    }
  };

  if (loading || !settings) {
    return (
      <div className="w-[320px] p-5 flex flex-col items-center justify-center min-h-[220px] bg-primary text-on-primary">
        <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin mb-3" />
        <span className="text-xs text-on-surface">Checking hardware configuration...</span>
      </div>
    );
  }

  const { engine, hasWebGpu } = settings;
  const activeVoiceId =
    settings.voicePreferences?.activeVoice?.[engine] || getDefaultVoiceForEngine(engine);
  const activeVoice = getVoiceById(activeVoiceId);
  const activeVoiceName = activeVoice?.name || (engine === 'piper' ? 'HFC Female' : 'Heart');

  return (
    <main className="w-[330px] p-4 bg-primary text-on-primary select-none box-border flex flex-col gap-3.5">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex flex-col">
          <h1 className="text-sm font-semibold tracking-tight text-on-primary">
            Voice Box
          </h1>
          <span className="text-[11px] text-on-surface">TTS Engine Preference</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            id="recheck-webgpu-btn"
            onClick={handleRecheckWebGpu}
            disabled={isCheckingGpu}
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium border transition-all cursor-pointer hover:opacity-80 active:scale-95 disabled:cursor-wait ${hasWebGpu
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
              }`}
            title={
              isCheckingGpu
                ? 'Checking WebGPU availability...'
                : hasWebGpu
                  ? 'WebGPU Ready (Click to re-check)'
                  : 'CPU Only (Click to re-check WebGPU)'
            }
            aria-label={
              isCheckingGpu
                ? 'Checking WebGPU availability'
                : hasWebGpu
                  ? 'WebGPU Ready, click to re-check'
                  : 'CPU Only, click to re-check WebGPU'
            }
          >
            {isCheckingGpu ? (
              <span
                className="w-2.5 h-2.5 border-[1.5px] border-current border-t-transparent rounded-full animate-spin shrink-0"
                aria-hidden="true"
              />
            ) : (
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${hasWebGpu ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
              />
            )}
            <span>{hasWebGpu ? 'WebGPU Ready' : 'CPU Only'}</span>
          </button>
          <ThemeToggle id="popup-theme-toggle" />
        </div>
      </header>

      {/* Hardware Warning Banner if WebGPU is absent */}
      {!hasWebGpu && (
        <aside
          role="alert"
          aria-label="Hardware recommendation"
          className="p-2.5 rounded-lg border text-xs bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300 flex items-start gap-2"
        >
          <span className="text-sm leading-none shrink-0" aria-hidden="true">⚠️</span>
          <span className="leading-snug">Wgpu not found, Piper is recommended.</span>
        </aside>
      )}

      {/* Engine Selection Radios */}
      <section className="flex flex-col gap-2" aria-label="Speech Engine Selection">
        {/* Kokoro Option */}
        <label
          htmlFor="engine-kokoro"
          onClick={() => handleSelectEngine('kokoro')}
          className={`group flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${engine === 'kokoro'
            ? 'bg-surface border-accent shadow-xs'
            : 'border-border hover:bg-surface/50'
            }`}
        >
          <div className="pt-0.5">
            <input
              type="radio"
              id="engine-kokoro"
              name="tts-engine"
              value="kokoro"
              checked={engine === 'kokoro'}
              onChange={() => handleSelectEngine('kokoro')}
              className="accent-accent w-4 h-4 cursor-pointer"
            />
          </div>
          <div className="flex flex-col gap-0.5 flex-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-on-primary">Kokoro</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-accent/10 text-accent font-medium">
                Neural / WebGPU
              </span>
            </div>
            <p className="text-[11px] text-on-surface leading-tight m-0">
              High naturalness. Runs fastest with hardware WebGPU support.
            </p>
          </div>
        </label>

        {/* Piper Option */}
        <label
          htmlFor="engine-piper"
          onClick={() => handleSelectEngine('piper')}
          className={`group flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${engine === 'piper'
            ? 'bg-surface border-accent shadow-xs'
            : 'border-border hover:bg-surface/50'
            }`}
        >
          <div className="pt-0.5">
            <input
              type="radio"
              id="engine-piper"
              name="tts-engine"
              value="piper"
              checked={engine === 'piper'}
              onChange={() => handleSelectEngine('piper')}
              className="accent-accent w-4 h-4 cursor-pointer"
            />
          </div>
          <div className="flex flex-col gap-0.5 flex-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-on-primary">Piper</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-accent/10 text-accent font-medium">
                Lightweight / WASM
              </span>
            </div>
            <p className="text-[11px] text-on-surface leading-tight m-0">
              Fast local speech. Optimized for CPU execution without GPU.
            </p>
          </div>
        </label>
      </section>

      {/* Voice Row / Catalog Entry Point */}
      <button
        type="button"
        id="open-voice-catalog"
        data-target="/voices/index.html"
        onClick={handleOpenVoiceCatalog}
        className="group flex items-center justify-between p-3 rounded-lg border border-border hover:bg-surface/50 transition-all cursor-pointer text-left w-full"
        title="Open Voice Catalog (/voices/index.html)"
        aria-label="Open Voice Catalog"
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-on-primary">Voice</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/10 text-accent font-medium">
            {engine === 'kokoro' ? 'Neural' : 'Fast WASM'}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-on-primary text-xs font-medium">
          <span className="text-accent font-medium">{activeVoiceName}</span>
          <span
            className="text-sm font-bold text-accent transition-transform group-hover:translate-x-0.5"
            aria-hidden="true"
          >
            ›
          </span>
        </div>
      </button>

      {/* Tab Navigation Policy */}
      {/*}
      <section className="flex flex-col gap-1.5" aria-label ="Tab Navigation Policy">
        <span className="text-[11px] font-semibold text-on-surface uppercase tracking-wider">
          When reading tab is closed
        </span>
        <div className="flex gap-2">
          {(['continue', 'stop'] as TabCloseAction[]).map((action) => (
            <button
              key={action}
              id={`tab-close-${action}`}
              type="button"
              onClick={() => handleTabCloseAction(action)}
              className={[
                'flex-1 rounded-lg border py-1.5 text-[11px] font-medium transition-all',
                settings.onTabCloseAction === action
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-border text-on-surface hover:bg-surface/50',
              ].join(' ')}
            >
              {action === 'continue' ? 'Continue playing' : 'Stop playback'}
            </button>
          ))}
        </div>
      </section>
      */}
      {/* Footer / Status Note */}
      <footer className="pt-1 flex items-center justify-between text-[10px] text-on-surface">
        <span>Instant save</span>
        <span className="opacity-75">100% On-Device</span>
      </footer>
    </main>
  );
}
