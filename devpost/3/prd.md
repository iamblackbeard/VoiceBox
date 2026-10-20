---
doc: prd
status: approved
---

# Local Voice Reader — UX Polish & Interactive Companion (Milestone 3) — Product Requirements

A privacy-first local text-to-speech browser extension fine-tuned into an interactive reading companion. Features clickable sentence scrubbing that synchronizes side panel and on-page highlights, tab-origin awareness with instant tab switching, a collapsible mini-player, volume management, and zero-latency replay powered by in-memory audio chunk caching. Built for screen-fatigued, privacy-conscious readers navigating multi-tab workflows.
Source: `scope.md > The Unique Kernel`, `scope.md > Who It's For`.

## The Core Journey
1. The user selects text on any webpage, right-clicks, and chooses **Read Aloud**.
2. The browser side panel opens, styled in the user's saved Light or Dark theme (with a sun/moon theme toggle at the top right).
3. The side panel header immediately displays the originating tab title and icon; clicking this header focuses that tab instantly if the user switches to other tabs.
4. The selected text is parsed and rendered as an interactive, numbered sentence list in the side panel.
5. As speech starts, the currently spoken sentence highlights in active sync both in the side panel list and on the webpage itself, smoothly autoscrolling to stay in view.
6. The user can click any sentence in the side panel list at any time to immediately seek audio playback and jump the on-page highlight to that sentence without waiting for audio re-generation.
7. The user can adjust loudness at any moment by clicking the volume icon at the bottom right to open a slider popover.
8. If the user needs more screen real estate while listening, they click the collapse icon to tuck the sentence reader into a compact mini-player bar; audio continues playing smoothly.
9. Clicking the expand icon in the mini-player restores the full sentence reader view.
10. When the final sentence finishes playing, the play button changes to a **Replay** button; clicking it instantly replays the passage from the beginning using in-memory cached audio chunks with zero preparation delay.
11. If the user selects a new passage on any tab and clicks Read Aloud, the cache is flushed and the new reading begins.

Success: The reader experiences effortless navigation between tabs, interactive sentence scrubbing with instantaneous response, comfortable viewing in day or night themes, and instant passage replay without a single byte of data leaving their local machine.
Source: `scope.md > The Core Loop`, `scope.md > What "Working" Looks Like`.

## Screens and Layout

The product operates across three visible surfaces: the **Side Panel** (with Full and Mini-Player modes), the **Extension Toolbar Popup**, and the **Active Webpage**.

### 1. The Side Panel — Full Mode
- **Header Bar (Top):**
  - Left / Center: Originating Tab badge with favicon and truncated page title. Hover effect indicates clickability; clicking focuses that tab.
  - Right: Theme toggle button (sun/moon icon) and Mini-Player collapse toggle button.
- **Reading Body (Center):**
  - Interactive sentence stream: Vertical scrolling container showing each sentence as a distinct readable item with its sequence number or comfortable paragraph spacing.
  - Active sentence receives prominent accent highlighting and subtle elevation.
  - Hover state on sentences displays a subtle scrub indicator.
- **Player Controls Bar (Bottom):**
  - Centered primary controls: Speed button (left), Play/Pause/Replay primary button (middle, enlarged), Voice selector button (right).
  - Far Right: Volume icon button (opens volume popover slider).
- **Popovers:**
  - Speed Popover: Slider from 0.25x to 2.0x positioned above the Speed button.
  - Voice Popover: List of local voices positioned above the Voice button.
  - Volume Popover: Vertical or horizontal volume slider (0% to 100%) and mute toggle positioned above the Volume button.
- **Status & Toast:**
  - Status banner at top for model initialization or error alerts.
  - Floating toast notification for transient status updates (e.g. "Replaying from cache", "Tab focused").

### 2. The Side Panel — Mini-Player Mode
- Replaces the full vertical sentence list with a compact, docked player strip (approx 60–72px height).
- Displays:
  - Mini tab origin indicator and current sentence snippet (single-line truncated with ellipsis).
  - Compact controls: Play/Pause/Replay button, Volume icon, and Expand button.
- Keeps audio running seamlessly across mode transitions.

### 3. The Extension Toolbar Popup
- Header with extension branding and the Sun/Moon theme toggle button (mirrored and synced with side panel).
- Engine configuration controls (Kokoro / Piper selector, WebGPU acceleration badge and status).
- Quick link or button to open the side panel.

### 4. The Active Webpage Surface
- Sentence highlight overlay applied to the currently spoken sentence on the host page.
- Instant position updates when the user clicks sentences in the side panel or scrubs playback.

Source: `scope.md > The POC Boundary`, `scope.md > Inspiration & Identity`.

