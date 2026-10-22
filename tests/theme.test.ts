import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  applyTheme,
  initThemeEngine,
  loadStoredTheme,
  saveTheme,
  THEME_STORAGE_KEY,
  type Theme,
} from '../lib/theme';
import fs from 'node:fs';
import path from 'node:path';

describe('Theme Engine & Storage Synchronization', () => {
  let mockStorage: Record<string, any>;
  let changeListeners: Array<(changes: any, area: string) => void>;

  beforeEach(() => {
    mockStorage = {};
    changeListeners = [];

    // Mock localStorage
    const localStore: Record<string, string> = {};
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => localStore[key] ?? null),
      setItem: vi.fn((key: string, val: string) => {
        localStore[key] = val;
      }),
      removeItem: vi.fn((key: string) => {
        delete localStore[key];
      }),
      clear: vi.fn(() => {
        Object.keys(localStore).forEach((k) => delete localStore[k]);
      }),
    });

    // Mock document
    const attributes: Record<string, string> = {};
    const style: Record<string, string> = {};
    vi.stubGlobal('document', {
      documentElement: {
        setAttribute: vi.fn((name: string, val: string) => {
          attributes[name] = val;
        }),
        getAttribute: vi.fn((name: string) => attributes[name] ?? null),
        style,
      },
    });

    // Mock window.matchMedia
    vi.stubGlobal('window', {
      matchMedia: vi.fn().mockImplementation((query: string) => ({
        matches: query.includes('dark'),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    // Mock browser
    vi.stubGlobal('browser', {
      storage: {
        local: {
          get: vi.fn(async (keys: string | string[]) => {
            if (Array.isArray(keys)) {
              const res: Record<string, any> = {};
              for (const k of keys) {
                if (k in mockStorage) res[k] = mockStorage[k];
              }
              return res;
            }
            return keys in mockStorage ? { [keys]: mockStorage[keys] } : {};
          }),
          set: vi.fn(async (items: Record<string, any>) => {
            Object.assign(mockStorage, items);
          }),
        },
        onChanged: {
          addListener: vi.fn((fn: any) => changeListeners.push(fn)),
          removeListener: vi.fn((fn: any) => {
            changeListeners = changeListeners.filter((l) => l !== fn);
          }),
        },
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('loadStoredTheme returns null when nothing is stored', async () => {
    const theme = await loadStoredTheme();
    expect(theme).toBeNull();
  });

  it('saveTheme persists theme to browser.storage.local and localStorage, and sets data-theme attribute', async () => {
    await saveTheme('dark');

    expect(mockStorage[THEME_STORAGE_KEY]).toBe('dark');
    expect(localStorage.setItem).toHaveBeenCalledWith(THEME_STORAGE_KEY, 'dark');
    expect(document.documentElement.setAttribute).toHaveBeenCalledWith('data-theme', 'dark');
    expect(document.documentElement.style.colorScheme).toBe('dark');

    const loaded = await loadStoredTheme();
    expect(loaded).toBe('dark');
  });

  it('saveTheme switches to light theme properly', async () => {
    await saveTheme('light');

    expect(mockStorage[THEME_STORAGE_KEY]).toBe('light');
    expect(document.documentElement.setAttribute).toHaveBeenCalledWith('data-theme', 'light');
    expect(document.documentElement.style.colorScheme).toBe('light');

    const loaded = await loadStoredTheme();
    expect(loaded).toBe('light');
  });

  it('initThemeEngine sets stored theme and synchronizes cross-surface when storage.onChanged fires', async () => {
    mockStorage[THEME_STORAGE_KEY] = 'dark';

    const cleanup = initThemeEngine();

    // Give the async loadStoredTheme time to resolve
    await new Promise((r) => setTimeout(r, 10));
    expect(document.documentElement.setAttribute).toHaveBeenCalledWith('data-theme', 'dark');

    // Simulate cross-surface change from another extension page (e.g. Popup -> Side Panel)
    for (const listener of changeListeners) {
      listener({ [THEME_STORAGE_KEY]: { newValue: 'light' } }, 'local');
    }

    expect(document.documentElement.setAttribute).toHaveBeenCalledWith('data-theme', 'light');
    expect(document.documentElement.style.colorScheme).toBe('light');

    cleanup();
    expect(browser.storage.onChanged.removeListener).toHaveBeenCalled();
  });
});

describe('Automated Audit: Zero Hardcoded Colors in Core Components', () => {
  const targetDirs = [
    path.resolve(__dirname, '../entrypoints/sidepanel'),
    path.resolve(__dirname, '../entrypoints/popup'),
  ];

  function getFiles(dir: string): string[] {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    let files: string[] = [];
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files = files.concat(getFiles(fullPath));
      } else if (entry.name.endsWith('.tsx') || (entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts'))) {
        files.push(fullPath);
      }
    }
    return files;
  }

  it('ensures no hardcoded hex color codes exist in sidepanel or popup component code', () => {
    const hexRegex = /#[0-9a-fA-F]{3,8}\b/g;
    const allFiles = targetDirs.flatMap(getFiles);

    const violations: { file: string; match: string }[] = [];

    for (const file of allFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      const matches = content.match(hexRegex);
      if (matches) {
        for (const match of matches) {
          violations.push({ file: path.relative(path.resolve(__dirname, '..'), file), match });
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it('ensures no hardcoded background, text, or border grayscale classes exist in sidepanel components', () => {
    // Side panel must strictly use semantic tokens: bg-primary, bg-surface, text-on-primary, text-on-surface, text-accent, border-border
    const nonSemanticRegex = /\b(bg|text|border)-(white|black|gray|slate|zinc|neutral|stone)-(100|200|300|400|500|600|700|800|900)\b/g;
    const sidepanelFiles = getFiles(path.resolve(__dirname, '../entrypoints/sidepanel'));

    const violations: { file: string; match: string }[] = [];

    for (const file of sidepanelFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      const matches = content.match(nonSemanticRegex);
      if (matches) {
        for (const match of matches) {
          violations.push({ file: path.relative(path.resolve(__dirname, '..'), file), match });
        }
      }
    }

    expect(violations).toEqual([]);
  });
});
