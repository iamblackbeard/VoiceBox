---
doc: spec
status: approved
---

# Local Voice Reader — Technical Spec

## How This Works, In Plain Language
Your extension has **three small pieces** that talk to each other by passing messages:

1. **The background script** is the doorman. It adds **Read Aloud** to the right-click menu. When you click it, it opens the side panel and asks the page for your selected text.
2. **The content script** lives on the web page. It's the only piece that can touch the page. It finds your selected text, cuts it into sentences, remembers where each sentence sits on the page, and paints the highlight on the sentence being spoken.
3. **The side panel** (a React app) is the music player. It owns the voice. It loads the Kokoro voice model, turns sentences into audio, plays them, and tells the content script which sentence to highlight.

**Why the voice lives in the side panel.** Audio, the model, and the play/pause button all stay in one place, so there is no hidden background page to keep in sync. A bonus: closing the panel naturally stops the reading.

**Why one sentence at a time.** The panel makes audio for a sentence and plays it. While it plays, it quietly makes audio for the next four or five. Because we know which sentence is playing, highlighting needs no timing tricks. That is your kernel.

**Privacy.** The text goes: page → content script → background → side panel → voice model, all inside your browser. The only network call is the one-time download of the voice model.

**One codebase, two browsers.** WXT builds the same code for Chromium (Chrome, Edge, Brave) and Firefox. It writes the right manifest for each, including Chrome's `side_panel` and Firefox's `sidebar_action`. Only a few lines differ, in how the panel is opened.

## The Core Journey Through the System
PRD ref: `prd.md > The Core Journey`.

1. **User selects text and right-clicks → Read Aloud.** The background script's context-menu handler fires. *(PRD: Triggering a reading)*
2. **Background opens the side panel immediately** (browsers only allow this straight inside the click). Chromium uses `sidePanel.open`; Firefox uses `sidebarAction.open`.
3. **Background injects the content script** into that tab (allowed because of the click) and asks it for the selection.
4. **Content script** reads the selection, splits it into sentences with `Intl.Segmenter`, keeps a list of page "ranges" (one per chunk), and returns the chunk texts.
5. **Background saves the chunk list** to short-lived memory storage (`storage.session`) with the tab id and a new `readingId`. The panel may not be loaded yet, so it can't just be messaged. The panel reads that storage when it opens and whenever it changes.
6. **Side panel starts a reading.** If the model isn't in the browser cache, the status area shows "Downloading the voice ....". The play button shows buffering. *(PRD: States and Boundaries)*
7. **The voice worker** (a background thread inside the panel) generates audio for chunk 1, then chunks 2–5 ahead of time.
8. **When chunk 1's audio is ready**, the panel plays it, shows the "Playing" toast and the pause icon, and tells the content script to highlight chunk 1. *(PRD: Sentence-by-sentence reading and highlighting, Play/Pause)*
9. **When a chunk ends**, the next one plays immediately and the highlight moves. The panel keeps generating so the buffer stays ~4–5 chunks ahead.
10. **Speed/Voice/Pause** act on the panel's player directly. Speed applies to the current and queued audio without regenerating anything.
11. **Last chunk ends** → the panel stops and the content script clears the highlight.
12. **New selection mid-reading** → step 1–5 repeat with a new `readingId`. The panel throws away the old queue and any audio that arrives late for the old id.
13. **Panel closes** → its open connection to the page drops, and the content script clears the highlight and the reading ends.