## Look and Feel
- **Aesthetic Direction:** Spotify-like agility meets native browser utility. Clean, distraction-free, modern dark and light aesthetics.
- **Semantic Design Tokens:** All colors, backgrounds, borders, and text adhere strictly to semantic CSS tokens. Zero hardcoded hex colors in component styles:
  - `--bg-primary`: Main application background (Pure light / deep dark navy).
  - `--bg-secondary`: Secondary surface background for player bar and cards.
  - `--bg-surface`: Elevated cards, popovers, and interactive sentence hover backgrounds.
  - `--text-on-primary`: High-contrast body text for readability.
  - `--text-muted`: Low-contrast secondary text for sentence numbers and metadata.
  - `--border`: Clean subtle boundary lines for popovers, headers, and separators.
  - `--accent`: Primary active tint (vibrant blue or indigo) for active sentence highlight, focus rings, and active buttons.
  - `--accent-subtle`: Translucent accent wash for sentence reading background highlight.
- **Typography:** Modern, crisp sans-serif stack (`system-ui`, `-apple-system`, `Inter`, `Roboto`, `sans-serif`) optimized for high legibility during prolonged reading sessions.
- **Motion & Transitions:** Subtle 150–200ms ease transitions for theme swaps, popover reveals, and sentence highlight progression. No disorienting layout shifts.

Source: `scope.md > Inspiration & Identity`.

## Features and Behavior

