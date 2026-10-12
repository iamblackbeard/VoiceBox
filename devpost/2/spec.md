---
doc: spec
status: approved
---

# Local Voice Reader (Popup & Dual Engine) — Technical Spec

## How This Works, In Plain Language

This feature introduces the extension **popup** for choosing between two distinct local AI text-to-speech engines:
1. **Kokoro** — High-quality, natural neural voice that runs fastest when hardware acceleration (WebGPU) is available.
2. **Piper** — Fast, lightweight local voice optimized for standard CPU execution via WebAssembly without requiring a dedicated GPU.

Both engines run 100% locally on your machine with zero cloud requests.

When you first open the popup, it runs a quick hardware test to detect whether your system supports **WebGPU**. If WebGPU is supported, Kokoro is selected by default. If WebGPU is not supported, Piper is selected by default, and a clear warning banner recommends Piper for optimal performance. 

Your preferences and the hardware check result are saved in browser storage (`browser.storage.local`), ensuring cross-browser compatibility across **both Chromium and Firefox**.

When text is read aloud, both engines use the exact same **shared player** in the side panel. Crucially, to prevent excessive memory consumption, **only one engine is loaded in memory at a time**. If you switch engines (e.g. from Kokoro to Piper), any active reading from the old engine is stopped and its model instance is completely torn down and released from memory before the new engine starts up.

## The Core Journey Through the System

1. **User opens the popup (Toolbar action in Chrome or Firefox)**:
   - The browser mounts `entrypoints/popup`.
   - The popup queries `browser.storage.local` for saved settings (`engine`, `hasWebGpu`).
   - PRD ref: `prd.md > The Core Journey`, `prd.md > Engine Selection & Switching`.

2. **First Run Hardware Check (if uncached)**:
   - If `hasWebGpu` is not cached, `checkWebGpu()` queries `navigator.gpu.requestAdapter()`.
   - If available: `hasWebGpu = true`, default `engine = 'kokoro'`.
   - If unavailable: `hasWebGpu = false`, default `engine = 'piper'`.
   - Settings are immediately persisted to `browser.storage.local`.
   - PRD ref: `prd.md > WebGPU Detection & Caching`, `prd.md > States and Boundaries`.

3. **Subsequent Opens & Instant Selection**:
   - The popup renders immediately from storage without re-evaluating hardware.
   - If `hasWebGpu === false`, an alert banner states: *"Wgpu not found, Piper is recommended."*
   - When the user selects a different engine, the change is written immediately to `browser.storage.local`.
   - PRD ref: `prd.md > Engine Selection & Switching`.

4. **Speech Synthesis with Memory Management**:
   - When a reading begins via "Read Aloud", `lib/player.ts` reads the active engine preference (`'kokoro' | 'piper'`).
   - `lib/tts-client.ts` instructs `lib/tts.worker.ts` to prepare the active engine.
   - **Single Engine in Memory:** If the worker currently has the *other* engine loaded, it halts any active job, explicitly unloads and nullifies the old engine instance to reclaim WebAssembly/RAM, and then initializes the requested engine.
   - On first use of the selected engine, the model is downloaded and cached locally with progress displayed on screen.
   - Sentence chunks are synthesized one by one and routed into the shared player.
   - PRD ref: `prd.md > Dual-Engine Audio Playback & Memory Management`.

5. **Shared Playback & Highlighting**:
   - The shared player plays the generated audio chunks sequentially.
   - Each chunk triggers the existing sentence highlighting on the webpage.
   - Play/pause/stop controls operate identically for both engines.
   - PRD ref: `prd.md > Dual-Engine Audio Playback & Memory Management`.

## Stack

