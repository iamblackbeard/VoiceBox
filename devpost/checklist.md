---
doc: checklist
status: approved
---

# Build Checklist

Build mode: learn

## Slices

- [x] **1. Right-click Read Aloud opens a themed side panel showing your selected text (Chromium and Firefox)**
  Becomes usable: A loadable extension in Chrome and Firefox. Select text on any page, right-click **Read Aloud**, and the side panel opens in the music-player layout with your selected text at the top. Light and dark theme follow the OS. Nothing is spoken yet.
  Why now: It proves the whole path from the page to the panel, and answers your cross-browser question before any voice code exists. Bootstrapping (WXT, React, Tailwind) lives here, and every later slice has a place to land.
  PRD ref: `prd.md > Triggering a reading`, `prd.md > Screens and Layout`, `prd.md > Theme`
  Spec ref: `spec.md > Components > Background Script`, `spec.md > Components > Content Script`, `spec.md > Components > Side Panel UI`, `spec.md > Components > Theme`, `spec.md > Data Model`, `spec.md > File Structure`, `spec.md > Look and Feel`
  Build: Replace the CRXJS starter with WXT + React + Tailwind v4. Add the manifest settings, the context menu, the on-demand content script that returns the selected text, the hand-off through `storage.session`, and the panel layout (status area, selected text, three round buttons as an empty shell) with the named theme colors.
  Verify (mechanical): `npm run build` and `npm run build:firefox` both succeed; the generated manifests show `side_panel` for Chromium and `sidebar_action` for Firefox, plus the planned permissions; the dev server starts with no errors.
  Learner check: Load the extension in Chrome and in Firefox, select a paragraph, right-click **Read Aloud**, and confirm the panel opens with that text. Switch your OS between light and dark and check that the panel follows.
  Commit: `Scaffold WXT extension with Read Aloud side panel`

- [x] **2. You hear your selected text read aloud, sentence by sentence**
  Becomes usable: Choosing Read Aloud downloads the voice on first use ("Downloading the voice ...."), then speaks the text. The play button shows buffering, then pause. A "Playing" toast appears, pause and resume work, and the voice stops at the end. Highlighting, look-ahead and speed come later.
  Why now: This is your kernel and the biggest unknown (Kokoro in a worker in an extension, and how fast it is on your machine). Finding out early is cheap.
  PRD ref: `prd.md > Sentence-by-sentence reading and highlighting`, `prd.md > Play/Pause`, `prd.md > States and Boundaries`
  Spec ref: `spec.md > Components > Chunker`, `spec.md > Components > Voice Worker and Voice Client`, `spec.md > Components > Player and Look-ahead Queue`, `spec.md > External Services and Dependencies`, `spec.md > Important Failure Modes`
  Build: Add the chunker (tests first). Add `kokoro-js`, serve the ONNX `.wasm` files locally, and load the model in a worker. Generate audio for one chunk at a time and play each chunk after the last. Add the status messages, the play/pause button states and the toast. Map failures to the two PRD error messages.
  Verify (mechanical): Chunker unit tests pass; both builds succeed; a Node script generates a WAV from the model and the file is non-empty (proves the model and `kokoro-js` call); the built extension has the `.wasm` files and no CDN URLs.
  Learner check: Clear the site data, select a Reddit paragraph, and click Read Aloud. You should see the download message, then a buffering button, the "Playing" toast, and a natural voice. Pause and resume it. Tell me how long the first sentence took on Chrome and on Firefox.
  Commit: `Read selected text aloud with local Kokoro voice`

- [x] **3. The sentence being spoken is highlighted on the page**
  Becomes usable: While the voice speaks, the current sentence is highlighted on the web page. The highlight moves with the voice and clears at the end. It also clears if you close the panel.
  Why now: This is the second half of your kernel, and it only needs the sentence boundaries that slice 2 already produces.
  PRD ref: `prd.md > Sentence-by-sentence reading and highlighting`, `prd.md > States and Boundaries`
  Spec ref: `spec.md > Components > Content Script`, `spec.md > Components > Chunker`, `spec.md > Look and Feel`, `spec.md > Important Failure Modes`
  Build: In the content script, map each chunk to a page Range and paint it with the CSS Custom Highlight API. Add the `highlight` and `clear` messages. The panel sends them as chunks start and end. Add the panel-to-page connection, so closing the panel clears the highlight. A chunk that can't be mapped is spoken but not highlighted.
  Verify (mechanical): Unit tests for the offset-to-chunk mapping pass; both builds succeed; the page-side code is checked against a local test HTML page, which gets the expected highlight ranges when it's run in a browser.
  Learner check: Read a long paragraph on Reddit. Does the highlighted sentence match what you hear? Does it clear at the end, and when you close the panel? Try Firefox too.
  Commit: `Highlight the spoken sentence on the page`

