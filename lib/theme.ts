import { useEffect, useState } from 'react';

/**
 * Theme Engine — single-source theme persistence for all extension surfaces.
 *
 * - Reads `theme` from `browser.storage.local` on mount.
 * - Falls back to OS `prefers-color-scheme` if not stored.
 * - Applies `data-theme="light"` or `data-theme="dark"` to `document.documentElement`.
 * - Listens to `browser.storage.onChanged` so all open surfaces sync in real time.
 */

export type Theme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'theme';

// ── Helpers ────────────────────────────────────────────────────────────────

function getBrowser(): any {
  if (typeof browser !== 'undefined' && browser?.storage) return browser;
  if (typeof globalThis !== 'undefined' && (globalThis as any).browser)
    return (globalThis as any).browser;
  if (typeof (globalThis as any).chrome !== 'undefined')
    return (globalThis as any).chrome;
  return undefined;
}

/** Resolve OS preference at call time. */
export function osTheme(): Theme {
  try {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
    }
  } catch {}
  return 'light';
}

/** Apply `data-theme` attribute to the document root and update `color-scheme`. */
export function applyTheme(theme: Theme): void {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', theme);
  document.documentElement.style.colorScheme = theme;
}

/** Read the stored theme. Returns null if nothing is stored. */
export async function loadStoredTheme(): Promise<Theme | null> {
  try {
    const b = getBrowser();
    const stored = await b?.storage?.local?.get([THEME_STORAGE_KEY, 'listen_theme']);
    const v = stored?.[THEME_STORAGE_KEY] ?? stored?.['listen_theme'];
    if (v === 'light' || v === 'dark') return v;
  } catch {}
  try {
    const local = localStorage.getItem(THEME_STORAGE_KEY) || localStorage.getItem('listen_theme');
    if (local === 'light' || local === 'dark') return local;
  } catch {}
  return null;
}

/** Persist and apply the chosen theme. */
export async function saveTheme(theme: Theme): Promise<void> {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    localStorage.setItem('listen_theme', theme);
  } catch {}
  try {
    const b = getBrowser();
    await b?.storage?.local?.set({
      [THEME_STORAGE_KEY]: theme,
      listen_theme: theme,
    });
  } catch {}
  applyTheme(theme);
}

/**
 * Initialise the theme engine for a surface:
 * 1. Apply stored theme (or OS fallback) immediately.
 * 2. Start listening to storage changes so this surface stays in sync.
 *
 * Returns a cleanup function that removes the storage listener.
 */
export function initThemeEngine(): () => void {
  loadStoredTheme().then((stored) => {
    applyTheme(stored ?? osTheme());
  });

  const handleChange = (
    changes: Record<string, { newValue?: unknown }>,
    area: string,
  ) => {
    if (area !== 'local') return;
    const v = changes[THEME_STORAGE_KEY]?.newValue ?? changes['listen_theme']?.newValue;
    if (v === 'light' || v === 'dark') {
      try {
        localStorage.setItem(THEME_STORAGE_KEY, v);
        localStorage.setItem('listen_theme', v);
      } catch {}
      applyTheme(v);
    }
  };

  const b = getBrowser();
  try {
    b?.storage?.onChanged?.addListener(handleChange);
  } catch {}

  return () => {
    try {
      b?.storage?.onChanged?.removeListener(handleChange);
    } catch {}
  };
}

/**
 * React hook: initialises the theme engine and provides the current theme
 * plus a toggle function. Keeps in sync with cross-surface changes.
 */
export function useTheme(): { theme: Theme; toggleTheme: () => Promise<void> } {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof document !== 'undefined') {
      const attr = document.documentElement.getAttribute('data-theme');
      if (attr === 'light' || attr === 'dark') return attr;
    }
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY) || localStorage.getItem('listen_theme');
      if (stored === 'light' || stored === 'dark') return stored;
    } catch {}
    return osTheme();
  });

  useEffect(() => {
    let mounted = true;

    // Load persisted value and update state
    loadStoredTheme().then((stored) => {
      const resolved = stored ?? osTheme();
      applyTheme(resolved);
      if (mounted) setTheme(resolved);
    });

    // Listen for cross-surface changes
    const handleChange = (
      changes: Record<string, { newValue?: unknown }>,
      area: string,
    ) => {
      if (area !== 'local') return;
      const v = changes[THEME_STORAGE_KEY]?.newValue ?? changes['listen_theme']?.newValue;
      if (v === 'light' || v === 'dark') {
        try {
          localStorage.setItem(THEME_STORAGE_KEY, v);
          localStorage.setItem('listen_theme', v);
        } catch {}
        applyTheme(v);
        if (mounted) setTheme(v);
      }
    };

    const b = getBrowser();
    try {
      b?.storage?.onChanged?.addListener(handleChange);
    } catch {}

    return () => {
      mounted = false;
      try {
        b?.storage?.onChanged?.removeListener(handleChange);
      } catch {}
    };
  }, []);

  const toggleTheme = async () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    await saveTheme(next);
  };

  return { theme, toggleTheme };
}
