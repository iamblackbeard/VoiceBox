import { useEffect, useState } from 'react';
import { PENDING_READING_KEY, type PendingReading } from '@/lib/messages';
import StatusBar from './components/StatusBar';
import NowReading from './components/NowReading';
import PlayerControls from './components/PlayerControls';
import Toast from './components/Toast';
import { player, type PlayerState } from '@/lib/player';
import { chunkText } from '@/lib/chunker';

export default function App() {
  const [reading, setReading] = useState<PendingReading | null>(null);
  const [playerState, setPlayerState] = useState<PlayerState>({ status: 'idle', message: null });

  useEffect(() => {
    return player.subscribe(setPlayerState);
  }, []);

  // The panel may open before or after the background script saves the
  // selected text, so read what's already there AND listen for changes.
  useEffect(() => {
    let active = true;

    const handleNewReading = (newReading: PendingReading) => {
      setReading(newReading);
      const chunks = chunkText(newReading.text);
      player.play(chunks, newReading.readingId, newReading.tabId);
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
      <NowReading text={reading?.text ?? null} />
      <PlayerControls status={playerState.status} />
      <Toast visible={playerState.status === 'playing'} />
    </main>
  );
}
