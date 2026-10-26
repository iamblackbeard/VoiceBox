<div align="center">

<img src="public/icons/voice.svg" alt="Voice Box Icon" width="96" height="96" />

# Voice Box

**Private, offline text-to-speech for your browser.**

Voice Box reads web content and selected text aloud using state-of-the-art open-source speech synthesis engines running entirely on your local machine.

</div>

---

## Overview

**Voice Box** transforms articles, documentation, and web pages into natural speech without sending a single byte of your data to external servers. By leveraging client-side machine learning runtimes (WebAssembly and WebGPU), all voice generation is computed locally within your browser. 

Once your preferred voice models are downloaded, Voice Box functions completely offline—ensuring zero data transmission, zero tracking, and consistent availability regardless of network connectivity.

---

## Key Features

- **Dual High-Quality Local Engines**:
  - **Kokoro TTS (82M)**: Deep learning neural voice synthesis delivering natural intonation and human-like cadence, accelerated via WebGPU and WebAssembly.
  - **Piper TTS**: Fast, lightweight, and resource-efficient speech synthesis optimized for low-latency playback across all hardware configurations.
- **100% Offline & On-Device Processing**:
  - Synthesis occurs strictly within your browser environment.
  - No text, metadata, or activity logs ever leave your machine.
  - Zero telemetry, analytics, or third-party trackers.
- **Synchronized Sentence Highlighting**:
  - Follows along with text visually as it speaks, using modern native CSS Custom Highlight APIs without altering webpage layouts.
- **Dedicated Reading Side Panel**:
  - Integrated controls to play, pause, jump between sentences, and adjust reading speeds.
  - Sentence-by-sentence queue visualizer.
  - Configurable tab behavior (option to continue playing or halt if the originating web tab is closed).
- **Comprehensive Voice Catalog**:
  - Built-in voice preview manager to test voice styles before downloading.
  - Fine-grained voice management to download, favorite, and manage storage directly from the options interface.

---

## How It Works

```
┌─────────────────────────────────────────────────────────────┐
│                       Browser Tab                           │
│  [User Selects Text]  ──►  Context Menu: "Read Aloud"       │
└──────────────────────────────┬──────────────────────────────┘
                               │ (Direct IPC / Storage)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    Voice Box Side Panel                     │
│  - Text segmentation into natural sentence chunks           │
│  - Playback controls & speed management                     │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│             Local Background Inference Worker               │
│  ┌───────────────────────────┐ ┌──────────────────────────┐ │
│  │      Kokoro Engine        │ │       Piper Engine       │ │
│  │ (Transformers.js + ONNX)  │ │ (WASM + Piper Synthesis) │ │
│  └─────────────┬─────────────┘ └────────────┬─────────────┘ │
│                │                            │               │
│                └─────────────┬──────────────┘               │
│                              ▼                              │
│              Local AudioContext Playback Stream             │
│            + Synchronized On-Page Highlighter               │
└─────────────────────────────────────────────────────────────┘
```

1. **Text Extraction & Chunking**: When you select text and click "Read Aloud", Voice Box breaks the text into natural sentence-level phrases.
2. **Local Inference Execution**: The sentence pipeline feeds into an isolated background worker running ONNX Runtime Web or Piper WASM.
3. **Low-Latency Streaming**: Audio chunks play sequentially via the HTML5 Web Audio API while the on-page reader synchronously highlights each spoken sentence in real time.

---

## Technical Specifications

| Component | Kokoro TTS | Piper TTS |
| :--- | :--- | :--- |
| **Model Type** | 82M Parameter Neural Architecture | VITS / ONNX Fast Architecture |
| **Execution Backend** | WebGPU (when available) / WASM | WebAssembly (WASM) / CPU |
| **Local Storage** | Browser Cache Storage API | Origin Private File System (OPFS) |
| **Model Footprint** | ~86 MB (q8 base model) + ~256 KB voice embeddings | ~15 MB – ~60 MB per voice model |
| **Ideal For** | Natural intonation, long-form articles, and expressive listening | High-speed processing, low resource overhead, and broad hardware compatibility |

---

## Privacy Architecture

Voice Box is designed from the ground up on a local-first paradigm:

- **Zero Remote Processing**: All text analysis, phonetic transcription, and audio synthesis are performed by code executing locally in your browser.
- **Zero Data Collection**: No cookies, session identifiers, browsing history, or user interaction data are logged or collected.
- **Local-Only Storage**: Model files, user preferences, and cached voices reside entirely in local browser storage (Browser Cache and Origin Private File System).

---

## Getting Started

### Installation & Development

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd Listen
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start local development server**:
   ```bash
   npm run dev
   ```
   *For Firefox:*
   ```bash
   npm run dev:firefox
   ```

4. **Build production extension bundle**:
   ```bash
   npm run build
   ```
   *For Firefox:*
   ```bash
   npm run build:firefox
   ```

5. **Load the Extension into Your Browser**:
   - **Chrome / Chromium / Edge / Brave**:
     1. Open `chrome://extensions`.
     2. Enable **Developer mode** (top right toggle).
     3. Click **Load unpacked** and select the `.output/chrome-mv3` folder.
   - **Firefox**:
     1. Open `about:debugging#/runtime/this-firefox`.
     2. Click **Load Temporary Add-on...**.
     3. Select the `manifest.json` file inside the `.output/firefox-mv3` directory.

---

## How to Use

1. **Select Text**: Highlight any text on any webpage.
2. **Right-Click**: Select **"Read Aloud"** from the context menu.
3. **Listen & Follow**: The Voice Box side panel will open and begin reading immediately, highlighting the active sentence on the webpage.
4. **Change Voices & Engines**: Click the Voice Box extension icon in the toolbar or open the Voices catalog to select and download your preferred voices.