### Theme Switching and Single-Source Persistence
- Both the side panel and the extension popup feature a dedicated Sun/Moon theme toggle at top-right.
- Toggling the theme immediately updates all open extension surfaces without reload.
- The active theme (`light` or `dark`) is persisted in `browser.storage.local`.
- On cold start, the side panel and popup read the stored theme (falling back to the operating system's `prefers-color-scheme` if unset).
  - [ ] Clicking the theme toggle switches between Light and Dark mode.
  - [ ] All UI surfaces update instantly using semantic tokens without hardcoded color flashes.
  - [ ] Changing theme in popup updates side panel and vice-versa.
  - [ ] Closing and reopening the browser or side panel retains the chosen theme.

### Originating Tab Awareness & Focus Navigation
- The side panel tracks the browser tab ID, window ID, and title from which the text selection originated.
- The top header renders a tab pill showing the originating page title (and favicon if accessible).
- When the user is working or browsing in a different tab, clicking this header tab pill immediately switches focus to the reading tab via `browser.tabs.update`.
- If the originating tab is closed during reading, the header updates gracefully to indicate "[Closed Tab]" while audio finishes playing existing cached chunks.
  - [ ] Header displays the title of the tab being read.
  - [ ] Clicking the header immediately switches the browser's active tab to the originating tab.
  - [ ] If user switches tabs, the indicator remains accurate.

### Interactive Sentence Reader & Click-to-Seek Scrubbing
- The side panel renders the selected text split cleanly into identifiable sentence blocks.
- The sentence currently being voiced receives active highlighting and is autoscrolled into view if outside the visible viewport.
- The user can click any sentence in the list:
  - Speech playback immediately jumps to that sentence.
  - Any currently active audio buffer terminates cleanly.
  - On-page highlight shifts to the target sentence on the webpage.
  - Audio chunk for the target sentence plays immediately from the in-memory cache if already generated, or begins synthesis promptly.
  - [ ] Side panel renders all sentences of the selection in order.
  - [ ] Currently playing sentence is highlighted both in side panel and on host webpage.
  - [ ] Clicking an earlier or later sentence seeks playback to that sentence without error.
  - [ ] Clicking a sentence updates webpage highlight to that specific sentence.

### Collapsible Mini-Player Mode
- The side panel includes a collapse/expand toggle button.
- When collapsed, the sentence list collapses into a sleek compact dock bar showing the active sentence snippet and playback controls.
- Playback continues seamlessly across mode toggles without audio popping, pause, or jitter.
- Clicking the expand button restores the full sentence list view, keeping the active sentence in view.
  - [ ] Clicking collapse tucks the sentence reader into the mini-player bar.
  - [ ] Audio playback continues uninterrupted during collapse.
  - [ ] Clicking expand restores the full sentence list view.

### Volume Control Popover
- A dedicated volume icon button resides on the bottom right of the player bar.
- Clicking it toggles a popover containing an audio volume slider (0% to 100%) and a quick mute/unmute button.
- Adjusting the slider immediately adjusts the output gain of the active audio element/AudioContext.
- The volume icon dynamically reflects the state: Muted (0%), Low (<50%), High (≥50%).
- Volume level persists across readings in the current session.
  - [ ] Clicking the volume button opens the volume slider popup.
  - [ ] Sliding volume alters playback loudness in real time.
  - [ ] Sliding to 0 or clicking mute mutes audio; unmute restores prior volume.
  - [ ] Volume icon visual changes according to volume level.

### Replay & In-Memory Audio Chunk Caching
- As sentences are synthesized during reading, their decoded audio chunks are retained in an in-memory session cache mapped by sentence index.
- When the final sentence finishes playing, the Play/Pause button transitions into a **Replay** button (circular restart icon).
- Clicking Replay starts playback from sentence 0 immediately with zero synthesis delay or buffering wait.
- In-memory cache invalidation rules:
  - Cleared immediately when the user triggers Read Aloud on a new text selection.
  - Cleared when the side panel is closed after playback completes.
  - Cleared automatically after a 10-minute idle period to free browser memory.
  - Strictly in-memory: no audio data is written to IndexedDB or OPFS, upholding zero-trace privacy.
  - [ ] When reading ends, the center control displays the Replay icon.
  - [ ] Clicking Replay restarts audio from sentence 1 instantly with zero model generation lag.
  - [ ] Seeking to already-played sentences is instantaneous due to in-memory chunk reuse.
  - [ ] Initiating a new selection replaces the cache with fresh data.

Source: `scope.md > The POC Boundary`, `scope.md > What "Working" Looks Like`.

## States and Boundaries

- **First Run / Fresh Session:** Default theme initialized (persisted or OS preference), audio cache empty, side panel ready.
- **Normal Playback (Full View):** Sentences displayed, active sentence highlighted and auto-scrolled, play button shows Pause, tab header shows active reading tab.
- **Mini-Player Collapsed State:** Sentence list hidden, compact control strip active, audio uninterrupted.
- **Seeking / Scrubbing State:** Sentence clicked; audio switches immediately to target sentence; on-page highlight updates.
- **Playback Completed State:** Audio stops, on-page highlight clears, play button transforms into Replay button.
- **Replay State:** Clicked Replay; plays from beginning instantly from memory cache.
- **Cache Invalidation State:** New selection made, panel closed after completion, or 10-minute idle timeout elapsed; memory buffers freed.
- **Background Reading State:** Tab origin header remains active even if user switches tabs; clicking it brings tab to focus.
- **Privacy Boundary:** Strict local processing. All audio chunks reside strictly in temporary volatile memory and never touch disk (IndexedDB/OPFS) or remote endpoints.

## Product Decisions

- **In-Memory Audio Chunk Caching instead of Disk Storage:**
  - *Decision:* Cache generated sentence audio chunks strictly in browser volatile memory rather than saving to IndexedDB or filesystem.
  - *Reasoning:* Prevents disk accumulation, eliminates file management overhead, and strictly enforces the project's zero-trace privacy promise.
- **Click-to-Seek Sentence List over Freeform Waveform Scrubber:**
  - *Decision:* Let the user click individual sentence cards/rows to seek, rather than a continuous pixel-level audio waveform scrubber.
  - *Reasoning:* Web reading is naturally sentence-bounded. Sentence scrubbing gives precise cognitive orientation without requiring complex audio timecode mapping.
- **Originating Tab Header with Instant Jump:**
  - *Decision:* Dedicate header space to show the playing tab and provide one-click focus switching.
  - *Reasoning:* Readers frequently switch tabs to research or multitask while listening; tab awareness eliminates disorientation and hunting for the source tab.
- **Collapsible Mini-Player within Side Panel:**
  - *Decision:* Provide a collapsible mini-player toggle inside the side panel rather than trying to spawn floating browser popups or picture-in-picture windows.
  - *Reasoning:* Leverages the native side panel container, requires no special permissions, and keeps the user's workspace tidy.
- **Strict Semantic CSS Tokens for Theming:**
  - *Decision:* Refactor all CSS to rely exclusively on semantic tokens shared between light and dark modes.
  - *Reasoning:* Guarantees visual harmony, avoids unreadable contrast bugs, and makes theme maintenance effortless.

Source: `scope.md > The Unique Kernel`, `scope.md > Inspiration & Identity`.

## What We're Building

- [ ] Light & Dark mode toggle with persistent storage in `browser.storage.local` across side panel and popup.
- [ ] Strict semantic design token architecture for all UI components.
- [ ] Originating tab indicator in side panel header with click-to-focus tab navigation.
- [ ] Interactive sentence list in side panel with synchronized live highlighting and click-to-seek playback.
- [ ] Collapsible mini-player toggle maintaining uninterrupted audio playback.
- [ ] Dedicated volume control popover with slider, mute toggle, and dynamic volume icons.
- [ ] Replay button transition at end of playback.
- [ ] In-memory audio chunk caching system for zero-latency replay and scrubbing with automatic invalidation.

## Deferred From the POC

- **System Media Keys Integration:** Hardware keyboard media keys (Play/Pause, Next/Previous) deferred to maintain tight focus on in-panel UX polish.
- **Offscreen Audio Document:** Keeps playback alive even if side panel window is explicitly closed by user; deferred to keep audio architecture simple and contained.
- **Visual Audio Waveform Scrubber:** Deferred in favor of the much more practical sentence-level scrubber.

Source: `scope.md > Later`.

## Possible Later Enhancements

- Word-by-word visual karaoke highlighting within the active sentence.
- Adjustable sentence font size and line spacing preferences in the side panel.
- Exporting synthesized audio passage as a local `.wav` file.
- Multi-voice role assignment for conversational articles.

## Non-Goals

- No cloud TTS or external API requests (absolute privacy guarantee).
- No persistent on-disk audio caching (no IndexedDB or OPFS audio persistence).
- No multi-tab simultaneous audio playback or queuing (single active reading stream only).

Source: `scope.md > Explicitly Cut`.

## Open Questions

- Exact threshold for mini-player height (approx 64px recommended). Can be refined during build.
- Auto-scroll easing behavior when user manually scrolls sentence list while playback is active (whether to pause auto-scroll temporarily).
- Favicon extraction strategy for host tab if tab icon is restricted by browser security policies (fallback to clean generic document icon).
