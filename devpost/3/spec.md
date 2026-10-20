---
doc: spec
status: approved
---

# Local Voice Reader — UX Polish & Interactive Companion (Milestone 3) — Technical Spec

## How This Works, In Plain Language

The application is a privacy-first browser extension designed to turn web text into a responsive, spoken reading companion. Nothing leaves the user's computer.

The system is organized into three primary layers that stay strictly decoupled:
1. **The Audio Engine (`lib/player.ts` & `lib/tts.worker.ts`):** Operates independently of the user interface. It slices text into sentences, schedules local speech synthesis (via WebGPU Kokoro or Piper WASM), manages playback timing through the Web Audio API, and stores decoded audio chunks in a volatile in-memory cache (`Map<number, AudioBuffer>`). When a user seeks to a sentence, the audio engine cancels any non-urgent background prefetching, prioritizes that specific sentence, and emits clean state updates.
2. **The Reactive User Interface (`entrypoints/sidepanel` & `entrypoints/popup`):** Built with React 19 and Tailwind CSS semantic tokens. The Side Panel acts as an observer of the audio engine: it displays the originating tab badge, renders the interactive sentence stream (or collapses into a compact 64px Mini-Player bar), and renders volume/speed popovers. It never touches raw audio buffers directly; it simply dispatches commands (`seek`, `replay`, `setVolume`, `toggleTheme`) and renders the state emitted by the engine.
3. **The Webpage Synchronizer (`entrypoints/reader.content.ts`):** Injected into the active webpage. It receives lightweight message events from the extension indicating which sentence index is currently active, scrolling the page and applying an on-page highlight overlay so the user's eyes stay in sync with the spoken voice.

Why this shape? Decoupling the audio engine from React ensures that audio playback never glitches, pops, or resets when the user collapses into mini-player mode, switches themes, or triggers component re-renders. Storing audio chunks in volatile memory provides instantaneous sentence scrubbing and zero-delay replay without touching disk storage, guaranteeing complete local privacy.

---

## The Core Journey Through the System

