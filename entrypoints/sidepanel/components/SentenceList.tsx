import { useEffect, useRef } from 'react';
import { player } from '@/lib/player';

interface SentenceListProps {
  chunks: string[];
  activeIndex: number;
  status: string;
}

/**
 * Interactive numbered sentence stream.
 * Highlights the active sentence in lockstep with audio playback.
 * Clicking any sentence seeks audio and on-page highlight to that sentence.
 */
export default function SentenceList({ chunks, activeIndex, status }: SentenceListProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  const isPlaying = status === 'playing' || status === 'buffering' || status === 'paused';

  // Auto-scroll the active sentence into view
  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [activeIndex]);

  if (chunks.length === 0) return null;

  const handleSeek = (index: number) => {
    if (!isPlaying && status !== 'ended') return;
    player.seek(index);
  };

  return (
    <div
      ref={listRef}
      role="list"
      aria-label="Sentence list"
      className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1"
    >
      {chunks.map((chunk, i) => {
        const isActive = i === activeIndex && isPlaying;
        const isPast = i < activeIndex && isPlaying;

        return (
          <button
            key={i}
            ref={isActive ? activeRef : undefined}
            type="button"
            role="listitem"
            id={`sentence-${i}`}
            aria-label={`Sentence ${i + 1}${isActive ? ' (playing)' : ''}`}
            aria-current={isActive ? 'true' : undefined}
            onClick={() => handleSeek(i)}
            className={[
              'group flex w-full cursor-pointer items-start gap-3 rounded-2xl px-4 py-3 text-left transition-all duration-150',
              isActive
                ? 'bg-accent/15 ring-1 ring-accent/40 shadow-sm'
                : isPast
                ? 'opacity-40 hover:opacity-70 hover:bg-surface'
                : 'hover:bg-surface',
            ].join(' ')}
          >
            {/* Sentence number badge */}
            <span
              className={[
                'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold leading-none transition-colors',
                isActive
                  ? 'bg-accent text-on-accent'
                  : 'bg-border text-on-surface group-hover:bg-accent/30',
              ].join(' ')}
            >
              {i + 1}
            </span>

            {/* Sentence text */}
            <span
              className={[
                'flex-1 text-sm leading-relaxed transition-colors',
                isActive ? 'font-medium text-on-primary' : 'text-on-surface',
              ].join(' ')}
            >
              {chunk.trim()}
              {/* Animated sound wave indicator for the active sentence */}
              {isActive && status === 'playing' && (
                <span
                  aria-hidden="true"
                  className="ml-2 inline-flex items-end gap-[2px] align-middle"
                >
                  {[1, 2, 3].map((bar) => (
                    <span
                      key={bar}
                      className="inline-block w-[3px] rounded-full bg-accent"
                      style={{
                        height: `${8 + bar * 3}px`,
                        animation: `bounce 0.8s ease-in-out infinite`,
                        animationDelay: `${(bar - 1) * 0.15}s`,
                      }}
                    />
                  ))}
                </span>
              )}
            </span>
          </button>
        );
      })}

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: scaleY(0.5); }
          50%       { transform: scaleY(1.2); }
        }
      `}</style>
    </div>
  );
}
