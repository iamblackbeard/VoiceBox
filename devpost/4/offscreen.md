# Offscreen Document Architecture: Background Audio & Side Panel Collapse

This document outlines the technical design, architectural rationale, and implementation blueprint for shifting audio playback and text-to-speech synthesis into a Chrome Manifest V3 **Offscreen Document**.

---

## 1. Problem & Motivation

### 1.1 The Screen Real Estate Problem
The native browser side panel (`chrome.sidePanel`) occupies a persistent ~30% vertical width column of the browser window. While reading long articles or documents:
- The website is compressed to 70% width.
- Users often want the side panel out of their way so the website regains **100% full screen width**, while speech continues playing aloud.

### 1.2 The Chrome MV3 Lifecycle Challenge
Currently, our audio engine ([`lib/player.ts`](file:///home/blackbeard/Downloads/CODE/Extension/Listen/lib/player.ts)) runs directly inside the side panel document context (`entrypoints/sidepanel/App.tsx`).
- The side panel is an extension web page (`sidepanel/index.html`).
- When the side panel is closed (by user action or `window.close()`), the browser tears down the document DOM, kills all running JavaScript execution, and destroys the `AudioContext`.
- **Result:** Under the current architecture, audio cannot continue playing once the browser side panel window closes.

### 1.3 Why Background Service Workers Cannot Play Audio
In Chrome Manifest V3:
- The background script (`entrypoints/background.ts`) is a **Service Worker**, not a persistent background page.
- Service Workers have **no DOM**, **no `AudioContext`**, and **no WebGPU** (`navigator.gpu`). Calling `new AudioContext()` in a service worker throws a fatal error.

---

## 2. The Solution: Chrome Offscreen Document

Google Chrome introduced the **Offscreen API** (`chrome.offscreen`) specifically to enable DOM, audio playback, and machine learning tasks that cannot execute in a service worker.

### 2.1 Capability Comparison across Extension Contexts

| Feature / Capability | Side Panel (`sidepanel/`) | Service Worker (`background.ts`) | Offscreen Document (`offscreen.html`) | Content Script (`reader.content.ts`) |
| :--- | :---: | :---: | :---: | :---: |
| **`AudioContext` / Web Audio** | Yes | ❌ No | **Yes** | Yes |
| **WebGPU (`navigator.gpu`)** | Yes | ❌ No | **Yes** | Tab-restricted |
| **WebAssembly (Piper TTS)** | Yes | Yes | **Yes** | CSP-restricted |
| **Survives Side Panel Close** | ❌ Dies on close | Yes | **Yes** | Yes (while tab open) |
| **Independent of Tab Navigation** | Yes | Yes | **Yes** | ❌ Dies on tab navigate |
| **Official Chrome MV3 Pattern** | Yes | Yes | **Yes (`AUDIO_PLAYBACK`)** | No |

### 2.2 Full WebGPU & WASM Support in Offscreen
- **Kokoro TTS (Neural Engine):** Runs via ONNX Runtime Web using **WebGPU** (`navigator.gpu`). Because an offscreen document is an underlying HTML page, it has full hardware WebGPU access on supported systems.
- **Piper TTS (Fast CPU Engine):** Runs via ONNX Runtime WebAssembly (`ort.wasm`), fully supported in the offscreen context with the `'wasm-unsafe-eval'` CSP directive.

---

## 3. System Architecture & Message Flow

```
┌────────────────────────────────────────────────────────┐
│                      User Browser                      │
└────────────────────────────────────────────────────────┘
          │                                 │
          ▼                                 ▼
┌──────────────────┐               ┌───────────────────┐
│   Side Panel     │               │    Reading Tab    │
│  (Remote Proxy)  │               │ (Content Script)  │
└──────────────────┘               └───────────────────┘
   │            ▲                     ▲               │
   │ Commands   │ State Updates        │ Highlights    │ Selection
   ▼            │                     │               ▼
┌──────────────────────────────────────────────────────┐
│        Background Service Worker (Router)            │
│            entrypoints/background.ts                 │
└──────────────────────────────────────────────────────┘
                          │
                          │ Manages Lifecycle / Routes Messages
                          ▼
┌──────────────────────────────────────────────────────┐
│              Offscreen Document                      │
│        entrypoints/offscreen/index.html              │
│                                                      │
│  ┌────────────────────────────────────────────────┐  │
│  │                  Player Engine                 │  │
│  │   - AudioContext & GainNode                    │  │
│  │   - In-Memory Sentence Chunk Cache             │  │
│  │   - WebGPU / Kokoro & WASM / Piper Synthesis   │  │
│  └────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

---

## 4. Component Design

### 4.1 Offscreen Document (`entrypoints/offscreen.html` & `offscreen.ts`)
- **Role:** The headless host for audio playback and model inference.
- **Responsibilities:**
  - Instantiates and maintains the single authoritative `Player` instance.
  - Handles synthesis, in-memory chunk caching, and look-ahead prefetching.
  - Dispatches `highlight` messages to the reading webpage tab via `browser.tabs.sendMessage`.
  - Broadcasts player state changes (`status`, `sentenceIndex`, `speed`, `volume`) to any open extension views.

### 4.2 The Player Proxy Pattern (`lib/player.ts`)
To prevent breaking existing UI components, `lib/player.ts` exposes a **Player Proxy** interface that matches the existing API:
- `player.play(chunks, readingId, tabId)`
- `player.pause()`
- `player.resume()`
- `player.seek(sentenceIndex)`
- `player.setSpeed(speed)`
- `player.setVoice(voiceId)`
- `player.subscribe(listener)`
- `player.getState()`

**Why this matters:**
- [`SpeedPopup.tsx`](file:///home/blackbeard/Downloads/CODE/Extension/Listen/entrypoints/sidepanel/components/SpeedPopup.tsx), [`VoicePopup.tsx`](file:///home/blackbeard/Downloads/CODE/Extension/Listen/entrypoints/sidepanel/components/VoicePopup.tsx), [`SentenceList.tsx`](file:///home/blackbeard/Downloads/CODE/Extension/Listen/entrypoints/sidepanel/components/SentenceList.tsx), and [`PlayerControls.tsx`](file:///home/blackbeard/Downloads/CODE/Extension/Listen/entrypoints/sidepanel/components/PlayerControls.tsx) continue interacting with `player` without any internal rewrites or regression risks.

### 4.3 Side Panel Header Collapse Button (`Header.tsx`)
A new collapse/close button in the side panel header triggers the following flow:
1. Reads the user's close policy from `browser.storage.local`:
   - **`continue`**: Closes the side panel (`window.close()`). The offscreen document continues audio playback and on-page sentence highlighting without interruption.
   - **`stop`**: Sends `STOP` to the offscreen player, resets the session, closes the offscreen document, and closes the side panel (`window.close()`).
2. If the user later reopens the side panel during playback, the proxy reconnects immediately, rendering the active sentence and synchronized controls.

---

## 5. File-by-File Changes Summary

### 1. `wxt.config.ts`
- Add `'offscreen'` to permissions in the manifest configuration for Chromium.

### 2. `entrypoints/offscreen.html` *(New File)*
- Minimal HTML document declaring the offscreen script module:
  ```html
  <!DOCTYPE html>
  <html lang="en">
    <head><meta charset="utf-8" /></head>
    <body><script type="module" src="./offscreen.ts"></script></body>
  </html>
  ```

### 3. `entrypoints/offscreen.ts` *(New File)*
- Imports `Player` engine.
- Listens for runtime messages (`PLAY`, `PAUSE`, `RESUME`, `SEEK`, `SET_SPEED`, `SET_VOICE`, `STOP`, `GET_STATE`).
- Dispatches state updates over `browser.runtime.sendMessage` and session storage.

### 4. `entrypoints/background.ts`
- Implement `ensureOffscreenDocument()` and `closeOffscreenDocument()`.
- Automatically instantiate the offscreen document when reading begins.

### 5. `lib/player.ts`
- Split into:
  - Core engine logic (runs in `offscreen.ts`).
  - Remote client proxy (imported by `entrypoints/sidepanel`).

### 6. `entrypoints/sidepanel/components/Header.tsx`
- Add Collapse/Close icon button next to theme toggle.
- On click: inspects setting, dispatches action, calls `window.close()`.

### 7. `lib/settings.ts` & `entrypoints/popup/App.tsx`
- Ensure policy wording clearly represents panel collapse behavior:
  - *"When panel or reading tab is closed"* → `[Continue playing]` | `[Stop playback]`.
