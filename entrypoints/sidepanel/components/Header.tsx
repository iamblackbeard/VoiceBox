import type { PendingReading } from '@/lib/messages';

interface HeaderProps {
  reading: PendingReading | null;
  /** Set to true when the originating tab has been closed. */
  originTabClosed: boolean;
}

/** Small favicon image with a graceful fallback to a generic page icon. */
function Favicon({ src, title }: { src: string; title: string }) {
  if (!src) {
    return (
      <span
        className="flex h-4 w-4 shrink-0 items-center justify-center rounded-sm bg-surface text-[10px]"
        aria-hidden="true"
      >
        📄
      </span>
    );
  }
  return (
    <img
      src={src}
      alt=""
      aria-hidden="true"
      className="h-4 w-4 shrink-0 rounded-sm object-contain"
      onError={(e) => {
        // Replace broken favicon img with a generic icon span
        const span = document.createElement('span');
        span.className = 'flex h-4 w-4 shrink-0 items-center justify-center rounded-sm bg-surface text-[10px]';
        span.setAttribute('aria-hidden', 'true');
        span.textContent = '📄';
        e.currentTarget.replaceWith(span);
      }}
      title={title}
    />
  );
}

/**
 * Side panel header row.
 * Shows the app name and an originating-tab pill that jumps focus back to the
 * reading tab when clicked. Gracefully degrades to a [Closed Tab] badge when
 * the source tab has been closed.
 */
export default function Header({ reading, originTabClosed }: HeaderProps) {
  const handleTabPillClick = () => {
    if (!reading || originTabClosed) return;
    browser.tabs
      .update(reading.tabId, { active: true })
      .then(() => {
        if (reading.windowId && reading.windowId !== -1) {
          browser.windows.update(reading.windowId, { focused: true }).catch(() => {});
        }
      })
      .catch((err) => console.warn('[Header] tabs.update failed:', err));
  };

  const displayTitle = originTabClosed
    ? '[Closed Tab]'
    : (reading?.tabTitle || 'Unknown page');

  return (
    <header className="flex items-center justify-between gap-3 pb-1">
      {/* App wordmark */}
      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-accent select-none">
        Listen
      </span>

      {/* Originating tab pill */}
      {reading && (
        <button
          id="origin-tab-pill"
          type="button"
          title={originTabClosed ? 'The source tab is closed' : `Go to: ${displayTitle}`}
          aria-label={originTabClosed ? 'Source tab closed' : `Return to ${displayTitle}`}
          disabled={originTabClosed}
          onClick={handleTabPillClick}
          className={[
            'flex max-w-[180px] items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all',
            originTabClosed
              ? 'cursor-not-allowed border-border text-on-surface opacity-60'
              : 'cursor-pointer border-border bg-surface text-on-surface hover:border-accent hover:text-accent',
          ].join(' ')}
        >
          {!originTabClosed && (
            <Favicon src={reading.favIconUrl} title={displayTitle} />
          )}
          <span className="truncate">{displayTitle}</span>
          {!originTabClosed && (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 16 16"
              fill="currentColor"
              className="h-3 w-3 shrink-0 opacity-60"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M6.22 3.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L9.94 8 6.22 4.28a.75.75 0 0 1 0-1.06z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </button>
      )}
    </header>
  );
}
