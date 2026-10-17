import { useEffect, useMemo, useState } from 'react';
import {
  getOrInitializeSettings,
  saveActiveVoice,
  SETTINGS_STORAGE_KEY,
  toggleFavoriteVoice,
  type StoredSettings,
  type TTSEngine,
} from '@/lib/settings';
import {
  getVoicesForEngine,
  type Voice,
  type VoiceAccent,
  type VoiceGender,
} from '@/lib/voices';
import {
  audioPreviewManager,
  type AudioPreviewState,
} from '@/lib/audio-preview';
import { VoiceCard } from './components/VoiceCard';
import { ToastNotice, type ToastData } from './components/ToastNotice';

function getBrowser(): any {
  if (typeof browser !== 'undefined' && browser?.storage) return browser;
  if (typeof globalThis !== 'undefined' && (globalThis as any).browser) return (globalThis as any).browser;
  if (typeof (globalThis as any).chrome !== 'undefined') return (globalThis as any).chrome;
  return undefined;
}

export default function App() {
  const [settings, setSettings] = useState<StoredSettings | null>(null);
  const [activeTab, setActiveTab] = useState<TTSEngine>('kokoro');
  const [searchQuery, setSearchQuery] = useState('');
  const [genderFilter, setGenderFilter] = useState<'All' | VoiceGender>('All');
  const [accentFilter, setAccentFilter] = useState<'All' | VoiceAccent>('All');
  const [audioState, setAudioState] = useState<AudioPreviewState>(() =>
    audioPreviewManager.getState(),
  );
  const [toast, setToast] = useState<ToastData | null>(null);

  // Initialize and listen to storage changes
  useEffect(() => {
    let mounted = true;
    getOrInitializeSettings()
      .then((s) => {
        if (mounted) {
          setSettings(s);
          setActiveTab(s.engine);
        }
      })
      .catch((err) => console.warn('[VoiceCatalog] Error loading settings:', err));

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

    // Subscribe to audio preview playback changes
    const unsubAudio = audioPreviewManager.subscribe((state) => {
      if (mounted) setAudioState(state);
    });

    return () => {
      mounted = false;
      audioPreviewManager.stop();
      unsubAudio();
      if (b?.storage?.onChanged) {
        b.storage.onChanged.removeListener(handleStorageChange);
      }
    };
  }, []);

  const activeVoiceForTab =
    settings?.voicePreferences?.activeVoice?.[activeTab] ||
    (activeTab === 'piper' ? 'en_US-hfc_female-medium' : 'af_heart');

  const favoritesForTab = useMemo(
    () => settings?.voicePreferences?.favorites?.[activeTab] || [],
    [settings, activeTab],
  );

  const kokoroFavorites = settings?.voicePreferences?.favorites?.kokoro || [];
  const piperFavorites = settings?.voicePreferences?.favorites?.piper || [];

  // Filter voices for current tab
  const voices = useMemo(() => {
    const list = getVoicesForEngine(activeTab);
    return list.filter((v) => {
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = v.name.toLowerCase().includes(query);
        const matchesStyle = v.style.toLowerCase().includes(query);
        const matchesId = v.id.toLowerCase().includes(query);
        if (!matchesName && !matchesStyle && !matchesId) return false;
      }
      if (genderFilter !== 'All' && v.gender !== genderFilter) {
        return false;
      }
      if (accentFilter !== 'All' && v.accent !== accentFilter) {
        return false;
      }
      return true;
    });
  }, [activeTab, searchQuery, genderFilter, accentFilter]);

  const handlePlayToggle = (voice: Voice) => {
    audioPreviewManager.play(voice.id, voice.previewUrl).catch((err) => {
      console.warn('[VoiceCatalog] Preview play error:', err);
    });
  };

  const handleSelectActive = async (voice: Voice) => {
    try {
      const updated = await saveActiveVoice(activeTab, voice.id);
      setSettings(updated);

      const isFav = favoritesForTab.includes(voice.id);
      if (!isFav) {
        setToast({
          id: `active-${Date.now()}`,
          type: 'info',
          message: `Set "${voice.name}" as active reading voice. Don't forget to add it to your favorites!`,
          actionLabel: 'Add to Favorites',
          onAction: () => handleToggleFavorite(voice),
        });
      } else {
        setToast({
          id: `active-${Date.now()}`,
          type: 'success',
          message: `"${voice.name}" is now your active reading voice.`,
        });
      }
    } catch (err) {
      console.warn('[VoiceCatalog] Error selecting active voice:', err);
    }
  };

  const handleToggleFavorite = async (voice: Voice) => {
    try {
      const res = await toggleFavoriteVoice(activeTab, voice.id);
      setSettings(res.settings);

      if (res.error) {
        setToast({
          id: `fav-err-${Date.now()}`,
          type: 'warning',
          message: res.error,
        });
      } else if (res.added) {
        const newCount = res.settings.voicePreferences.favorites[activeTab].length;
        setToast({
          id: `fav-add-${Date.now()}`,
          type: 'success',
          message: `Added "${voice.name}" to favorites (${newCount}/5).`,
        });
      } else {
        setToast({
          id: `fav-remove-${Date.now()}`,
          type: 'info',
          message: `Removed "${voice.name}" from favorites.`,
        });
      }
    } catch (err) {
      console.warn('[VoiceCatalog] Error toggling favorite:', err);
    }
  };

  return (
    <div className="min-h-screen bg-primary text-on-primary selection:bg-accent selection:text-on-accent transition-colors">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 border-b border-border bg-primary/95 backdrop-blur-md px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15 text-accent font-bold text-lg shadow-2xs">
              🎙️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight text-on-primary">
                  Voice Catalog
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-accent">
                  100% Offline TTS
                </span>
              </div>
              <p className="text-xs text-on-surface">
                Audition local voices and curate favorites for instant reading.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-on-surface hidden md:inline">
              Engine in Settings:
            </span>
            <span className="rounded-lg border border-accent/30 bg-accent/10 px-2.5 py-1 text-xs font-semibold text-accent uppercase">
              {settings?.engine || 'kokoro'}
            </span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-6xl px-6 py-8">
        {/* Hero Section */}
        <div className="mb-8 rounded-2xl border border-border bg-surface p-6 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-on-primary tracking-tight">
                Audition & Choose Your Reading Voices
              </h2>
              <p className="mt-1 text-xs text-on-surface max-w-2xl leading-relaxed">
                Click <strong className="text-on-primary font-semibold">▶</strong> on any voice to stream pre-rendered high-fidelity speech samples instantly with zero model download. Mark up to 5 favorites per engine to have them available in your side panel quick switcher.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="rounded-lg bg-primary border border-border px-3 py-1.5 text-xs font-medium text-on-surface shadow-2xs">
                ⭐ {favoritesForTab.length}/5 Favorites Saved
              </span>
            </div>
          </div>
        </div>

        {/* Engine Tabs Switcher */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('kokoro')}
              className={`flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'kokoro'
                  ? 'bg-accent text-on-accent shadow-xs'
                  : 'bg-surface text-on-surface hover:text-on-primary hover:bg-surface/80 border border-border'
              }`}
            >
              <span>Kokoro (Neural / WebGPU)</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  activeTab === 'kokoro'
                    ? 'bg-on-accent/20 text-on-accent'
                    : 'bg-primary text-on-surface'
                }`}
              >
                {kokoroFavorites.length}/5 Favs
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('piper')}
              className={`flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'piper'
                  ? 'bg-accent text-on-accent shadow-xs'
                  : 'bg-surface text-on-surface hover:text-on-primary hover:bg-surface/80 border border-border'
              }`}
            >
              <span>Piper (Fast / CPU)</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  activeTab === 'piper'
                    ? 'bg-on-accent/20 text-on-accent'
                    : 'bg-primary text-on-surface'
                }`}
              >
                {piperFavorites.length}/5 Favs
              </span>
            </button>
          </div>

          <span className="text-xs text-on-surface">
            Showing {voices.length} of {getVoicesForEngine(activeTab).length} curated voices
          </span>
        </div>

        {/* Search & Trait Filters Bar */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface p-3 shadow-2xs">
          {/* Search Input */}
          <div className="flex min-w-[220px] flex-1 items-center gap-2 rounded-lg border border-border bg-primary px-3 py-1.5 text-xs">
            <span className="text-on-surface">🔍</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search voices by name or style..."
              className="w-full bg-transparent text-xs text-on-primary placeholder:text-on-surface/60 focus:outline-hidden"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-on-surface hover:text-on-primary text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Gender Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-on-surface font-medium mr-1">Gender:</span>
            {(['All', 'Female', 'Male'] as const).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGenderFilter(g)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition cursor-pointer ${
                  genderFilter === g
                    ? 'bg-accent text-on-accent'
                    : 'bg-primary text-on-surface hover:text-on-primary border border-border'
                }`}
              >
                {g}
              </button>
            ))}
          </div>

          {/* Accent Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-on-surface font-medium mr-1">Accent:</span>
            {(['All', 'American', 'British'] as const).map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setAccentFilter(a)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition cursor-pointer ${
                  accentFilter === a
                    ? 'bg-accent text-on-accent'
                    : 'bg-primary text-on-surface hover:text-on-primary border border-border'
                }`}
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        {/* Voice Cards Grid */}
        {voices.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border p-12 text-center bg-surface">
            <span className="text-3xl mb-2">🔍</span>
            <h3 className="text-sm font-semibold text-on-primary">No voices matched</h3>
            <p className="text-xs text-on-surface mt-1">
              Try adjusting your search terms or filters.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setGenderFilter('All');
                setAccentFilter('All');
              }}
              className="mt-4 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-on-accent"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {voices.map((voice) => {
              const isActive = voice.id === activeVoiceForTab;
              const isFav = favoritesForTab.includes(voice.id);
              const isCurrentPlaying = audioState.voiceId === voice.id;
              const status = isCurrentPlaying ? audioState.status : 'idle';

              return (
                <VoiceCard
                  key={voice.id}
                  voice={voice}
                  isActive={isActive}
                  isFavorite={isFav}
                  playbackStatus={status}
                  errorMessage={
                    isCurrentPlaying && audioState.status === 'error'
                      ? audioState.errorMessage
                      : undefined
                  }
                  onPlayToggle={() => handlePlayToggle(voice)}
                  onSelectActive={() => handleSelectActive(voice)}
                  onToggleFavorite={() => handleToggleFavorite(voice)}
                />
              );
            })}
          </div>
        )}
      </main>

      {/* Toast Notice Container */}
      <ToastNotice toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
