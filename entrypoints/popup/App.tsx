import { useEffect, useState } from 'react';
import {
  getOrInitializeSettings,
  saveEnginePreference,
  type EngineSettings,
  type TTSEngine,
} from '@/lib/settings';

export default function App() {
  const [settings, setSettings] = useState<EngineSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getOrInitializeSettings()
      .then((s) => {
        setSettings(s);
        setLoading(false);
      })
      .catch((err) => {
        console.error('[popup] Failed to load settings:', err);
        setLoading(false);
      });
  }, []);

  const handleSelectEngine = async (engine: TTSEngine) => {
    if (!settings || settings.engine === engine) return;
    // Optimistic UI update
    setSettings({ ...settings, engine });
    try {
      await saveEnginePreference(engine);
    } catch (err) {
      console.error('[popup] Failed to persist engine choice:', err);
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

  return (
    <main className="w-[330px] p-4 bg-primary text-on-primary select-none box-border flex flex-col gap-3.5">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex flex-col">
          <h1 className="text-sm font-semibold tracking-tight text-on-primary">
            Local Voice Reader
          </h1>
          <span className="text-[11px] text-on-surface">TTS Engine Preference</span>
        </div>
        <div
          className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium border ${
            hasWebGpu
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
          }`}
          title={hasWebGpu ? 'WebGPU acceleration detected' : 'WebGPU not detected on this device'}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              hasWebGpu ? 'bg-emerald-500' : 'bg-amber-500'
            }`}
          />
          {hasWebGpu ? 'WebGPU Ready' : 'CPU Only'}
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
          className={`group flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
            engine === 'kokoro'
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
          className={`group flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
            engine === 'piper'
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

      {/* Footer / Status Note */}
      <footer className="pt-1 flex items-center justify-between text-[10px] text-on-surface">
        <span>Instant save</span>
        <span className="opacity-75">100% On-Device</span>
      </footer>
    </main>
  );
}
