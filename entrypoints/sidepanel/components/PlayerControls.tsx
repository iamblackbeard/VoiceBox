import { useState } from 'react';
import { PlayIcon, SpeedIcon, VoiceIcon } from './icons';
import { player, type PlayerStatus } from '@/lib/player';
import Popup from './Popup';
import SpeedPopup from './SpeedPopup';

const side =
  'flex h-14 w-14 items-center justify-center rounded-full border border-border bg-surface text-on-surface transition disabled:cursor-not-allowed disabled:opacity-50';

interface PlayerControlsProps {
  status: PlayerStatus;
  speed: number;
  onSpeedChange: (speed: number) => void;
}

/**
 * The three round buttons: Speed (left), Play/Pause (middle, bigger), Voice (right).
 */
export default function PlayerControls({ status, speed, onSpeedChange }: PlayerControlsProps) {
  const [speedPopupOpen, setSpeedPopupOpen] = useState(false);

  const isPlaying = status === 'playing';
  const isBuffering = status === 'downloading' || status === 'buffering';
  const isEnded = status === 'ended';
  const isError = status === 'error';
  const disabled = status === 'idle' || isError || isEnded;

  const onPlayPause = () => {
    if (isPlaying) {
      player.pause();
    } else {
      player.resume();
    }
  };

  return (
    <div className="flex items-center justify-center gap-6 pb-2">
      <div className="relative">
        <button
          id="speed-button"
          type="button"
          aria-label="Speed"
          onClick={() => setSpeedPopupOpen(!speedPopupOpen)}
          className={side}
        >
          <SpeedIcon />
        </button>
        <Popup
          anchorId="speed-button"
          visible={speedPopupOpen}
          onClose={() => setSpeedPopupOpen(false)}
        >
          <SpeedPopup speed={speed} onSpeedChange={onSpeedChange} />
        </Popup>
      </div>
      <button
        id="play-button"
        type="button"
        aria-label={isPlaying ? 'Pause' : 'Play'}
        disabled={disabled}
        onClick={onPlayPause}
        className="flex h-20 w-20 items-center justify-center rounded-full bg-accent text-on-accent shadow-lg shadow-accent/30 transition disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isBuffering ? (
          <span className="flex h-6 w-6 animate-spin rounded-full border-2 border-on-accent border-t-transparent" />
        ) : isPlaying ? (
          <span className="h-6 w-6 border-l-4 border-r-4 border-on-accent" />
        ) : (
          <PlayIcon />
        )}
      </button>
      <button id="voice-button" type="button" aria-label="Voice" disabled className={side}>
        <VoiceIcon />
      </button>
    </div>
  );
}
