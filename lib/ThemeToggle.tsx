import { useTheme } from '@/lib/theme';

interface ThemeToggleProps {
  id?: string;
  className?: string;
}

/**
 * Sun/Moon Theme Toggle Button
 *
 * Renders Moon icon when current theme is light (click switches to dark).
 * Renders Sun icon when current theme is dark (click switches to light).
 * Works across both the Side Panel header and Toolbar Popup.
 */
export function ThemeToggle({ id = 'theme-toggle', className = '' }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      id={id}
      type="button"
      onClick={toggleTheme}
      aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
      title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
      className={`flex h-7 w-7 items-center justify-center rounded-full border border-border bg-surface text-on-surface hover:border-accent hover:text-accent transition cursor-pointer shrink-0 ${className}`}
    >
      {theme === 'dark' ? (
        // Sun icon
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-3.5 w-3.5"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
        </svg>
      ) : (
        // Moon icon
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-3.5 w-3.5"
          aria-hidden="true"
        >
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
        </svg>
      )}
    </button>
  );
}
export default ThemeToggle;
