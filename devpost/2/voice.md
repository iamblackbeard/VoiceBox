# Voice Storage, Preview, and Download Guide

This document provides a complete technical reference for all voices currently configured in the extension across both supported engines (**Kokoro TTS** and **Piper TTS**), detailing where previews and voice models are hosted, where they are downloaded/stored on the local machine, their direct URLs, and their available quality tiers (`x_low`, `low`, `medium`, `high`).

---

## 1. Overview: Previews & Download Locations

### 1.1 Audio Preview Location & Playback
- **Mechanism**: Previews are light pre-rendered sample audio files streamed directly on-demand via the HTML5 `<audio>` element (managed by `AudioPreviewManager` in [`lib/audio-preview.ts`](file:///home/blackbeard/Downloads/CODE/Extension/Listen/lib/audio-preview.ts)).
- **Catalog Browsing**: Zero heavy ONNX models are downloaded when users browse the catalog or listen to samples.
- **Online Location**:
  - **Kokoro**: Hosted on Hugging Face under `hexgrad/Kokoro-82M/resolve/main/samples/`.
  - **Piper**: Hosted on Hugging Face under `rhasspy/piper-voices/resolve/main/.../samples/speaker_0.mp3`.

### 1.2 Model Download Sources & Local Storage Place
- **Kokoro TTS (Neural Engine)**:
  - **Remote Sources**:
    - **Shared Base Model**: `onnx-community/Kokoro-82M-v1.0-ONNX` on Hugging Face (loaded via `@huggingface/transformers`).
    - **Voice Embeddings (`.bin`)**: Downloaded on-demand per voice from `https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX/resolve/main/voices/{id}.bin`.
  - **Local Storage Place**: Stored locally in the browser's **Cache Storage API** (`caches.open('kokoro-voices')` for voice embedding vectors, and standard Transformers.js cache for the ONNX model files).
  - **Shared Weights**: All Kokoro voices share the same base 82M model; switching voices downloads only a tiny ~256KB style vector `.bin` file!

- **Piper TTS (Fast CPU Engine)**:
  - **Remote Sources**:
    - Downloaded via `@mintplex-labs/piper-tts-web` from `https://huggingface.co/diffusionstudio/piper-voices/resolve/main/...` (mirrored from upstream `https://huggingface.co/rhasspy/piper-voices/resolve/main/...`).
    - Each voice consists of two files: `{voiceId}.onnx` (model weights) and `{voiceId}.onnx.json` (phonemization config).
  - **Local Storage Place**: Stored locally in the browser's **Origin Private File System (OPFS)**.
    - Accessed via `navigator.storage.getDirectory()`.
    - Stored under the directory `piper/` as `piper/{voiceId}.onnx` and `piper/{voiceId}.onnx.json`.

---

## 2. Voice Quality Tiers Explained

### Piper Quality Levels (`x_low`, `low`, `medium`, `high`)
Piper models are trained and packaged under four standardized quality tiers based on audio sample rate, model capacity, and parameter size:

| Quality Tier | Sample Rate | Typical Model Size | Characteristics & Trade-offs |
| :--- | :--- | :--- | :--- |
| **`x_low`** | 16,000 Hz | ~15 MB – 20 MB | Ultra lightweight; lowest CPU and memory overhead; fastest synthesis; audible compression artifacts. |
| **`low`** | 16,000 Hz / 22,050 Hz | ~25 MB – 35 MB | Fast CPU inference with reduced memory consumption; great for lower-end hardware. |
| **`medium`** | 22,050 Hz | ~50 MB – 70 MB | **Default sweet spot** for Listen. Excellent balance between vocal naturalness, clarity, and fast inference. |
| **`high`** | 22,050 Hz / 28,000 Hz | ~100 MB – 150 MB+ | Maximum fidelity and studio clarity; higher computational demand and larger download footprint. |

### Kokoro Quality Dimensions
Kokoro is an 82 million parameter neural architecture that handles qualities along two axes:
1. **Model Dtypes (Quantization Levels)**:
   - `q8` (8-bit quantized, ~86 MB) — Configured as default in [`lib/tts.worker.ts`](file:///home/blackbeard/Downloads/CODE/Extension/Listen/lib/tts.worker.ts) for fast local execution.
   - `q4` (4-bit quantized, ~45 MB) — Minimal RAM footprint.
   - `fp16` (16-bit half precision, ~165 MB) — High precision for WebGPU / GPU backends.
   - `fp32` (32-bit single precision, ~330 MB) — Unquantized original weights.
2. **Per-Voice Target Quality & Overall Grade** (from official training benchmarks):
   - Grade **A** / **A-**: `af_heart`, `af_bella`
   - Grade **B** / **B-**: `af_nicole`, `bf_emma`
   - Grade **C+**: `af_sarah`, `am_michael`
   - Grade **C** / **C-**: `af_sky`, `bm_george`
   - Grade **D** / **D+**: `bm_lewis`, `bm_daniel`
   - Grade **F+**: `am_adam`

---

## 3. Kokoro Voices (Curated in `lib/voices.ts`)

Kokoro uses a shared 82M base ONNX model (`model_q8.onnx`), and downloads a specific style embedding vector (`.bin`) for each voice.

| Voice Name | Voice ID | Gender & Accent | Voice Preview URL | Voice Embedding Download URL (`.bin`) | Voice Target Quality & Grade |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Heart** *(Default)* | `af_heart` | Female (American) | [Preview Sample](https://huggingface.co/hexgrad/Kokoro-82M/resolve/main/samples/af_heart_0.wav) | [af_heart.bin](https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX/resolve/main/voices/af_heart.bin) | Target: A, Grade: A |
| **Bella** | `af_bella` | Female (American) | [Preview Sample](https://huggingface.co/hexgrad/Kokoro-82M/resolve/main/samples/HEARME.wav) | [af_bella.bin](https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX/resolve/main/voices/af_bella.bin) | Target: A, Grade: A- |
| **Nicole** | `af_nicole` | Female (American) | [Preview Sample](https://huggingface.co/hexgrad/Kokoro-82M/resolve/main/samples/HEARME.wav) | [af_nicole.bin](https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX/resolve/main/voices/af_nicole.bin) | Target: B, Grade: B- |
| **Sarah** | `af_sarah` | Female (American) | [Preview Sample](https://huggingface.co/hexgrad/Kokoro-82M/resolve/main/samples/HEARME.wav) | [af_sarah.bin](https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX/resolve/main/voices/af_sarah.bin) | Target: B, Grade: C+ |
| **Sky** | `af_sky` | Female (American) | [Preview Sample](https://huggingface.co/hexgrad/Kokoro-82M/resolve/main/samples/HEARME.wav) | [af_sky.bin](https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX/resolve/main/voices/af_sky.bin) | Target: B, Grade: C- |
| **Emma** | `bf_emma` | Female (British) | [Preview Sample](https://huggingface.co/hexgrad/Kokoro-82M/resolve/main/samples/HEARME.wav) | [bf_emma.bin](https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX/resolve/main/voices/bf_emma.bin) | Target: B, Grade: B- |
| **Adam** | `am_adam` | Male (American) | [Preview Sample](https://huggingface.co/hexgrad/Kokoro-82M/resolve/main/samples/HEARME.wav) | [am_adam.bin](https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX/resolve/main/voices/am_adam.bin) | Target: D, Grade: F+ |
| **Michael** | `am_michael` | Male (American) | [Preview Sample](https://huggingface.co/hexgrad/Kokoro-82M/resolve/main/samples/HEARME.wav) | [am_michael.bin](https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX/resolve/main/voices/am_michael.bin) | Target: B, Grade: C+ |
| **George** | `am_george` | Male (American) | [Preview Sample](https://huggingface.co/hexgrad/Kokoro-82M/resolve/main/samples/HEARME.wav) | [am_george.bin](https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX/resolve/main/voices/am_george.bin) | Listed in catalog |
| **George (UK)** | `bm_george` | Male (British) | [Preview Sample](https://huggingface.co/hexgrad/Kokoro-82M/resolve/main/samples/HEARME.wav) | [bm_george.bin](https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX/resolve/main/voices/bm_george.bin) | Target: B, Grade: C |
| **Lewis** | `bm_lewis` | Male (British) | [Preview Sample](https://huggingface.co/hexgrad/Kokoro-82M/resolve/main/samples/HEARME.wav) | [bm_lewis.bin](https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX/resolve/main/voices/bm_lewis.bin) | Target: C, Grade: D+ |
| **Daniel** | `bm_daniel` | Male (British) | [Preview Sample](https://huggingface.co/hexgrad/Kokoro-82M/resolve/main/samples/HEARME.wav) | [bm_daniel.bin](https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX/resolve/main/voices/bm_daniel.bin) | Target: C, Grade: D |

> **Base Model Weights**:
> - Quantized ONNX model (q8): `https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX/resolve/main/onnx/model_q8.onnx`
> - Tokenizer Config: `https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX/resolve/main/tokenizer.json`

---

## 4. Piper Voices (Curated in `lib/voices.ts`)

Each Piper voice downloads an `.onnx` model file and an `.onnx.json` phonemization config file. Below are the exact URLs currently used by the extension.

| Voice Name | Voice ID | Current Quality | Other Available Qualities for Speaker | Voice Preview URL | Voice Model Downloading URL (`.onnx` & `.json`) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **HFC Female** *(Default)* | `en_US-hfc_female-medium` | `medium` | None (only `medium`) | [Preview Sample](https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/hfc_female/medium/samples/speaker_0.mp3) | • [Model ONNX](https://huggingface.co/diffusionstudio/piper-voices/resolve/main/en/en_US/hfc_female/medium/en_US-hfc_female-medium.onnx)<br>• [Config JSON](https://huggingface.co/diffusionstudio/piper-voices/resolve/main/en/en_US/hfc_female/medium/en_US-hfc_female-medium.onnx.json) |
| **Lessac** | `en_US-lessac-medium` | `medium` | `low`, `medium`, `high` | [Preview Sample](https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium/samples/speaker_0.mp3) | • [Model ONNX](https://huggingface.co/diffusionstudio/piper-voices/resolve/main/en/en_US/lessac/medium/en_US-lessac-medium.onnx)<br>• [Config JSON](https://huggingface.co/diffusionstudio/piper-voices/resolve/main/en/en_US/lessac/medium/en_US-lessac-medium.onnx.json) |
| **Amy** | `en_US-amy-medium` | `medium` | `low`, `medium` | [Preview Sample](https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/amy/medium/samples/speaker_0.mp3) | • [Model ONNX](https://huggingface.co/diffusionstudio/piper-voices/resolve/main/en/en_US/amy/medium/en_US-amy-medium.onnx)<br>• [Config JSON](https://huggingface.co/diffusionstudio/piper-voices/resolve/main/en/en_US/amy/medium/en_US-amy-medium.onnx.json) |
| **Ryan** | `en_US-ryan-medium` | `medium` | `low`, `medium`, `high` | [Preview Sample](https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/ryan/medium/samples/speaker_0.mp3) | • [Model ONNX](https://huggingface.co/diffusionstudio/piper-voices/resolve/main/en/en_US/ryan/medium/en_US-ryan-medium.onnx)<br>• [Config JSON](https://huggingface.co/diffusionstudio/piper-voices/resolve/main/en/en_US/ryan/medium/en_US-ryan-medium.onnx.json) |
| **Danny** | `en_US-danny-low` | `low` | None (only `low`) | [Preview Sample](https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/danny/low/samples/speaker_0.mp3) | • [Model ONNX](https://huggingface.co/diffusionstudio/piper-voices/resolve/main/en/en_US/danny/low/en_US-danny-low.onnx)<br>• [Config JSON](https://huggingface.co/diffusionstudio/piper-voices/resolve/main/en/en_US/danny/low/en_US-danny-low.onnx.json) |
| **Joe** | `en_US-joe-medium` | `medium` | None (only `medium`) | [Preview Sample](https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/joe/medium/samples/speaker_0.mp3) | • [Model ONNX](https://huggingface.co/diffusionstudio/piper-voices/resolve/main/en/en_US/joe/medium/en_US-joe-medium.onnx)<br>• [Config JSON](https://huggingface.co/diffusionstudio/piper-voices/resolve/main/en/en_US/joe/medium/en_US-joe-medium.onnx.json) |
| **Kristin** | `en_US-kristin-medium` | `medium` | None (only `medium`) | [Preview Sample](https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/kristin/medium/samples/speaker_0.mp3) | • [Model ONNX](https://huggingface.co/diffusionstudio/piper-voices/resolve/main/en/en_US/kristin/medium/en_US-kristin-medium.onnx)<br>• [Config JSON](https://huggingface.co/diffusionstudio/piper-voices/resolve/main/en/en_US/kristin/medium/en_US-kristin-medium.onnx.json) |
| **Kathleen** | `en_US-kathleen-low` | `low` | None (only `low`) | [Preview Sample](https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/kathleen/low/samples/speaker_0.mp3) | • [Model ONNX](https://huggingface.co/diffusionstudio/piper-voices/resolve/main/en/en_US/kathleen/low/en_US-kathleen-low.onnx)<br>• [Config JSON](https://huggingface.co/diffusionstudio/piper-voices/resolve/main/en/en_US/kathleen/low/en_US-kathleen-low.onnx.json) |
| **Alba** | `en_GB-alba-medium` | `medium` | None (only `medium`) | [Preview Sample](https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_GB/alba/medium/samples/speaker_0.mp3) | • [Model ONNX](https://huggingface.co/diffusionstudio/piper-voices/resolve/main/en/en_GB/alba/medium/en_GB-alba-medium.onnx)<br>• [Config JSON](https://huggingface.co/diffusionstudio/piper-voices/resolve/main/en/en_GB/alba/medium/en_GB-alba-medium.onnx.json) |
| **Alan** | `en_GB-alan-medium` | `medium` | `low`, `medium` | [Preview Sample](https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_GB/alan/medium/samples/speaker_0.mp3) | • [Model ONNX](https://huggingface.co/diffusionstudio/piper-voices/resolve/main/en/en_GB/alan/medium/en_GB-alan-medium.onnx)<br>• [Config JSON](https://huggingface.co/diffusionstudio/piper-voices/resolve/main/en/en_GB/alan/medium/en_GB-alan-medium.onnx.json) |
| **Charlotte** | `en_GB-southern_english_female-low` | `low` | None (only `low`) | [Preview Sample](https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_GB/southern_english_female/low/samples/speaker_0.mp3) | • [Model ONNX](https://huggingface.co/diffusionstudio/piper-voices/resolve/main/en/en_GB/southern_english_female/low/en_GB-southern_english_female-low.onnx)<br>• [Config JSON](https://huggingface.co/diffusionstudio/piper-voices/resolve/main/en/en_GB/southern_english_female/low/en_GB-southern_english_female-low.onnx.json) |
| **Sweetpea** | `en_GB-sweetpea-medium` | `medium` | Configured as `medium` | [Preview Sample](https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_GB/sweetpea/medium/samples/speaker_0.mp3) | • [Model ONNX](https://huggingface.co/diffusionstudio/piper-voices/resolve/main/en/en_GB/sweetpea/medium/en_GB-sweetpea-medium.onnx)<br>• [Config JSON](https://huggingface.co/diffusionstudio/piper-voices/resolve/main/en/en_GB/sweetpea/medium/en_GB-sweetpea-medium.onnx.json) |

*(Note: Upstream Rhasspy mirror URLs are also accessible by replacing `diffusionstudio/piper-voices` with `rhasspy/piper-voices` in the URLs above).*
