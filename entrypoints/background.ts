import {
  PENDING_READING_KEY,
  type PageRequest,
  type PendingReading,
  type SelectionResponse,
} from '@/lib/messages';

const MENU_ID = 'read-aloud';

/**
 * Open the side panel. Browsers only allow this directly inside the user's
 * click, so it must run BEFORE any `await`. This is the one place where
 * Chromium and Firefox differ.
 */
function openPanel(tabId: number): void {
  if (import.meta.env.FIREFOX) {
    // WXT's types follow Chrome's API, which has no `sidebarAction`.
    const firefox = browser as unknown as {
      sidebarAction: { open(): Promise<void> };
    };
    firefox.sidebarAction.open().catch(console.error);
  } else {
    browser.sidePanel.open({ tabId }).catch(console.error);
  }
}

/** Ask the page for the current selection. Falls back to the menu's own copy. */
async function getSelectedText(tabId: number, fallback: string): Promise<string> {
  try {
    await browser.scripting.executeScript({
      target: { tabId },
      files: ['/content-scripts/reader.js'],
    });
    await browser.scripting.insertCSS({
      target: { tabId },
      files: ['/content-scripts/reader.css'],
    }).catch(() => {
      // Ignore if CSS fails to load, e.g. on pages that don't support it
    });
    const request: PageRequest = { type: 'get-selection' };
    const response: SelectionResponse | undefined = await browser.tabs.sendMessage(
      tabId,
      request,
    );
    return response?.text || fallback;
  } catch {
    // The page can't be scripted (browser-internal page, an iframe, ...).
    return fallback;
  }
}

export default defineBackground(() => {
  browser.runtime.onInstalled.addListener(() => {
    browser.contextMenus.create({
      id: MENU_ID,
      title: 'Read Aloud',
      contexts: ['selection'],
    });
  });

  // Not async on purpose: the panel must open before the first await.
  browser.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId !== MENU_ID || tab?.id == null) return;
    const tabId = tab.id;

    openPanel(tabId);

    getSelectedText(tabId, info.selectionText ?? '').then(async (text) => {
      if (!text) return;
      const pending: PendingReading = {
        readingId: crypto.randomUUID(),
        tabId,
        windowId: tab.windowId ?? -1,
        tabTitle: tab.title ?? '',
        favIconUrl: tab.favIconUrl ?? '',
        text,
      };
      await browser.storage.session.set({ [PENDING_READING_KEY]: pending });
    });
  });
});
