---
doc: scope
status: approved
---

# Voice Box

A privacy-first, local text-to-speech browser extension that reads selected web text aloud with natural AI voices.

## The Unique Kernel
Using local AI models for high-quality natural voices, while cleverly chunking the text sentence-by-sentence to provide synchronized sentence-level highlighting without complex audio-timing alignment. It features intelligent hardware acceleration detection (using WebGPU when available, falling back to WASM) and gives the user a choice between Kokoro and Piper models based on their hardware capabilities.

## Who It's For
Users who want to listen to long documents or Reddit posts to avoid screen fatigue, but are highly privacy-conscious and do not want their browsing context sent to external servers.

## The Core Loop
The user configures their preferred TTS engine (Kokoro or Piper) via the extension popup. During this, the extension detects if WebGPU is available; if not, the popup displays a warning stating "Wgpu not found, Piper is recommended." When ready, the user selects a block of text on a page, right-clicks, and selects "Read Aloud." A side panel opens for the player, the local AI model initializes, and the extension begins reading the text aloud. It highlights each sentence on the page as it is spoken, while silently pre-caching the audio for the next few sentences to ensure smooth playback.

## Inspiration & Identity
Minimal, unobtrusive, and highly functional. The side panel should feel like a native browser utility, focused purely on playback controls (play, stop, skip, speed) and text display, while the popup handles the engine configuration cleanly.

## Why This Matters to the Learner
Solving a personal need to reduce eye strain from reading long texts while refusing to compromise on data privacy by sending text to cloud servers.

## What "Working" Looks Like
A demo where a user first selects their engine (Kokoro or Piper) in the extension popup, seeing a warning recommending Piper if WebGPU is disabled. Then, a paragraph on a webpage is selected, right-clicks, and reads aloud. A side panel opens providing playback controls. The screen visibly shows the current sentence highlighted, moving to the next sentence seamlessly as the chosen local engine continues reading.

## The POC Boundary
- Extension popup for engine selection (Kokoro vs Piper).
- Hardware check for WebGPU in the popup, with a UI warning recommending Piper if missing.
- Right-click context menu trigger for selected text only.
- Side panel with basic playback controls and text display.
- Sentence chunking and look-ahead caching logic.
- Local AI TTS model integration (downloaded on first run and cached).
- Sentence-level highlighting on the active webpage.

## Later
- Full-page "reader mode" that automatically parses main content and ignores ads.
- Importing custom open-source .tts voice files.
- Precise word-by-word highlighting.

## Explicitly Cut
- Cloud TTS API integrations (cut to enforce strict privacy).
- Bundling the AI model directly in the extension payload (cut due to browser extension size limits).