Traced step-by-step from [`prd.md > The Core Journey`](file:///home/blackbeard/Downloads/CODE/Extension/Listen/devpost/3/prd.md#L11-L26):

1. **Selection & Launch:** User highlights text on an article and clicks "Read Aloud" from the context menu.
   - `background.ts` captures the selection along with originating tab metadata (`tabId`, `windowId`, `title`, `favIconUrl`).
   - `background.ts` opens the side panel via `browser.sidePanel.open` and sends the text and tab metadata.
2. **Theme Initialization:** 
   - Side panel mounts, reads `theme` from `browser.storage.local` (falling back to OS `prefers-color-scheme`), and sets `data-theme` on the document root before first paint.
3. **Session Initialization & Decoupled Audio Setup:**
   - The side panel initializes `lib/player.ts` with the sentence array and tab metadata.
   - The engine flushes any prior session's audio chunk cache, creates a fresh `Map<number, AudioBuffer>`, and requests synthesis of sentence 0 from `tts.worker.ts`.
4. **Playback & Live Highlighting:**
   - As sentence 0 finishes synthesizing, `player.ts` plays the buffer through a Web Audio `GainNode`.
   - The player emits `onSentenceChange(0)`.
   - The side panel highlights sentence card 0 and auto-scrolls it into view.
   - A message `{ type: 'HIGHLIGHT_SENTENCE', index: 0 }` is sent to `reader.content.ts` on the originating tab, which scrolls and highlights the sentence on the host page.
   - In the background, `player.ts` queues synthesis of sentence 1 into the in-memory cache.
5. **Interactive Scrubbing (Click-to-Seek):**
   - User clicks sentence 4 in the side panel list.
   - UI calls `player.seek(4)`.
   - If sentence 4 is cached in `Map<number, AudioBuffer>`, it starts playing immediately with zero latency.
   - If sentence 4 is not yet synthesized, the audio engine aborts background prefetching, commands `tts.worker.ts` with priority for sentence 4, and resumes forward prefetch once loaded.
   - Concurrently, `reader.content.ts` receives `{ type: 'HIGHLIGHT_SENTENCE', index: 4 }` and shifts on-page highlight instantly.
6. **Volume Adjustment & Mini-Player Toggle:**
   - User clicks the volume button; a popover opens. Sliding volume calls `player.setGain(level)`, instantly modulating the audio node gain and saving the preference.
   - User clicks the collapse button; `entrypoints/sidepanel` sets `isMiniPlayer = true`. The sentence list is swapped for a 64px docked mini bar. Audio continues uninterrupted because `player.ts` lives outside the component lifecycle.
7. **Tab Navigation & Origin Awareness:**
   - User browses other tabs while listening.
   - The side panel header displays the originating tab's favicon and title.
   - User clicks the header tab badge; `browser.tabs.update(originTabId, { active: true })` brings the source tab directly to focus.
   - If the user closes the originating tab, `browser.tabs.onRemoved` checks the user's `onTabCloseAction` setting: if `'stop'`, playback halts; if `'continue'`, playback continues existing chunks and the badge displays `"[Closed Tab]"`.
8. **Replay from In-Memory Cache:**
   - The final sentence completes. The Play button transforms into a circular Replay icon.
   - User clicks Replay; `player.replay()` resets to sentence 0 and plays immediately from the in-memory cache with zero model latency.

---

## Stack

- **Extension Framework:** [WXT v0.21.4](https://wxt.dev/) — Next-gen WebExtension framework with TypeScript and Manifest V3 support.
- **UI Framework:** [React 19](https://react.dev/) — Declarative UI rendering for the Side Panel, Toolbar Popup, and Voices configuration view.
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/) with custom CSS semantic design tokens (`--bg-primary`, `--bg-secondary`, `--bg-surface`, `--text-on-primary`, `--text-muted`, `--border`, `--accent`, `--accent-subtle`).
- **Audio Synthesis & Engine:** 
  - [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API) (`AudioContext`, `AudioBufferSourceNode`, `GainNode`) for low-latency playback, instant seeking, volume control, and cache playback.
  - [kokoro-js v1.2.1](https://github.com/hexgrad/kokoro) & [onnxruntime-web v1.30.0](https://onnxruntime.ai/) for local WebGPU-accelerated TTS.
  - [@mintplex-labs/piper-tts-web v1.0.5](https://github.com/Mintplex-Labs/piper-tts-web) / WASM for offline CPU fallback TTS.
- **Runtime & Persistence:** Chrome / Chromium Browser Extension APIs (`browser.storage.local`, `browser.tabs`, `browser.contextMenus`, `browser.sidePanel`).

Rationale for choices:
- *WXT + React 19:* Preserves the learner's established TypeScript/React environment while providing hot-reloading and multi-target extension builds.
- *Decoupled Web Audio API Core:* Avoids HTML `<audio>` tag quirks and allows direct, synchronous playback of cached `AudioBuffer` chunks without decoding or re-fetching latency.
- *Strict Semantic CSS Tokens:* Eliminates hardcoded colors, ensuring immediate, defect-free contrast switching between Light and Dark modes.

---

## Where It Runs and How Someone Tries It

- **Runtime:** Chromium-based browsers (Chrome, Edge, Brave) supporting Manifest V3 and the Side Panel API. WebGPU support enabled in browser flags for Kokoro, with automated fallback to Piper WASM on CPU.
- **Environment:** Node.js 18+ (tested with Node 20/22). Zero external API keys, cloud tokens, or accounts required.
- **Start Command:**
  ```bash
  npm run dev
  ```
  WXT automatically launches a clean Chrome development profile with the unpacked extension loaded.
- **How Reviewers & Learners Try It for Hackathon Submission:**
  1. Open any web article (e.g., Wikipedia or a blog post).
  2. Select 3–5 sentences, right-click, and select **Read Aloud**.
  3. The side panel opens: observe the originating tab badge in the header, toggle the Sun/Moon theme button, and listen to the voice.
  4. Click on an earlier or later sentence in the side panel list to demonstrate click-to-seek scrubbing and on-page highlight tracking.
  5. Click the bottom-right volume icon to adjust loudness via the slider.
  6. Click the header collapse icon to switch into Mini-Player mode, verifying continuous audio playback.
  7. When reading ends, click the **Replay** button to prove instant playback from the in-memory cache.
  8. Open the extension popup from the toolbar to show synchronized theme state and tab close policy.

> [!NOTE]
> Hackathon submission requires a short 1–2 minute demo video and a public GitHub repository. Cloud deployment is not required; this local recording demonstrates all acceptance criteria.

---

## Look and Feel

Carried forward from [`prd.md > Look and Feel`](file:///home/blackbeard/Downloads/CODE/Extension/Listen/devpost/3/prd.md#L68-L82) and [`scope.md > Inspiration & Identity`](file:///home/blackbeard/Downloads/CODE/Extension/Listen/devpost/3/scope.md#L25-L27):

- **Aesthetic:** Spotify-like agility meets native browser utility. Clean, distraction-free, and accessible for long reading sessions.
- **Semantic Color Tokens (Root Variables):**
  - Light Mode:
    - `--bg-primary`: `#ffffff`
    - `--bg-secondary`: `#f8fafc`
    - `--bg-surface`: `#ffffff`
    - `--text-on-primary`: `#0f172a`
    - `--text-muted`: `#64748b`
    - `--border`: `#e2e8f0`
    - `--accent`: `#3b82f6` (Vibrant Indigo-Blue)
    - `--accent-subtle`: `rgba(59, 130, 246, 0.12)`
  - Dark Mode:
    - `--bg-primary`: `#0b0f19` (Deep slate navy)
    - `--bg-secondary`: `#111827`
    - `--bg-surface`: `#1e293b`
    - `--text-on-primary`: `#f8fafc`
    - `--text-muted`: `#94a3b8`
    - `--border`: `#334155`
    - `--accent`: `#60a5fa`
    - `--accent-subtle`: `rgba(96, 165, 250, 0.18)`
- **Typography:** Crisp sans-serif stack (`system-ui`, `-apple-system`, `Inter`, `sans-serif`) with readable leading and 14–15px body sizes.
- **Transitions:** 150ms ease transitions for theme toggles, popover entrances, and sentence focus rings.

---

## Components

### Design System & Theme Engine
Manages semantic color tokens and single-source theme persistence across all extension surfaces.
- **What it does:** Reads saved theme from `browser.storage.local` on mount, applies `data-theme="light"` or `data-theme="dark"` to document root, and listens to `browser.storage.onChanged` to synchronize open surfaces in real time.
- **What it talks to:** `browser.storage.local`, CSS root tokens, Theme toggle buttons in Side Panel and Popup.
- **PRD Ref:** Implements [`prd.md > Theme Switching and Single-Source Persistence`](file:///home/blackbeard/Downloads/CODE/Extension/Listen/devpost/3/prd.md#L86-L95).

### Audio Engine & In-Memory Chunk Cache (`lib/player.ts`)
The decoupled core managing audio scheduling, in-memory chunk retention, seeking, and replay.
- **What it does:** 
  - Splits text passages into clean sentence structures via `lib/chunker.ts`.
  - Dispatches synthesis requests to `lib/tts.worker.ts`.
  - Maintains `cache: Map<number, AudioBuffer>` in memory.
  - Plays audio through Web Audio `AudioContext` and `GainNode`.
  - Supports priority scrubbing: if an uncached sentence is requested, cancels background tasks, prioritizes the target sentence, and resumes forward caching.
  - Evicts cache on new selection, side panel close, or after a 10-minute idle timer.
- **What it talks to:** `lib/tts.worker.ts`, Web Audio API, React UI hooks via event subscriptions (`onStateChange`, `onSentenceChange`).
- **PRD Ref:** Implements [`prd.md > Replay & In-Memory Audio Chunk Caching`](file:///home/blackbeard/Downloads/CODE/Extension/Listen/devpost/3/prd.md#L138-L152) and [`prd.md > Interactive Sentence Reader & Click-to-Seek Scrubbing`](file:///home/blackbeard/Downloads/CODE/Extension/Listen/devpost/3/prd.md#L105-L117).

### Side Panel Controller & Sentence List (`entrypoints/sidepanel`)
The primary reading view providing visual sentence navigation.
- **What it does:** Renders the list of sentences with index indicators. Highlights the active sentence, auto-scrolls it smoothly into view, and provides click handlers to invoke `player.seek(index)`. Shows Replay button state when playback completes.
- **What it talks to:** `lib/player.ts`, Originating Tab Manager, Collapsible Mini-Player, `entrypoints/reader.content.ts`.
- **PRD Ref:** Implements [`prd.md > Interactive Sentence Reader & Click-to-Seek Scrubbing`](file:///home/blackbeard/Downloads/CODE/Extension/Listen/devpost/3/prd.md#L105-L117).

### Originating Tab Manager & Navigation
Tracks the source webpage and handles focus switching.
- **What it does:** Stores `originTab: { tabId, windowId, title, favIconUrl }`. Renders the header pill; clicking calls `browser.tabs.update(tabId, { active: true })`. Listens to `browser.tabs.onRemoved` to trigger the user's chosen policy (`stop` playback or `continue` playing cached chunks with `[Closed Tab]` badge).
- **What it talks to:** `browser.tabs`, `browser.windows`, `lib/settings.ts`, Side Panel Header.
- **PRD Ref:** Implements [`prd.md > Originating Tab Awareness & Focus Navigation`](file:///home/blackbeard/Downloads/CODE/Extension/Listen/devpost/3/prd.md#L96-L104).

### Collapsible Mini-Player Mode
A compact player dock embedded in the side panel.
- **What it does:** Replaces the full sentence list with a ~64px compact bar showing current sentence preview snippet, Play/Pause/Replay, Volume, and Expand buttons. Toggling mode does not touch or interrupt the underlying audio player.
- **What it talks to:** Side Panel state, `lib/player.ts`.
- **PRD Ref:** Implements [`prd.md > Collapsible Mini-Player Mode`](file:///home/blackbeard/Downloads/CODE/Extension/Listen/devpost/3/prd.md#L118-L126).

### Volume Controller & Popover
Audio loudness management.
- **What it does:** Renders a volume button that opens a popover with slider (0% to 100%) and mute toggle. Modulates `GainNode.gain.value` in `lib/player.ts` in real time and updates the volume icon dynamically (Mute, Low, High). Persists volume in settings.
- **What it talks to:** `lib/player.ts`, Side Panel controls.
- **PRD Ref:** Implements [`prd.md > Volume Control Popover`](file:///home/blackbeard/Downloads/CODE/Extension/Listen/devpost/3/prd.md#L127-L137).

### Popup Settings & Tab Navigation
Extension toolbar popup configuration interface.
- **What it does:** Provides Sun/Moon theme toggle, links to open side panel, model status indicators, and the **Tab Navigation Policy** setting (`onTabCloseAction: 'stop' | 'continue'`).
- **What it talks to:** `browser.storage.local`, `lib/settings.ts`.
- **PRD Ref:** Implements [`prd.md > Theme Switching and Single-Source Persistence`](file:///home/blackbeard/Downloads/CODE/Extension/Listen/devpost/3/prd.md#L86-L95) and [`prd.md > Originating Tab Awareness & Focus Navigation`](file:///home/blackbeard/Downloads/CODE/Extension/Listen/devpost/3/prd.md#L96-L104).

### Content Script Highlighting Synchronizer (`entrypoints/reader.content.ts`)
On-page visual sync layer.
- **What it does:** Injected into webpage. Finds text nodes matching the passage, renders a non-destructive highlight bounding overlay over the active sentence, and smoothly scrolls the page. Listens for `{ type: 'HIGHLIGHT_SENTENCE', index }` and cleans up on session finish.
- **What it talks to:** Host DOM, Side Panel messaging channel.
- **PRD Ref:** Implements [`prd.md > Interactive Sentence Reader & Click-to-Seek Scrubbing`](file:///home/blackbeard/Downloads/CODE/Extension/Listen/devpost/3/prd.md#L105-L117).

---

## Data Model

### State Storage & Lifecycles

| Data Entity | Where It Lives | Update Trigger | Persistence & Lifecycle |
|---|---|---|---|
| `theme` (`'light' \| 'dark'`) | `browser.storage.local` | Click theme toggle in Side Panel or Popup | Persists across browser restarts. Synced live via `storage.onChanged`. |
| `onTabCloseAction` (`'stop' \| 'continue'`) | `browser.storage.local` | Selected in Popup settings | Persists across browser restarts. Default: `'continue'`. |
| `volume` (`number: 0.0 - 1.0`) | `browser.storage.local` & `GainNode` | Slider change in Volume Popover | Persists across reading sessions. |
| `originatingTab` (`{ tabId, windowId, title, favIconUrl, isClosed }`) | In-memory Side Panel state | Reading triggered or `tabs.onRemoved` | Resets on every new reading selection. |
| `playbackState` (`{ status, sentenceIndex, totalSentences, speed }`) | Decoupled in `lib/player.ts` | Player transport commands (`play`, `seek`, `tick`) | Ephemeral session state. UI subscribes to updates. |
| `audioChunkCache` (`Map<number, AudioBuffer>`) | Volatile heap in `lib/player.ts` | Worker delivers synthesized audio chunk | Strictly in-memory. Evicted on new selection, side panel close, or 10m idle timeout. Zero disk footprint. |
| `isMiniPlayer` (`boolean`) | React state in Side Panel | Collapse/Expand icon click | Ephemeral session view toggle (defaults to false / Full view). |

---

## File Structure

Annotated tree of modified and key existing files for Milestone 3:

```
Listen/
├── entrypoints/
│   ├── background.ts                  # Captures contextMenu click, sends originTab metadata to sidepanel
│   ├── popup/
│   │   ├── App.tsx                    # Popup UI with theme toggle, sidepanel launcher, & Tab Close Policy
│   │   └── index.html
│   ├── reader.content.ts              # In-page sentence highlight overlay & autoscroll sync
│   └── sidepanel/
│       ├── App.tsx                    # Main sidepanel coordinator: mounts player, watches storage
│       ├── index.html                 # Mount point with early data-theme bootstrap
│       └── components/
│           ├── Header.tsx             # Originating Tab pill, Sun/Moon toggle, Mini-Player toggle
│           ├── SentenceList.tsx       # Interactive sentence rows with click-to-seek & live highlight
│           ├── MiniPlayer.tsx         # Compact ~64px dock player strip
│           ├── PlayerControls.tsx     # Speed, enlarged Play/Pause/Replay, Voice button
│           └── VolumePopover.tsx      # Volume slider popover & mute toggle
├── lib/
│   ├── audio.ts                       # Web Audio AudioContext & GainNode management
│   ├── chunker.ts                     # Robust sentence splitting and boundary detection
│   ├── player.ts                      # Decoupled audio player engine + in-memory Map chunk cache
│   ├── settings.ts                    # Typed storage schema (theme, onTabCloseAction, volume)
│   ├── tts-client.ts                  # Worker IPC communication with priority abort support
│   └── tts.worker.ts                  # TTS synthesis worker (Kokoro WebGPU + Piper WASM)
├── assets/
│   └── main.css                       # Tailwind v4 import + Semantic design tokens (light/dark)
├── devpost/
│   ├── 3/
│   │   ├── prd.md                     # Milestone 3 approved PRD
│   │   ├── prd.html                   # PRD HTML review companion
│   │   ├── scope.md                   # Milestone 3 approved Scope
│   │   ├── scope.html                 # Scope HTML review companion
│   │   ├── spec.md                    # This Technical Specification (canonical)
│   │   └── spec.html                  # Spec HTML review companion
│   ├── learner-profile.md             # Learner context & preferences
│   ├── prd.md                         # Root PRD reference
│   ├── scope.md                       # Root Scope reference
│   └── spec.md                        # Root Spec reference
├── package.json                       # Dependencies & WXT scripts
└── wxt.config.ts                      # Extension manifest & permissions configuration
```

---

## External Services and Dependencies

1. **Browser Extension APIs (Chromium MV3):**
   - `browser.storage.local`: Settings & theme storage. Local only.
   - `browser.tabs`: `tabs.update` for origin focus jump, `tabs.onRemoved` for lifecycle tracking, `tabs.sendMessage` for highlight sync.
   - `browser.sidePanel`: Chrome side panel launch and lifecycle.
   - Doc link: [Chrome Extensions API Reference](https://developer.chrome.com/docs/extensions/reference/)
2. **Local TTS Models & Engines:**
   - [kokoro-js](https://github.com/hexgrad/kokoro): In-browser 82M TTS model running via ONNX Runtime Web (`onnxruntime-web`).
   - [@mintplex-labs/piper-tts-web](https://github.com/Mintplex-Labs/piper-tts-web): Offline WASM fallback.
   - Rate limits: None (100% offline).
   - Cost: $0 (Local execution).

---

## Important Failure Modes

1. **Originating Tab Closed or Reloaded While Playing:**
   - *Failure:* The content script on the host page disappears, so highlight messages fail with `Could not establish connection`.
   - *Chosen Fallback:* The player checks the `onTabCloseAction` setting. If set to `'stop'`, audio stops immediately. If set to `'continue'`, playback finishes existing in-memory chunks smoothly, the header tab pill gracefully displays `"[Closed Tab]"` (disabling click navigation), and content script messaging errors are caught and swallowed silently.
2. **Scrubbing to an Unsynthesized Sentence:**
   - *Failure:* User clicks sentence 15 while only sentences 0–2 are generated; waiting for 3–14 would freeze playback.
   - *Chosen Fallback:* The player sends an abort/preempt signal to `tts.worker.ts`, immediately queues sentence 15 at priority 1, marks sentence 15 with a subtle visual pulse in the UI, and moves the on-page highlight immediately. Playback begins as soon as sentence 15 finishes synthesis, and forward prefetching resumes from 16 onward.
3. **High Heap Consumption in Long Sessions:**
   - *Failure:* Synthesizing hundreds of sentences in a single massive article could accumulate tens of megabytes of audio buffers.
   - *Chosen Fallback:* Decoded buffers live strictly in a volatile `Map`. When the user starts a new selection, closes the side panel after playback, or leaves the player idle for 10 minutes, the cache is completely purged, returning memory to the browser engine.

---

## What Was Simplified and Why

- **In-Memory Audio Chunk Caching instead of IndexedDB/OPFS:**
  - *Decision:* Store generated sentence buffers in volatile RAM (`Map<number, AudioBuffer>`) instead of persistent browser databases.
  - *Why:* Keeps zero disk footprint, eliminates file schema migrations, and strictly enforces the learner's zero-trace privacy promise while delivering instant replay.
- **Click-to-Seek Sentence Cards instead of Audio Waveform Scrubber:**
  - *Decision:* Allow users to click distinct sentence rows to seek rather than rendering a continuous microsecond waveform canvas.
  - *Why:* Written text is cognitive and sentence-bounded; sentence-level scrubbing matches reading comprehension, aligns 1:1 with on-page highlights, and avoids complex timecode interpolation.
- **Collapsible Mini-Player Dock instead of Detached Popup/PiP Window:**
  - *Decision:* Collapse within the native side panel container (~64px height) rather than opening secondary floating OS windows.
  - *Why:* Avoids intrusive multi-window management, requires no additional OS permissions, and keeps audio cleanly bound within a single extension context.

---

## Decisions and Open Issues

### Decisions Made
1. **Decoupled Audio Core:** Decoupled `lib/player.ts` from React components. React components subscribe to state snapshots; the player manages cache, synthesis queues, and Web Audio nodes.
2. **Theme Initialization Strategy:** Initial theme is read synchronously before first paint from `browser.storage.local`, preventing light/dark theme flash, while `browser.storage.onChanged` synchronizes any open surface in real time.
3. **Preempt-Priority Synthesis Queue:** Scrubbing to an uncached sentence aborts low-priority background generation, prioritizes the clicked sentence immediately, and updates visual markers without waiting.
4. **Configurable Tab Close Policy:** Added `onTabCloseAction` (`'stop' | 'continue'`) to popup settings, giving users direct control over background audio behavior when source tabs are closed.

### One Useful Unknown & Clarification
- **The Question:** How can the decoupled player preempt an ongoing sentence synthesis in the Web Worker when the user jumps across the document?
- **Clarification:** `lib/tts-client.ts` tags synthesis requests with a monotonic `requestId` and `sentenceIndex`. When a priority seek occurs, it sends an `ABORT_PREFETCH` message with the new target `sentenceIndex`. The worker checks this cancellation token before running ONNX/WASM inference, cleanly dropping skipped sentences without restarting or terminating the worker thread.

### Open Questions Carried Forward
- **Mini-Player Dock Height:** Standardized at 64px for clean visual ergonomics with 1-line sentence truncation and full playback controls.
- **Favicon Extraction Fallback:** If `tab.favIconUrl` is unavailable (e.g., restricted `chrome://` or intranet pages), the header renders a clean SVG document icon fallback.
