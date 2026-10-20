import { useState } from 'react';
import { PlayIcon, SpeedIcon, VoiceIcon } from './icons';
import { player, type PlayerStatus } from '@/lib/player';
import Popup from './Popup';
import SpeedPopup from './SpeedPopup';
import VoicePopup from './VoicePopup';

const side =
  'flex h-14 w-14 items-center justify-center rounded-full border border-border bg-surface text-on-surface transition disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer';

interface PlayerControlsProps {
  status: PlayerStatus;
  speed: number;
  onSpeedChange: (speed: number) => void;
}

/** Circular replay icon — two arrows in a circle. */
function ReplayIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-7 w-7"
      aria-hidden="true"
    >
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  );
}

/**
 * The three round buttons: Speed (left), Play/Pause/Replay (middle, bigger), Voice (right).
 * When status is 'ended', the center button transforms into a circular Replay button.
 */
export default function PlayerControls({ status, speed, onSpeedChange }: PlayerControlsProps) {
  const [speedPopupOpen, setSpeedPopupOpen] = useState(false);
  const [voicePopupOpen, setVoicePopupOpen] = useState(false);

  const isPlaying = status === 'playing';
  const isBuffering = status === 'downloading' || status === 'buffering';
  const isEnded = status === 'ended';
  const isError = status === 'error';

  // In the new Web Audio model, the center button is actionable in all non-idle/error states
  const disabled = status === 'idle' || isError;

  const onPlayPause = () => {
    if (isEnded) {
      player.replay();
    } else if (isPlaying) {
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
          onClick={() => {
            setSpeedPopupOpen(!speedPopupOpen);
            setVoicePopupOpen(false);
          }}
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
        aria-label={isEnded ? 'Replay' : isPlaying ? 'Pause' : 'Play'}
        disabled={disabled}
        onClick={onPlayPause}
        className={[
          'flex h-20 w-20 items-center justify-center rounded-full shadow-lg transition disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer',
          isEnded
            ? 'bg-surface border-2 border-accent text-accent shadow-accent/20 hover:bg-accent/10'
            : 'bg-accent text-on-accent shadow-accent/30',
        ].join(' ')}
      >
        {isBuffering ? (
          <span className="flex h-6 w-6 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : isEnded ? (
          <ReplayIcon />
        ) : isPlaying ? (
          <span className="flex gap-1">
            <span className="h-6 w-[5px] rounded-sm bg-current" />
            <span className="h-6 w-[5px] rounded-sm bg-current" />
          </span>
        ) : (
          <PlayIcon />
        )}
      </button>

      <div className="relative">
        <button
          id="voice-button"
          type="button"
          aria-label="Voice"
          onClick={() => {
            setVoicePopupOpen(!voicePopupOpen);
            setSpeedPopupOpen(false);
          }}
          className={side}
        >
          <VoiceIcon />
        </button>
        <Popup
          anchorId="voice-button"
          visible={voicePopupOpen}
          onClose={() => setVoicePopupOpen(false)}
        >
          <VoicePopup onClose={() => setVoicePopupOpen(false)} />
        </Popup>
      </div>
    </div>
  );
}
