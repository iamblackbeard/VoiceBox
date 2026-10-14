import { player } from '@/lib/player';

interface SpeedPopupProps {
  speed: number;
  onSpeedChange: (speed: number) => void;
}

/**
 * Speed slider popup (0.25x to 2x) that applies playbackRate to current and queued audio.
 */
export default function SpeedPopup({ speed, onSpeedChange }: SpeedPopupProps) {
  const handleSpeedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSpeed = parseFloat(e.target.value);
    onSpeedChange(newSpeed);
    player.setSpeed(newSpeed);
  };

  return (
    <div className="flex w-64 flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-on-surface">Playback Speed</span>
        <span className="tabular-nums text-sm font-semibold text-on-primary">
          {speed.toFixed(2)}x
        </span>
      </div>
      <input
        id="speed-slider"
        type="range"
        min="0.25"
        max="2"
        step="0.05"
        value={speed}
        onChange={handleSpeedChange}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-border accent-accent"
        aria-label="Playback speed"
        aria-valuemin={0.25}
        aria-valuemax={2}
        aria-valuenow={speed}
        aria-valuetext={`${speed.toFixed(2)}x speed`}
      />
      <div className="flex justify-between text-xs text-on-surface">
        <span>0.25x</span>
        <span>1x</span>
        <span>2x</span>
      </div>
    </div>
  );
}
