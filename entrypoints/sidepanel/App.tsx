import { useEffect, useRef, useState } from 'react';
import { PENDING_READING_KEY, type PendingReading } from '@/lib/messages';
import StatusBar from './components/StatusBar';
import SentenceList from './components/SentenceList';
import PlayerControls from './components/PlayerControls';
import Toast from './components/Toast';
import { player, type PlayerState } from '@/lib/player';
import { chunkText } from '@/lib/chunker';

export default function App() {
  const [reading, setReading] = useState<PendingReading | null>(null);
  const [chunks, setChunks] = useState<string[]>([]);
  const [playerState, setPlayerState] = useState<PlayerState>({
    status: 'idle',
    message: null,
    sentenceIndex: -1,
    totalSentences: 0,
  });
  const [speed, setSpeed] = useState(1.0);

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

  return (
    <main className="mx-auto flex h-full max-w-md flex-col gap-4 bg-primary p-5 text-on-primary">
      <h1 className="sr-only">Local Voice Reader</h1>
      <StatusBar message={playerState.message} />

      {/* Interactive sentence stream — replaces the old NowReading text dump */}
      <section
        aria-label="Now reading"
        className="flex min-h-0 flex-1 flex-col gap-3 rounded-3xl border border-border bg-surface p-5 shadow-lg shadow-accent/10"
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
