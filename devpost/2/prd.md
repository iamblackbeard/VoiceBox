---
doc: prd
status: approved
---

# Local Voice Reader (Popup) — Product Requirements

A privacy-first browser extension popup for selecting the local text-to-speech engine (Kokoro or Piper).
Source: `scope.md > The Core Loop`.

## The Core Journey
1. The user installs the extension. On the very first open of the popup, a hardware check runs immediately to determine WebGPU availability. 
2. If WebGPU is present, the Kokoro engine is checked by default. If WebGPU is not present, Piper is checked by default, and a warning highlights "Wgpu not found, Piper is recommended."
3. The WebGPU status and default engine choice are saved in local storage, so subsequent opens of the popup do not re-evaluate it but use the cached values.
4. The user sees a simple choice (like radio buttons or checkboxes) between Piper and Kokoro.
5. The user clicks a checkbox to select their preferred engine.
6. The selection is saved immediately to local storage without requiring a "Save" button.

## Screens and Layout
The extension popup surface. It contains a minimal, unobtrusive interface focused solely on engine selection. It shows options for "Kokoro" and "Piper". If WebGPU is absent, a clear highlight/warning points the user towards Piper. 

## Look and Feel
Matches the existing extension's minimal, native-utility aesthetic. The popup should load instantly and look built-in to the browser.

## Features and Behavior

### Engine Selection & Switching
The primary configuration interface.
- As a user, I want to see which engine is currently selected when I open the popup.
  - [ ] Acceptance criterion: The popup reflects the saved choice immediately on open in both Chrome and Firefox.
- As a user, I want to change the TTS engine simply by clicking it.
  - [ ] Acceptance criterion: Clicking an engine option updates the saved preference immediately in browser local storage.

### WebGPU Detection & Caching
Ensures optimal default performance.
- As a user, I want to be warned if Kokoro might be slow on my hardware.
  - [ ] Acceptance criterion: If WebGPU is absent, a clear warning recommending Piper is visible.
- As a user, I don't want the popup to be slow on every open.
  - [ ] Acceptance criterion: The WebGPU check runs only once (or when cache is clear) and stores its result locally.

### Dual-Engine Audio Playback & Memory Management
Ensures both engines actually speak while conserving system memory.
- As a user, I want to hear audio synthesized by whichever engine is selected (Kokoro or Piper).
  - [ ] Acceptance criterion: When Kokoro is selected, the shared player plays Kokoro audio; when Piper is selected, the shared player plays Piper audio.
- As a user, I want to prevent both AI models from running simultaneously and consuming excessive RAM.
  - [ ] Acceptance criterion: Only one engine is loaded in memory at any time. When switching engines, the active engine is terminated/unloaded before the new engine starts.

## States and Boundaries

- **First Use via Popup (No Cache)** — The popup performs the WebGPU check, sets the default engine based on the result, caches the WebGPU status, and saves the default engine selection.
- **First Use via Context Menu (No Popup)** — If the user triggers "Read Aloud" before ever opening the popup, the extension checks if a default is set. If not, it runs the WebGPU check in the background, assigns the default engine accordingly (Piper if absent, Kokoro if present), and saves it.
- **Normal Use (Cached)** — The popup reads the WebGPU status and selected engine from local storage and displays the UI instantly.
- **Switching Engines During/Between Readings** — If the engine is changed, any running inference from the previous engine is stopped, its instance is released from memory, and the newly selected engine is initialized for subsequent playback.
- **Cross-Browser** — Works equivalently in Chromium and Firefox via standard extension storage and window APIs.
- **Hardware Limitation** — If WebGPU is absent, the popup UI shows a visual highlight recommending Piper.

## Product Decisions
- **Instant Save** — The user decided against a "Save" button to keep the interaction as lightweight as possible.
- **Cached Hardware Check** — WebGPU detection is cached in local storage to prevent unnecessary evaluation delay on every popup open.
- **Hardware-Aware Defaults** — The presence of WebGPU dictates the out-of-the-box engine choice (Kokoro if present, Piper if absent).
- **Single Active Engine in Memory** — To minimize memory consumption, models are not kept in memory together. The active engine is unloaded before the alternative is instantiated.

## What We're Building
- An extension popup interface working in Chrome and Firefox.
- A WebGPU hardware check that executes instantly and caches results.
- Cross-browser storage synchronization (`browser.storage.local`) for engine preferences.
- Integration of Piper TTS alongside Kokoro in the worker to synthesize playable audio.
- Lifecycle/memory management ensuring only one engine is active in memory at a time.
- Shared player routing audio from the active engine to existing controls and sentence highlighting.

## Deferred From the POC
- Custom user-uploaded voice models.
- Word-by-word timing synchronization.

## Non-Goals
- Cloud API fallback. Everything remains local.
