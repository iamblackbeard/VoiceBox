import { useEffect, useRef } from 'react';
import { player } from '@/lib/player';

interface SentenceListProps {
  chunks: string[];
  activeIndex: number;
  status: string;
}

/**
 * Renders selected text as flowing prose.
 * Each sentence is an inline, clickable span — hover highlights it,
 * clicking seeks audio and on-page highlight to that sentence.
 * Active sentence glows in accent color; past sentences dim gently.
 */
export default function SentenceList({ chunks, activeIndex, status }: SentenceListProps) {
  const activeRef = useRef<HTMLSpanElement>(null);

  const isInteractive =
    status === 'playing' ||
    status === 'buffering' ||
    status === 'paused' ||
    status === 'ended';

  // Auto-scroll active sentence into view
  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [activeIndex]);

  if (chunks.length === 0) return null;

  const handleSeek = (index: number) => {
    if (!isInteractive) return;
    player.seek(index);
  };

  return (
    <p
      aria-label="Reading passage"
      className="min-h-0 flex-1 overflow-y-auto leading-relaxed text-[15px] text-on-primary"
      style={{ wordBreak: 'break-word' }}
    >
      {chunks.map((chunk, i) => {
        const isActive = i === activeIndex && (status === 'playing' || status === 'buffering' || status === 'paused');
        const isPast = i < activeIndex && (status === 'playing' || status === 'buffering' || status === 'paused');

        return (
          <span
            key={i}
            ref={isActive ? activeRef : undefined}
            role="button"
            tabIndex={isInteractive ? 0 : -1}
            id={`sentence-${i}`}
            aria-label={`Sentence ${i + 1}${isActive ? ' — playing' : ''}`}
            aria-current={isActive ? 'true' : undefined}
            onClick={() => handleSeek(i)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleSeek(i); }}
            className={[
              'rounded px-[2px] py-[1px] transition-all duration-150',
              isInteractive ? 'cursor-pointer' : 'cursor-default',
              isActive
                ? 'bg-accent/25 text-on-primary font-medium shadow-[0_0_0_1.5px_var(--color-accent)_inset] rounded-sm'
                : isPast
                ? 'text-on-primary/40'
                : isInteractive
                ? 'hover:bg-accent/10 hover:text-on-primary'
                : '',
            ].join(' ')}
          >
            {chunk}
          </span>
        );
      })}
    </p>
  );
}
