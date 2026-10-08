/**
 * Typed messages and shared shapes for the three pieces of the extension:
 * background script, content script (on the page), and the side panel.
 */

/** Key under which the background script leaves the next reading for the panel. */
export const PENDING_READING_KEY = 'pendingReading';

/**
 * The hand-off from the background script to the side panel.
 * It lives in `storage.session` (memory only) because the panel may not be
 * loaded yet when the user clicks "Read Aloud", so it can't just be messaged.
 */
export interface PendingReading {
  /** New for every "Read Aloud" click, so late results for an old reading can be dropped. */
  readingId: string;
  tabId: number;
  /** The selected text. (Slice 2 turns this into sentence chunks.) */
  text: string;
}

/** Messages the background script or panel sends to the content script on the page. */
export type PageRequest =
  | { type: 'get-selection' }
  | { type: 'highlight'; chunkIndex: number }
  | { type: 'clear' };

/** The content script's answer to `get-selection`. */
export interface SelectionResponse {
  text: string;
}