## Stack
| Piece | Choice | Why / tradeoff |
|---|---|---|
| Extension framework | **WXT** (~v0.21) — [docs](https://wxt.dev/) | *Learner choice.* Builds Chromium + Firefox from one codebase and generates both manifests. Tradeoff: replaces the CRXJS starter and is a new tool to learn. |
| UI | **React 19 + TypeScript** via `@wxt-dev/module-react` — [docs](https://wxt.dev/guide/essentials/frontend-frameworks) | *Learner choice.* They know it, and the panel has several states to track. |
| Styling | **Tailwind CSS v4** (`@tailwindcss/vite`) — [docs](https://tailwindcss.com/docs/theme) | *Carried from the starter.* Its `@theme` variables give the named color roles the PRD requires. |
| Voice | **Kokoro-82M** via **`kokoro-js`** (Transformers.js + ONNX Runtime Web) — [docs](https://github.com/hexgrad/kokoro/tree/main/kokoro.js) | *Learner choice.* Natural, fully local, ~92 MB at `q8`, downloaded once. Tradeoff: slower on machines without a fast CPU. |
| Sentence splitting | Built-in **`Intl.Segmenter`** — [MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/Segmenter) | No dependency. It's built into both browsers and understands "Dr." and "e.g.". |
| Audio playback | **`<audio>` element** with `playbackRate` (pitch kept) | Speed changes instantly with no pitch distortion. Tradeoff: gapless hand-off between elements needs care. |
| Highlight | **CSS Custom Highlight API** — [MDN](https://developer.mozilla.org/en-US/docs/Web/API/CSS_Custom_Highlight_API) | Highlights text without changing the page's HTML, so it can't break Reddit's layout. |
| Unit tests | **Vitest** (via WXT) — [docs](https://wxt.dev/guide/essentials/unit-testing) | *Recommended, optional.* For the pure logic: the chunker, the queue and the error mapping. You already like TDD. |

**Unverified — check early in the build:**
- That WXT creates a working `sidebar_action` for Firefox from a `sidepanel` entrypoint, and that the Firefox types cover `sidebarAction.open`.
- That Kokoro runs in a module Web Worker inside an extension page on both browsers.
- Firefox needs v140+ for the Custom Highlight API. Older versions won't highlight.
- That `playbackRate` 0.25 is accepted in both browsers.
- Exact voice speed and download behavior on your machine, on both browsers.

## Where It Runs and How Someone Tries It
- **Runs as:** a browser extension, fully local. Needs **Node 20+** (to be confirmed) and a Chromium browser and/or Firefox. No API keys, no accounts.
- **Develop:** `npm run dev` opens Chromium with the extension loaded; `npm run dev:firefox` does the same in Firefox.
- **Build for sharing:** `npm run build` / `npm run build:firefox`, which produce loadable folders under `.output/`.
- **Required demo video:** record in **Chrome** (assumption — see Open Issues) — select a Reddit paragraph → right-click **Read Aloud** → show the download message (clear the cache first) → show the sentence highlight moving → change speed → pause/resume. Mention that it also loads in Firefox.
- **Submission needs** the short demo video and a **public GitHub repo** (with a README that has the run steps above). **Deployment is optional and not planned.** Publishing to the Chrome/Firefox stores is out of scope.

## Look and Feel
Carried from `prd.md > Look and Feel` — no new design discovery.
- **Feel:** a calm music player. The selected text sits where a song title would, with three round buttons below it and a bigger play/pause in the middle.
- **Theme roles (never hardcoded):** `--color-bg-primary`, `--color-on-primary`, `--color-surface`, `--color-on-surface`, `--color-accent`, `--color-border`, defined once in `assets/theme.css` with Tailwind v4 `@theme`. Components use utilities like `bg-primary` and `text-on-primary`. A dark set overrides the same names.
- **Light:** white backgrounds with navy accents. **Dark:** deep navy/charcoal. Exact dark values are picked in the build.
- **Default theme:** follows the operating system / browser setting (`prefers-color-scheme`). There is **no in-panel toggle** (the PRD describes none). To be confirmed.
- **Font:** the system font stack (`system-ui, sans-serif`). It's common, and there is nothing to download.
- **On-page highlight:** a soft yellow background via `::highlight(lvr-current)`. This is a placeholder until the learner picks a color.
- **Copy tone:** short and plain, using the exact PRD messages: "Downloading the voice ....", "Playing", "You seem to be offline, check connection", "Encounter some error, while fetching voice".

## Components

### Background Script (`entrypoints/background.ts`)
Creates the **Read Aloud** menu item (shown only when text is selected) on install. On click: (1) opens the side panel **first and synchronously**; (2) injects the content script with `scripting.executeScript` (it can do this because of the click, using `activeTab`); (3) asks the content script for chunks; (4) writes the result to `storage.session`.
PRD ref: `prd.md > Triggering a reading`.

### Content Script (`entrypoints/reader.content.ts`)
Injected only on demand, not on every page, which fits the privacy promise. It:
- Reads the current selection and walks its text nodes to build one string plus an offset→node map.
- Splits it into sentences with `Intl.Segmenter`, then groups them into chunks (see Chunker).
- Builds a DOM `Range` for each chunk.
- Handles messages: `highlight(chunkIndex)`, `clear`.
- Accepts a connection from the panel. If that connection drops, it clears the highlight.
- Guards against being injected twice into the same tab.
PRD ref: `prd.md > Sentence-by-sentence reading and highlighting`.

### Chunker (`lib/chunker.ts`) — pure logic
Takes sentences and returns chunks of **one or two sentences**. A sentence under ~30 characters is merged with the next one. A very long sentence is kept whole. It is pure functions with no browser APIs, so it is easy to unit test.
PRD ref: `prd.md > Sentence-by-sentence reading and highlighting`.

### Voice Worker (`lib/tts.worker.ts`) and Voice Client (`lib/tts-client.ts`)
The worker loads Kokoro **once** (`dtype: "q8"`, `device: "wasm"`, one thread) and answers `generate(chunkText, voiceId, readingId)` with audio plus its sample rate. The client is the panel-side wrapper. It sends requests, reports download progress, and maps failures to the two PRD error messages (offline vs. any other failure).
PRD ref: `prd.md > States and Boundaries` (first use, later uses, errors, privacy).

### Player and Look-ahead Queue (`lib/player.ts`)
The panel's audio engine. It owns the list of chunks, the current index and the audio for each. It keeps the next ~4–5 chunks generating, plays them back-to-back, and exposes `play`, `pause`, `resume`, `setSpeed` and `stop`. When a chunk starts it tells the content script to highlight it. Results tagged with an old `readingId` are discarded.
PRD ref: `prd.md > Play/Pause`, `prd.md > Speed`, `prd.md > Sentence-by-sentence reading and highlighting`.

### Side Panel UI (`entrypoints/sidepanel/`)
`App.tsx` holds the reading state and wires up the player. Child components:
- **StatusBar** shows the download message and errors at the top.
- **NowReading** shows the selected text, like a song title.
- **PlayerControls** is the three-button row.
- **Popup** is the shared above-the-button popup shell.
- **SpeedPopup** has the 0.25x–2x slider.
- **VoicePopup** has the voice list, which holds one voice for now.
- **Toast** shows "Playing".
PRD ref: `prd.md > Screens and Layout`, `prd.md > Speed`, `prd.md > Voice`.

### Theme (`assets/theme.css`)
Defines the named color roles for light and dark and keeps every color in one place.
PRD ref: `prd.md > Theme`, `prd.md > Look and Feel`.

## Data Model
All data lives in the panel, except two small items.

| Data | Where | Updated by | When you come back |
|---|---|---|---|
| Voice model files (~92 MB) | Browser **Cache API** (Transformers.js does this itself) | First-use download | Still there, so no re-download. |
| Pending reading `{readingId, tabId, chunks[]}` | `storage.session` (memory only, wiped when the browser closes) | Background, on each Read Aloud click | Read by the panel on open and on change. |
| Reading state `{status, chunkIndex, speed, voiceId, message}` | React state in the panel | The player and the UI | Resets when the panel closes. Speed returns to 1x. |
| Chunk page ranges | Content script memory | Content script, per reading | Gone on page reload. The reading ends too. |

`status` is one of: `idle | downloading | buffering | playing | paused | ended | error`.

Nothing else is stored. There are no accounts and no analytics. The session storage item is the only extra beyond the PRD's "nothing else is stored", and it is needed for the hand-off between the background script and the panel. It is memory-only.

## File Structure
The starter's `src/`, `index.html`, `manifest.json`, `vite.config.ts` and CRXJS are replaced when WXT is set up.

```
Listen/
├── entrypoints/
│   ├── background.ts            # context menu, opens panel, injects content script, saves pending reading
│   ├── reader.content.ts        # selection → chunks, page highlight (injected on demand)
│   └── sidepanel/
│       ├── index.html           # panel page (WXT turns this into side_panel / sidebar_action)
│       ├── main.tsx             # React entry
│       ├── App.tsx              # reading state + wiring
│       └── components/
│           ├── StatusBar.tsx
│           ├── NowReading.tsx
│           ├── PlayerControls.tsx
│           ├── Popup.tsx
│           ├── SpeedPopup.tsx
│           ├── VoicePopup.tsx
│           ├── Toast.tsx
│           └── icons.tsx        # inline SVG icons (no icon dependency)
├── lib/
│   ├── messages.ts              # typed messages between the three pieces
│   ├── chunker.ts               # sentences → 1–2 sentence chunks (pure, unit tested)
│   ├── tts.worker.ts            # loads Kokoro, generates audio
│   ├── tts-client.ts            # panel-side wrapper around the worker, maps errors
│   ├── player.ts                # look-ahead queue, playback, speed, highlight calls
│   ├── errors.ts                # offline vs. generic error → PRD messages
│   └── voices.ts                # list of available voices (one for now)
├── assets/
│   └── theme.css                # Tailwind v4 @import + @theme named color roles (light + dark)
├── public/
│   ├── ort/                     # onnxruntime-web .wasm files, served locally (no CDN)
│   └── icon/                    # extension icons
├── tests/                       # Vitest tests for chunker, player queue, errors
├── devpost/                     # Devpost learning workspace
├── wxt.config.ts                # manifest: permissions, CSP, name; React + Tailwind setup
├── package.json
├── tsconfig.json
└── README.md                    # how to run, build, and record the demo
```

## External Services and Dependencies
- **Hugging Face model hosting** — one-time download of `onnx-community/Kokoro-82M-v1.0-ONNX` (`q8`, ~92 MB) plus voice files. No key, no account and no cost. It is the **only** network call. If Hugging Face is unreachable, see Failure Modes. [Model page](https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX).
- **`kokoro-js`** — `KokoroTTS.from_pretrained(id, {dtype, device, progress_callback})` then `tts.generate(text, {voice})`, which returns audio. [npm](https://www.npmjs.com/package/kokoro-js).
- **`onnxruntime-web`** (installed by `kokoro-js`) — by default it loads its `.wasm` files **from a CDN**. We must point `wasmPaths` at the local `public/ort/` copy. A CDN fetch would break both the privacy promise and the extension's rules about remote code.
- **WXT** — [docs](https://wxt.dev/). **Extension APIs** — [Chrome side panel](https://developer.chrome.com/docs/extensions/reference/api/sidePanel), [Firefox sidebarAction](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/sidebarAction), [contextMenus](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/menus).
- **Manifest settings:**
  - permissions `contextMenus`, `activeTab`, `scripting`, `storage`, and `sidePanel` (Chromium only).
  - `host_permissions` for the model host.
  - A CSP with `'wasm-unsafe-eval'` for extension pages.

## Important Failure Modes
- **Offline or blocked during the model download** → status shows "You seem to be offline, check connection". The button returns to play, and a new Read Aloud retries the download.
- **Model fails to load or generate (corrupt cache, out of memory, unknown error)** → status shows "Encounter some error, while fetching voice".
- **First sentence takes long on a slow CPU** → the play button stays in the buffering state. Playback starts once chunk 1 is ready. If a later chunk isn't ready when the previous one ends, the player waits in buffering instead of skipping.
- **Selection can't be mapped back onto the page** (for example text inside an iframe or some complex pages) → reading still works. That chunk simply isn't highlighted.
- **Page can't be scripted** (browser internal pages, the store) → the status shows "Encounter some error, while fetching voice" and nothing plays.

## What Was Simplified and Why
- **One voice, one model size** (`q8` on WASM) instead of picking the model by hardware — keeps the download at ~92 MB, with identical behavior in both browsers. A WebGPU path can be added later if the speed is a problem.
- **Control through the panel only, with no keyboard shortcuts** — the PRD asks for none.
- **Settings are not remembered** (speed returns to 1x, voice is the single voice) — the PRD says nothing else is stored.
- **Sentence-level highlighting only** — word-level highlighting would need audio timing.
- **Content script injected on demand** instead of running on every site — it's one extra step, but it keeps the extension from touching pages you never use it on.
- **No store publishing, no deployment** — video plus public repo is the submission.

## Decisions and Open Issues

### Decisions
| Decision | Chosen | Who decided | Tradeoff |
|---|---|---|---|
| UI framework | React + TypeScript | Learner | One extra dependency, but a familiar tool. |
| Voice engine | Kokoro through `kokoro-js`, running in the side panel | Learner | A 92 MB download, and it's slower without a fast CPU. |
| Browsers | Chromium **and** Firefox | Learner | Two manifests, and the Firefox side is less proven. |
| Tooling | WXT instead of the CRXJS starter | Learner | New tool, but cross-browser is built in. |
| Tailwind v4 for theme roles, Vitest for logic, system font | As above | Agent recommendation, **accepted by the learner at review** | Small. All are easy to swap. |
| `q8` + WASM only, single thread | As above | Agent recommendation, **accepted by the learner at review** | Slower than WebGPU, but simpler and consistent. |
| On-demand content script via `activeTab` | As above | Agent recommendation, **accepted by the learner at review** | Slightly more code, less access to the user's pages. |
| `<audio>` element for playback and speed | As above | Agent recommendation, **accepted by the learner at review** | Needs care to avoid gaps between sentences. |
| `Intl.Segmenter` for splitting; chunk = 1–2 sentences | As above | Derived implementation detail from the PRD | Short sentences are merged. |
| `storage.session` for the hand-off from background to panel | As above | Derived implementation detail | Memory only. Needed because the panel may not be open yet. |

### The learner's open question
**How can one codebase work in both Chromium and Firefox when they open the side panel differently?** Clarified in "How This Works": WXT generates the right manifest entry for each browser, and only the one line that opens the panel branches. **Evidence needed in the build:** the first build step loads the same empty panel in both browsers before any voice code is added. Voice speed in Firefox is a second thing to measure.

### Still open
- **Demo browser:** assumed Chrome. The learner did not answer this.
- **Default theme:** assumed to follow the OS, with no toggle. (PRD open question.)
- **Highlight color** and **dark theme colors:** placeholders for now. (PRD open question.)
- **Final product name:** working title "Local Voice Reader". (PRD open question.)
- **Assumption from PRD:** closing the panel stops the reading. This is designed in (panel→page connection) but must be tested in **Firefox**.
- **Verify early:** Node version; Firefox sidebar generation in WXT; the model worker; `playbackRate` at 0.25x; Hugging Face downloads from an extension page (CORS and redirects); Custom Highlight API support in the target Firefox version.
