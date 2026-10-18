---
doc: checklist
status: approved
---

# Build Checklist — Voice Picker & Catalog

Build mode: learn

## Slices

- [x] **1. Voice catalog data layer, persistent preferences, and side panel quick switcher**
  Becomes usable: The Voice button in the side panel player is enabled. Clicking it opens a `VoicePopup` above the button listing favorite voices for the active engine (defaults to Heart for Kokoro, HFC Female for Piper) with an active checkmark. Selecting a voice updates the active voice in storage and immediately changes the voice used for subsequent sentences.
  Why now: Delivers the core player functionality first without waiting for the catalog UI. It establishes the catalog data structures, storage migration, and player integration end-to-end.
  PRD ref: `prd.md > Voice`, `prd.md > Screens and Layout`
  Spec ref: `VoiceResearch.md > 3.3 Side Panel Voice Popup`, `VoiceResearch.md > 4. Voice Catalog`, `VoiceResearch.md > 6. Data Model & Storage Schema`
  Build: In `lib/voices.ts`, define the full 24-voice catalog (12 Kokoro, 12 Piper) with IDs, display names, gender, accent, style tags, and preview URLs. In `lib/settings.ts`, add `VoicePreferences` (`activeVoice`, `favorites`) with backwards-compatible defaults and persistence. Update `lib/player.ts` to read the active voice from settings, load the selected voice, and pass it to generation. Build `entrypoints/sidepanel/components/VoicePopup.tsx` and enable the Voice button in `PlayerControls.tsx`.
  Verify (mechanical): Unit tests pass for `lib/voices.ts` (catalog counts, retrieval helpers) and `lib/settings.ts` (defaults, storage reads/writes, migration); `npm run build` and `npm run build:firefox` succeed.
  Learner check: Open the side panel, click the Voice button, verify the popup opens showing the default active voice, and select a voice. Start reading and verify speech plays with the selected voice.
  Commit: `Add voice data layer and side panel quick switcher popup`

- [x] **2. Dedicated voice catalog page with audio sample previews**
  Becomes usable: A standalone extension tab at `voices.html` showing all 24 curated voices (12 Kokoro, 12 Piper) in clean tabs with light/dark theme support. Each card displays voice traits (gender, accent, style) and an interactive ▶ / ⏸ audio player that streams sample speech clips instantly with zero model download.
  Why now: Learners and users need an interactive space to audition voices before curating their favorites. Pre-rendered audio previews keep catalog browsing lightweight and fast.
  PRD ref: `prd.md > Voice`, `prd.md > Screens and Layout`
  Spec ref: `VoiceResearch.md > 3.2 Dedicated Voice Catalog Page`, `VoiceResearch.md > 4. Voice Catalog`, `VoiceResearch.md > 5. Sample Audio Strategy`
  Build: Register WXT entrypoint `entrypoints/voices/index.html` and create `entrypoints/voices/App.tsx`. Implement responsive grid layout using existing semantic theme tokens (`bg-primary`, `bg-surface`, `text-on-primary`, `accent`). Add engine tabs with favorite count pills. Implement sample audio player logic ensuring only one sample plays at a time and graceful offline handling.
  Verify (mechanical): `npm run build` and `npm run build:firefox` succeed; `voices.html` is output in Chrome and Firefox build folders; unit tests verify preview audio URL formats and single-sample playback state manager.
  Learner check: Open `voices.html` directly in the browser, toggle between Kokoro and Piper tabs, and click ▶ on several voice cards to listen to the audio preview clips.
  Commit: `Add dedicated voice catalog page with audio sample previews`

- [ ] **3. Favorite management (max 5) and dynamic unpinned voice handling**
  Becomes usable: In `voices.html`, users can favorite/unfavorite voices (♡ / ♥) up to 5 per engine. Attempting to add a 6th favorite shows an informative warning. Users can click "Use as Active Voice"; selecting an unpinned voice shows a toast with an option to favorite it. In the side panel, the popup dynamically displays `[5 Favorites] + [1 Active Voice]` when unpinned, and picking any favorite dismisses the unpinned voice back to 5.
  Why now: Implements the complete favorite management rules and the dynamic list coordination between the catalog and the side panel player.
  PRD ref: `prd.md > Voice`, `prd.md > States and Boundaries`
  Spec ref: `VoiceResearch.md > 2. User Journey & Core Interactions`, `VoiceResearch.md > 3.2 Dedicated Voice Catalog Page`, `VoiceResearch.md > 3.3 Side Panel Voice Popup`
  Build: Implement favorite limit validation (max 5) and active voice selection actions in `lib/settings.ts`. In `entrypoints/voices/App.tsx`, connect heart toggle buttons, favorite counter badge, 6th-favorite modal/toast, and non-favorite selection toast with `[Add to Favorites]` button. In `entrypoints/sidepanel/components/VoicePopup.tsx`, implement dynamic list construction (5 favorites + 1 active if unpinned) and auto-dismissal of unpinned voice on favorite selection. Add catalog link footer.
  Verify (mechanical): Unit tests pass for 5-favorite cap enforcement, toggle mutations, and dynamic popup list formatting; both Chrome and Firefox builds succeed.
  Learner check: In `voices.html`, favorite 5 voices and attempt a 6th to check the warning toast. Select an unpinned voice, open the side panel, and confirm it displays 6 voices (5 favorites + 1 active). Click one of your favorites in the side panel and confirm the unpinned voice disappears.
  Commit: `Add voice favorites management and dynamic side panel list`

- [ ] **4. Toolbar settings entry point and full cross-page navigation integration**
  Becomes usable: The toolbar popup (`entrypoints/popup/App.tsx`) displays a dedicated "Voice" row under the engine radios with the currently active voice name and an arrow. Clicking the row opens `voices.html` in a new tab. In the side panel voice popup, clicking "Manage all voices in catalog ›" also opens `voices.html`. Voice changes synchronize reactively across all open views and the player.
  Why now: Completes the end-to-end user journey across all three extension surfaces (toolbar popup, side panel, and dedicated tab) and verifies seamless switching across both engines during live reading.
  PRD ref: `prd.md > Voice`, `prd.md > Triggering a reading`
  Spec ref: `VoiceResearch.md > 2. User Journey & Core Interactions`, `VoiceResearch.md > 3.1 Toolbar Settings Entry Point`, `VoiceResearch.md > 7. Model Download & Memory Management`
  Build: Add the Voice row in `entrypoints/popup/App.tsx` displaying the active voice for the selected engine and opening `voices.html` via `browser.tabs.create`. Wire catalog link in `VoicePopup.tsx`. Verify reactive storage updates so changing active voice or engine in one view immediately updates the others. Ensure player speech generation handles voice switching cleanly for both Kokoro and Piper.
  Verify (mechanical): Unit tests verify popup voice row display and navigation trigger; `npm run build` and `npm run build:firefox` succeed; end-to-end storage reactivity verified.
  Learner check: Open the extension toolbar popup, check that the active voice matches your selection, click the Voice row to open `voices.html`, select a new voice, and trigger Read Aloud on a web page to hear the updated voice in action.
  Commit: `Integrate toolbar popup voice row and cross-page navigation`

## Hands-on Checkpoints

- [ ] Early usable behavior explored — after slice 1, when you can switch voices in the side panel and hear the change
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
