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

  // Calculate the thumb position percentage for the current speed
  // This creates a transform that visually centers 1x in the middle of the track
  const min = 0.25;
  const max = 2;
  const normalPosition = ((speed - min) / (max - min)) * 100; // Current position (%)
  const targetPosition = ((1 - min) / (max - min)) * 100; // Where 1x naturally sits (42.86%)
  const centerPosition = 50; // Where we want 1x to be
  const offset = centerPosition - targetPosition; // Shift needed (+7.14%)

  return (
    <div className="flex w-64 flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-on-surface">Playback Speed</span>
        <span className="tabular-nums text-sm font-semibold text-on-primary">
          {speed.toFixed(2)}x
        </span>
      </div>
      <div className="relative">
        <input
          id="speed-slider"
          type="range"
          min="0.25"
          max="2"
          step="0.05"
          value={speed}
          onChange={handleSpeedChange}
          style={{
            // Shift the track and thumb so 1x appears centered
            transform: `translateX(${offset}%)`,
          }}
          className="h-2 w-full cursor-pointer appearance-none rounded-full bg-border accent-accent"
          aria-label="Playback speed"
          aria-valuemin={0.25}
          aria-valuemax={2}
          aria-valuenow={speed}
          aria-valuetext={`${speed.toFixed(2)}x speed`}
        />
      </div>
      <div className="flex justify-between text-xs text-on-surface">
        <span>0.25x</span>
        <span>1x</span>
        <span>2x</span>
      </div>
    </div>
  );
}
