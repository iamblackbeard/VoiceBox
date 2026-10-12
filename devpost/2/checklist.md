---
doc: checklist
status: approved
---

# Build Checklist

Build mode: learn

## Slices

- [ ] **1. Popup engine selector with cached WebGPU detection**
  Becomes usable: Clicking the extension toolbar icon opens a styled popup in Chrome and Firefox. It tests for WebGPU capability, caches the result in `browser.storage.local`, shows the engine choice (Kokoro vs. Piper) with the WebGPU recommendation banner if missing, and saves engine clicks immediately.
  Why now: Establishes the user configuration entrypoint, the cross-browser storage schema, and the hardware check needed to dictate defaults before integrating the new engine.
  PRD ref: `prd.md > The Core Journey`, `prd.md > Engine Selection & Switching`, `prd.md > WebGPU Detection & Caching`, `prd.md > Screens and Layout`
  Spec ref: `spec.md > Components > Popup Root`, `spec.md > Components > Hardware Detector`, `spec.md > Components > Engine Settings Manager`, `spec.md > Data Model`, `spec.md > File Structure`
  Build: Add `entrypoints/popup/` (HTML template, React root, and App UI component) using existing theme tokens. Implement `lib/hardware.ts` (`checkWebGpu` with safe timeout) and `lib/settings.ts` (`getOrInitializeSettings`, `saveEnginePreference`). Configure popup action in `wxt.config.ts`.
  Verify (mechanical): Unit tests for `lib/hardware.ts` and `lib/settings.ts`; `npm run build` and `npm run build:firefox` both succeed; generated manifests include `action.default_popup`.
  Learner check: Load the extension in Chrome or Firefox, click the toolbar icon to open the popup. Verify that WebGPU status is detected, the default engine is set, and clicking between Kokoro and Piper updates immediately without a save button.
  Commit: `Add extension popup with WebGPU detection and engine selection`

- [ ] **2. Piper TTS synthesizes speech with worker memory management**
  Becomes usable: The TTS worker can load Piper via WebAssembly/ONNX, synthesize speech for text chunks, report progress, and enforce mutual exclusion—unloading and disposing Kokoro before Piper loads (and vice-versa) so only one model resides in memory.
  Why now: This is the core technical risk: getting Piper's phonemizer and ONNX model downloading and synthesizing audio in the web worker alongside memory lifecycle guarantees.
  PRD ref: `prd.md > Dual-Engine Audio Playback & Memory Management`, `prd.md > States and Boundaries`, `prd.md > Product Decisions`
  Spec ref: `spec.md > Components > Unified TTS Worker`, `spec.md > Components > TTS Client`, `spec.md > External Services and Dependencies`, `spec.md > What Was Simplified and Why`
  Build: Install `@mintplex-labs/piper-tts-web`. Define default Piper voice in `lib/voices.ts`. Update `lib/tts.worker.ts` with `activeEngine` state, `unloadEngine()` cleanup routines, and Piper `load`/`generate` handlers returning playable audio data. Update `lib/tts-client.ts` to support engine dispatch and lifecycle calls.
  Verify (mechanical): Unit tests for engine switching lifecycle (verifying unload calls and activeEngine transitions); build succeeds in Chromium and Firefox; test synthesis script or worker test verifies Piper audio output generation.
  Learner check: Run a test invocation with Piper selected; observe model download progress if first run, and verify the worker emits valid audio without crashing or keeping both engines resident.
  Commit: `Integrate Piper TTS in worker with single-engine memory management`

- [ ] **3. Dual-engine reading through the shared player with sentence highlighting**
  Becomes usable: Full end-to-end reading with Piper or Kokoro. Selecting text on any webpage and clicking Read Aloud reads using the configured engine from the popup. The shared player handles play/pause/buffering, sentences highlight on the webpage, and switching engines between readings cleanly unloads the old engine and starts the new one.
  Why now: Completes the full user journey: ties the popup preference, the worker engine, and the on-page player together into a unified experience without duplicate player code.
  PRD ref: `prd.md > The Core Journey`, `prd.md > Dual-Engine Audio Playback & Memory Management`, `prd.md > What We're Building`
  Spec ref: `spec.md > Components > Shared Player`, `spec.md > Look and Feel`, `spec.md > Decisions and Open Issues`
  Build: Wire `lib/player.ts` to inspect `getOrInitializeSettings()` on reading start. Pass active engine to `ttsClient`. Connect audio stream from Piper to the existing HTMLAudioElement / Web Audio queue and sentence highlight dispatch. Handle engine switch between readings.
  Verify (mechanical): Unit tests for player engine initialization and switching; full build `npm run build` and `npm run build:firefox` succeed without errors or warnings; all vitest test suites pass.
  Learner check: Select text on a page, open the popup and select Piper. Right-click Read Aloud: confirm you hear the Piper voice with sentence highlighting. Then open popup, switch to Kokoro, right-click Read Aloud: confirm Kokoro plays smoothly with highlighting.
  Commit: `Route dual-engine playback through shared player with highlighting`

## Hands-on Checkpoints

- [ ] Early usable behavior explored — after slice 1 (popup & hardware check) and slice 2 (Piper synthesis)
- [ ] Final kick-the-tires exploration and feedback completed

## Final Review

- [ ] Final review complete — feedback resolved and learner confirms ready to ship

## Code Tour and App Map

- [ ] Learning activity complete — guided route, focused alternative, prior practice connected, or brief recap
- [ ] Optional edit and transfer reflection addressed — offered/declined/already covered/not applicable as appropriate
- [ ] `devpost/app-map.html` generated from finished code, checked, and shown, including a project-grounded practice to reuse

Activity and evidence: [what actually happened; real document/test/code references; unfinished work if interrupted]
Route and stops: [actual paths and symbols; guided stops completed, or reference-only route]
Edit outcome: [tried/kept/reverted/declined/not applicable; verification if changed]
Reflection: [offered/answered/declined/already covered — personal answer belongs only in the ignored profile]
Activity mode: [live app and editor, explicit static fallback, focused alternative, prior practice, or recap]

## Revisions

