import { useEffect, useRef, useState } from 'react';
import { PENDING_READING_KEY, type PendingReading } from '@/lib/messages';
import Header from './components/Header';
import StatusBar from './components/StatusBar';
import SentenceList from './components/SentenceList';
import PlayerControls from './components/PlayerControls';
import Toast from './components/Toast';
import { player, type PlayerState } from '@/lib/player';
import { chunkText } from '@/lib/chunker';
import { getOrInitializeSettings, SETTINGS_STORAGE_KEY } from '@/lib/settings';

export default function App() {
  const [reading, setReading] = useState<PendingReading | null>(null);
  const [chunks, setChunks] = useState<string[]>([]);
  const [originTabClosed, setOriginTabClosed] = useState(false);
  const [playerState, setPlayerState] = useState<PlayerState>({
    status: 'idle',
    message: null,
    sentenceIndex: -1,
    totalSentences: 0,
  });
  const [speed, setSpeed] = useState(() => player.getSpeed?.() ?? 1.0);

  // Keep a ref so the tabs.onRemoved listener always sees the current reading
  const readingRef = useRef<PendingReading | null>(null);
  readingRef.current = reading;

  useEffect(() => {
    return player.subscribe(setPlayerState);
  }, []);

  // The panel may open before or after the background script saves the
  // selected text, so read what's already there AND listen for changes.
  useEffect(() => {
    let active = true;

    const handleNewReading = (newReading: PendingReading) => {
      const parsed = chunkText(newReading.text);
      setReading(newReading);
      setOriginTabClosed(false);
      setChunks(parsed);
      player.play(parsed, newReading.readingId, newReading.tabId);
    };

    browser.storage.session.get(PENDING_READING_KEY).then((stored) => {
      if (active && stored[PENDING_READING_KEY]) {
        handleNewReading(stored[PENDING_READING_KEY] as PendingReading);
      }
    });

    const onChanged = (
      changes: Record<string, { newValue?: unknown }>,
      area: string,
    ) => {
      if (area !== 'session') return;
      const change = changes[PENDING_READING_KEY];
      if (change?.newValue) handleNewReading(change.newValue as PendingReading);
    };
    browser.storage.onChanged.addListener(onChanged);

    return () => {
      active = false;
      browser.storage.onChanged.removeListener(onChanged);
    };
  }, []);

  // Listen for the originating tab being closed and enforce the user's policy.
  useEffect(() => {
    const onTabRemoved = async (tabId: number) => {
      const current = readingRef.current;
      if (!current || current.tabId !== tabId) return;

      let action = 'continue';
      try {
        const settings = await getOrInitializeSettings();
        action = settings.onTabCloseAction;
      } catch {
        // fall back to 'continue'
      }

      setOriginTabClosed(true);

      if (action === 'stop') {
        player.pause();
      }
      // 'continue' → do nothing to the player; cached chunks keep playing
    };

    browser.tabs.onRemoved.addListener(onTabRemoved);
    return () => {
      browser.tabs.onRemoved.removeListener(onTabRemoved);
    };
  }, []);

  return (
    <main className="mx-auto flex h-full max-w-md flex-col gap-4 bg-primary p-5 text-on-primary">
      <h1 className="sr-only">Local Voice Reader</h1>

      <Header
        reading={reading}
        originTabClosed={originTabClosed}
        onClose={() => {
          try {
            player.pause();
          } catch {}
          if (typeof window !== 'undefined' && typeof window.close === 'function') {
            window.close();
          }
        }}
      />

      <StatusBar message={playerState.message} />

      {/* Interactive sentence stream */}
      <section
        aria-label="Now reading"
        className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden rounded-3xl border border-border bg-surface p-5 shadow-lg shadow-accent/10"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
          Now reading
        </p>
        <SentenceList
          chunks={chunks}
          activeIndex={playerState.sentenceIndex}
          status={playerState.status}
        />
        {chunks.length === 0 && (
          <p className="m-auto max-w-[16rem] text-center text-on-surface">
            Select some text on a page, right-click, and choose{' '}
            <strong className="text-on-primary">Read Aloud</strong>.
          </p>
        )}
      </section>

      <PlayerControls status={playerState.status} speed={speed} onSpeedChange={setSpeed} />
      <Toast visible={playerState.status === 'playing'} />
    </main>
  );
}