- **Framework**: React 19 + TypeScript.
- **Extension Tooling**: WXT (`@wxt-dev/module-react`) — supports Chrome and Firefox MV3 builds.
- **Styling**: Tailwind CSS v4 — using existing semantic tokens (`bg-primary`, `text-primary`, etc.).
- **Hardware API**: WebGPU (`navigator.gpu.requestAdapter()`) — standard Web API in window contexts.
- **Cross-Browser Storage**: `browser.storage.local` (from `wxt/browser`) — compatible across Chromium and Firefox.
- **TTS Engines**:
  - **Kokoro**: `kokoro-js` (^1.2.1) + `onnxruntime-web` (^1.30.0) with local WASM binaries (`/ort/`). [Kokoro-JS Docs](https://github.com/hexgrad/kokoro)
  - **Piper**: `@mintplex-labs/piper-tts-web` (or `@realtimex/piper-tts-web`) — local WASM/ONNX Piper engine with built-in phonemizer, caching models locally via OPFS/Cache. [Piper TTS Web Docs](https://github.com/Mintplex-Labs/piper-tts-web)

## Where It Runs and How Someone Tries It

- **Runtime**: Browser extension popup and side panel in Chromium and Firefox.
- **Start Commands**:
  ```bash
  npm run dev          # Chrome development mode
  npm run dev:firefox  # Firefox development mode
  ```
- **How someone tries it**:
  1. Open Chrome or Firefox with the extension loaded.
  2. Click the extension toolbar icon to open the popup.
  3. Verify the WebGPU status is detected and defaults to Kokoro (if GPU is present) or Piper (with warning if GPU is absent).
  4. Select **Piper** in the popup.
  5. Select text on a webpage, right-click, and choose **Read Aloud**.
  6. The side panel player opens, loads Piper, and reads the text aloud with sentence highlighting.
  7. Open the popup and switch to **Kokoro**.
  8. Trigger Read Aloud again: verify that Piper is unloaded from memory, Kokoro is loaded, and playback proceeds smoothly.

## Look and Feel

- **Popup Surface**: Clean, compact browser utility matching the side panel aesthetic.
  - Header: Extension title with minimal status indicator.
  - Engine Selector: Labeled selector (dropdown or segmented toggle) clearly showing "Kokoro" and "Piper".
  - Warning Banner: Distinct amber warning callout when WebGPU is absent: *"Wgpu not found, Piper is recommended."*
- **Theme Support**: Automatically inherits light and dark modes following the existing OS and extension theme tokens.

## Components

### Popup Root (`entrypoints/popup/App.tsx`)
- Displays engine choices and hardware detection status.
- Reads initial settings from `lib/settings.ts`.
- Updates `browser.storage.local` immediately upon user selection.
- PRD ref: `prd.md > Engine Selection & Switching`, `prd.md > WebGPU Detection & Caching`.

### Hardware Detector (`lib/hardware.ts`)
- `checkWebGpu(): Promise<boolean>`.
- Calls `navigator.gpu?.requestAdapter()` with safety timeout and error boundary.
- PRD ref: `prd.md > WebGPU Detection & Caching`.

### Engine Settings Manager (`lib/settings.ts`)
- `getOrInitializeSettings(): Promise<EngineSettings>`.
- `saveEnginePreference(engine: 'kokoro' | 'piper'): Promise<void>`.
- Uses `browser.storage.local` from `wxt/browser` for seamless Chrome and Firefox compatibility.
- PRD ref: `prd.md > Engine Selection & Switching`.

### Unified TTS Worker (`lib/tts.worker.ts`)
- Manages AI model lifecycle, unloading, and inference off the main UI thread.
- Tracks `activeEngine: 'kokoro' | 'piper' | null`.
- **`unloadEngine()`**: Cleans up and nullifies the current model instance, allowing the JavaScript runtime and WASM to free memory.
- **`loadEngine(engine)`**: Unloads any existing engine first, then initializes the requested engine.
- **`generate(text, voiceId, engine)`**: Synthesizes the text chunk into audio using the active engine.
- PRD ref: `prd.md > Dual-Engine Audio Playback & Memory Management`.

### TTS Client (`lib/tts-client.ts`)
- Communicates with `lib/tts.worker.ts` via structured messages (`load`, `generate`, `unload`).
- Provides progress reporting (`downloading`, `buffering`) to the player.
- PRD ref: `prd.md > Dual-Engine Audio Playback & Memory Management`.

### Shared Player (`lib/player.ts`)
- Manages sentence queue, audio playback, and on-page highlighting.
- Reads configured engine before playback starts.
- Handles smooth engine transition if user switches preferences.
- PRD ref: `prd.md > Dual-Engine Audio Playback & Memory Management`.

## Data Model

Stored in `browser.storage.local`:

```ts
export type TTSEngine = 'kokoro' | 'piper';

export interface EngineSettings {
  engine: TTSEngine;      // Currently active TTS engine ('kokoro' | 'piper')
  hasWebGpu: boolean;     // Cached WebGPU hardware capability
  checkedAt: number;      // Epoch timestamp when hardware was probed
}
```

- **Where it lives**: `browser.storage.local` (persistent across browser reloads, shared across popup and side panel).
- **How it updates**: Immediately on user interaction in popup, or during first-run initialization.
- **Cross-browser**: Works identically in Chromium and Firefox.

## File Structure

```
project/
├── entrypoints/
│   ├── popup/
│   │   ├── index.html        # Popup HTML template
│   │   ├── main.tsx          # Mounts React root for popup
│   │   └── App.tsx           # Engine selector UI, warning banner, instant persistence
│   ├── sidepanel/            # Existing side panel player UI
│   │   ├── components/       # Player controls, status bar, now reading
│   │   └── App.tsx           # Side panel main component
│   └── background.ts         # Context menu listener & panel opener (Chrome & Firefox)
├── lib/
│   ├── hardware.ts           # checkWebGpu() utility with safe timeout
│   ├── settings.ts           # getOrInitializeSettings() & saveEnginePreference()
│   ├── player.ts             # Shared playback pipeline with engine awareness
│   ├── tts-client.ts         # TTS client bridging Player to Worker
│   ├── tts.worker.ts         # Worker managing Kokoro & Piper loading, unloading, & inference
│   ├── chunker.ts            # Sentence chunking utility
│   ├── voices.ts             # Default voice definitions for Kokoro and Piper
│   └── errors.ts             # User-facing error message mapping
├── public/
│   └── ort/                  # Local ONNX Runtime Web WASM files
├── devpost/
│   └── 2/
│       ├── prd.md            # Approved PRD
│       ├── prd.html          # Interactive PRD
│       ├── spec.md           # This Technical Specification (Draft)
│       └── spec.html         # Interactive Technical Spec
├── package.json
└── wxt.config.ts
```

## External Services and Dependencies

- **`kokoro-js`**: Kokoro-82M model downloaded on first run from Hugging Face and cached locally.
- **`@mintplex-labs/piper-tts-web`**: Piper ONNX voice model downloaded on first run and cached locally via browser storage/OPFS.
- **No Cloud Services**: Zero external speech APIs. All inference and audio synthesis remain strictly on the user's device.
- **Permissions Required**: `storage`, `contextMenus`, `activeTab`, `scripting`, `sidePanel` (Chrome) / `sidebarAction` (Firefox).

## Important Failure Modes

1. **WebGPU Absent or Crashed**:
   - `checkWebGpu()` times out safely, returns `false`, sets default engine to `piper`, and renders the warning banner without blocking UI.
2. **Switching Engine During Active Playback**:
   - The player cancels any pending audio chunks, requests `unload` of the active engine from the worker, and spins up the newly selected engine for subsequent chunks.
3. **Model Download Failure / Offline on First Use**:
   - If the user is offline when a model is first downloaded, the worker catches the fetch error and the status bar displays *"You seem to be offline, check connection"*.
4. **Browser Compatibility Differences**:
   - Firefox uses `sidebarAction` while Chrome uses `sidePanel`; unified via WXT build targets and `browser` API.

## What Was Simplified and Why

- **Single Active Engine in RAM**: Instead of keeping both heavy models (Kokoro ~80MB and Piper ~60MB) resident in memory concurrently, the worker unloads the inactive model before initializing the active one. This prevents browser tab memory bloat.
- **Shared Player & Highlighting**: Rather than building separate audio player pipelines for Kokoro and Piper, both engines return audio into the existing `Player` queue, reusing all playback and highlight logic.
- **Single Settings Store**: Both Chromium and Firefox share the standard `browser.storage.local` API abstracted by WXT.

## Decisions and Open Issues

### Decisions
1. **Dual-Engine Speech Synthesis**: Both Kokoro and Piper will synthesize and play audio through the shared player.
2. **Mutual Exclusion / Memory Cleanup**: When switching engines, the running engine is stopped and its instance is disposed from memory before the new engine is loaded.
3. **Cross-Browser Standard (`browser.storage.local`)**: Both Chrome and Firefox store preferences via `browser.storage.local`.
4. **Hardware-Aware Default**: Kokoro default if WebGPU present; Piper default with warning if WebGPU absent.
5. **Instant Save**: No "Save" button; preferences write immediately on change.

### Learner Uncertainty Explored
- **Service Worker vs Window Contexts in Manifest V3**: Clarified that the background script is a headless Service Worker that cannot access WebGPU or play audio. The Popup and Side Panel are full window pages with a DOM where `navigator.gpu` and audio APIs work natively. Background audio when the panel is closed is confirmed out of scope.
- **Memory Consumption with Multiple AI Models**: Addressed the concern of running multiple heavy neural network models in browser memory by specifying an explicit unload-and-replace lifecycle in the worker.

### Open Questions
- None blocking implementation.