- [ ] **4. Playback is smooth, and a new selection replaces the old reading**
  Becomes usable: Sentences play without noticeable gaps because the next 4–5 are prepared while one plays. Choosing Read Aloud on new text mid-reading stops the old reading and starts the new one.
  Why now: Slices 2–3 prove the kernel works. This one makes it pleasant to use for a long post.
  PRD ref: `prd.md > Sentence-by-sentence reading and highlighting`, `prd.md > Triggering a reading`, `prd.md > Play/Pause`
  Spec ref: `spec.md > Components > Player and Look-ahead Queue`, `spec.md > Data Model`
  Build: Add the look-ahead queue with a `readingId` so stale audio is dropped, hold in buffering when a chunk isn't ready, and handle the replacement of the reading on a new selection.
  Verify (mechanical): Unit tests for the queue (look-ahead size, stale results ignored, waits when empty) pass; both builds succeed.
  Learner check: Read a long post, and listen for pauses between sentences. Then select other text mid-reading and choose Read Aloud, and check that the old reading stops and the new one starts.
  Commit: `Add look-ahead queue and replace reading on new selection`

- [ ] **5. You can change the speed and the voice from popups**
  Becomes usable: The Speed button opens a slider popup (0.25x–2x) above it, and the Voice button opens a list popup with the one available voice.
  Why now: These are the remaining controls in your music-player layout, and they act on the player that already works.
  PRD ref: `prd.md > Speed`, `prd.md > Voice`, `prd.md > Screens and Layout`
  Spec ref: `spec.md > Components > Side Panel UI`, `spec.md > Components > Player and Look-ahead Queue`
  Build: Add the shared Popup, the Speed slider (applies `playbackRate` to the current and queued audio) and the Voice list. Make the voice list read from `lib/voices.ts` with one entry.
  Verify (mechanical): Unit test that speed changes apply to current and queued audio; both builds succeed; no hardcoded colors in the new components (checked with a search).
  Learner check: While it's reading, drag the speed to 0.25x and then 2x and listen for slower and faster speech without it turning squeaky or deep. Open the voice popup and check that it shows the single voice.
  Commit: `Add speed and voice popups`

- [ ] **6. Errors and edge cases behave as the PRD says, and the project is ready to try**
  Becomes usable: Going offline on first use shows "You seem to be offline, check connection". Other failures show "Encounter some error, while fetching voice". Pages that can't be scripted fail politely. The README explains how to run, build and record the demo.
  Why now: This hardens what's built, and the README is needed for the submission.
  PRD ref: `prd.md > States and Boundaries`
  Spec ref: `spec.md > Important Failure Modes`, `spec.md > Where It Runs and How Someone Tries It`
  Build: Finish the offline and generic error paths, the not-scriptable-page path, and the end-of-text and panel-close behavior in Firefox. Write the README with the run, build and demo steps.
  Verify (mechanical): Unit tests for error mapping (offline vs. other) pass; both builds succeed; the README commands run as written.
  Learner check: Clear the site data, go offline, and click Read Aloud, and read the message. Try it on a browser-internal page and see what happens.
  Commit: `Handle error states and add README`

## Hands-on Checkpoints

- [ ] Early usable behavior explored — after slice 2, when you've heard the voice on your machine in both browsers
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

- Slice 1: WXT builds Firefox as Manifest V2 by default, which has no `scripting` API. Firefox scripts now use `--mv3` (`dev:firefox`, `build:firefox`); output is `.output/firefox-mv3/`. Also added `data_collection_permissions: none` for Firefox and `sidebarAction` is cast because WXT's types follow Chrome's API.

