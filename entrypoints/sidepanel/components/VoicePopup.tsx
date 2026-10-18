import { useEffect, useState } from 'react';
import {
  getOrInitializeSettings,
  saveActiveVoice,
  SETTINGS_STORAGE_KEY,
  type StoredSettings,
  type TTSEngine,
} from '@/lib/settings';
import { formatPopupVoiceList, type Voice } from '@/lib/voices';
import { player } from '@/lib/player';

interface VoicePopupProps {
  onClose?: () => void;
}

function getBrowser(): any {
  if (typeof browser !== 'undefined' && browser?.storage) return browser;
  if (typeof globalThis !== 'undefined' && (globalThis as any).browser) return (globalThis as any).browser;
  if (typeof (globalThis as any).chrome !== 'undefined') return (globalThis as any).chrome;
  return undefined;
}

export default function VoicePopup({ onClose }: VoicePopupProps) {
  const [settings, setSettings] = useState<StoredSettings | null>(null);

  useEffect(() => {
    let mounted = true;
    getOrInitializeSettings()
      .then((s) => {
        if (mounted) setSettings(s);
      })
      .catch((err) => console.warn('[VoicePopup] Failed to load settings:', err));

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

  if (!settings) {
    return (
      <div className="flex w-64 items-center justify-center py-4 text-xs text-on-surface">
        <span>Loading voices...</span>
      </div>
    );
  }

  const engine: TTSEngine = settings.engine;
  const activeVoiceId =
    settings.voicePreferences?.activeVoice?.[engine] ||
    (engine === 'piper' ? 'en_US-hfc_female-medium' : 'af_heart');
  const favoriteIds = settings.voicePreferences?.favorites?.[engine] || [activeVoiceId];

  // Dynamic 5 favorites + 1 active voice (if unpinned)
  const { favorites: favoriteVoices, unpinned: unpinnedVoice } = formatPopupVoiceList(
    engine,
    activeVoiceId,
    favoriteIds,
  );

  const handleSelectVoice = async (voiceId: string) => {
    try {
      const updated = await saveActiveVoice(engine, voiceId);
      setSettings(updated);
      await player.handleVoiceChange(voiceId);
    } catch (err) {
      console.warn('[VoicePopup] Error selecting voice:', err);
    }
  };

  const handleOpenCatalog = () => {
    try {
      const b = getBrowser();
      if (b?.tabs?.create && b?.runtime?.getURL) {
        b.tabs.create({ url: b.runtime.getURL('/voices.html') });
      } else if (typeof window !== 'undefined') {
        window.open('/voices.html', '_blank');
      }
    } catch (e) {
      console.warn('[VoicePopup] Failed to open voices catalog:', e);
    }
    onClose?.();
  };

  return (
    <div className="flex w-64 flex-col gap-2.5 select-none" role="dialog" aria-label="Voice Selection">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-1.5">
        <span className="text-xs font-semibold text-on-primary">
          {engine === 'kokoro' ? 'Kokoro Voices' : 'Piper Voices'}
        </span>
        <span className="rounded bg-accent/10 px-1.5 py-0.5 text-[10px] font-medium text-accent uppercase">
          {engine}
        </span>
      </div>

      {/* Voice list (Favorites) */}
      <div
        className="flex max-h-56 flex-col gap-1 overflow-y-auto pr-0.5"
        role="listbox"
        aria-label="Available Voices"
      >
        {favoriteVoices.map((voice) => {
          const isActive = voice.id === activeVoiceId;
          return (
            <button
              key={voice.id}
              type="button"
              role="option"
              aria-selected={isActive}
              onClick={() => handleSelectVoice(voice.id)}
              className={`group flex items-center justify-between rounded-md border p-2 text-left transition cursor-pointer ${
                isActive
                  ? 'border-accent/40 bg-accent/10 text-accent font-semibold'
                  : 'border-transparent text-on-primary hover:bg-primary/60'
              }`}
            >
              <div className="flex flex-col">
                <span className="text-xs">{voice.name}</span>
                <span className="text-[10px] text-on-surface">
                  {voice.accent} • {voice.gender}
                </span>
              </div>
              {isActive && (
                <span className="text-sm font-bold text-accent" aria-label="Selected">
                  ✓
                </span>
              )}
            </button>
          );
        })}

        {/* Temporary / Unpinned Voice (if active voice is not in favorites) */}
        {unpinnedVoice && (
          <div className="mt-1 flex flex-col gap-1 border-t border-border/70 pt-1.5">
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] font-medium text-on-surface">
                Active Voice (Unpinned)
              </span>
              <span className="rounded bg-accent/15 px-1.5 py-0.5 text-[9px] font-semibold text-accent">
                Temporary
              </span>
            </div>
            <button
              type="button"
              role="option"
              aria-selected={true}
              onClick={() => handleSelectVoice(unpinnedVoice.id)}
              className="flex items-center justify-between rounded-md border border-accent/40 bg-accent/10 p-2 text-left text-accent font-semibold cursor-pointer"
            >
              <div className="flex flex-col">
                <span className="text-xs">{unpinnedVoice.name}</span>
                <span className="text-[10px] text-on-surface">
                  {unpinnedVoice.accent} • {unpinnedVoice.gender}
                </span>
              </div>
              <span className="text-sm font-bold text-accent" aria-label="Selected">
                ✓
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Footer link to full catalog */}
      <button
        type="button"
        onClick={handleOpenCatalog}
        className="flex items-center justify-center gap-1 border-t border-border pt-2 text-xs font-medium text-accent hover:underline cursor-pointer transition"
      >
        <span>Manage all voices in catalog</span>
        <span aria-hidden="true">›</span>
      </button>
    </div>
  );
}
