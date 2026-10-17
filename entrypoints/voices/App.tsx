import { useEffect, useState } from 'react';
import {
  getOrInitializeSettings,
  type StoredSettings,
  type TTSEngine,
} from '@/lib/settings';

export default function App() {
  const [settings, setSettings] = useState<StoredSettings | null>(null);

  useEffect(() => {
    getOrInitializeSettings().then(setSettings).catch(console.error);
  }, []);

  const engine: TTSEngine = settings?.engine || 'kokoro';

  return (
    <div className="min-h-screen bg-primary text-on-primary p-6 flex flex-col items-center">
      <header className="w-full max-w-4xl flex items-center justify-between border-b border-border pb-4 mb-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-on-primary">
            Voice Catalog
          </h1>
          <p className="text-xs text-on-surface">
            Audition voices and manage quick favorites for offline reading.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded bg-accent/10 px-2 py-1 text-xs font-medium text-accent uppercase">
            Active: {engine}
          </span>
        </div>
      </header>

      <main className="w-full max-w-4xl flex flex-col items-center justify-center p-12 rounded-xl border border-border bg-surface text-center">
        <div className="w-12 h-12 rounded-full bg-accent/10 text-accent flex items-center justify-center text-xl mb-3">
          🎙️
        </div>
        <h2 className="text-base font-semibold text-on-primary mb-1">
          Full Catalog & Audio Previews
        </h2>
        <p className="text-xs text-on-surface max-w-md mb-4">
          The full interactive catalog with live audio sample players, accent tags, and favorite management is being built in Slice 2.
        </p>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs bg-accent text-on-accent font-medium">
          Slice 2 Ready to Implement
        </span>
      </main>
    </div>
  );
}
