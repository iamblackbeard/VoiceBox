---
doc: checklist
status: approved
---

# Build Checklist

Build mode: learn

## Slices

- [x] **1. Interactive Sentence Reader with In-Memory Chunk Caching and Zero-Latency Replay**
  Becomes usable: The side panel displays selected text as an interactive, numbered sentence stream that highlights in lockstep with the spoken voice and the host webpage. Clicking any sentence immediately seeks audio playback and webpage highlighting to that sentence (playing instantly if cached, or prioritizing synthesis if pending). When reading completes, the play button transforms into a Replay button that restarts playback immediately from volatile memory with zero model inference delay.
  Why now: Delivers the unique kernel and tackles the primary technical challenge upfront: replacing the monolithic audio element with a decoupled Web Audio engine (`AudioContext`, `GainNode`) and in-memory `AudioBuffer` cache.
  PRD ref: `prd.md > The Core Journey` (steps 4-6, 10), `prd.md > Interactive Sentence Reader & Click-to-Seek Scrubbing`, `prd.md > Replay & In-Memory Audio Chunk Caching`
  Spec ref: `spec.md > Components > Audio Engine & In-Memory Chunk Cache (lib/player.ts)`, `spec.md > Components > Side Panel Controller & Sentence List (entrypoints/sidepanel)`, `spec.md > Components > Content Script Highlighting Synchronizer (entrypoints/reader.content.ts)`, `spec.md > Data Model > audioChunkCache`, `spec.md > Important Failure Modes`
  Build: Transition `lib/player.ts` to Web Audio API with `Map<number, AudioBuffer>` cache, sentence seek handling, abort-prefetch prioritization via worker client, and cache eviction on new reading or 10-minute idle. Build `SentenceList.tsx` with active sentence highlighting and click-to-seek triggers. Update `entrypoints/reader.content.ts` to handle sentence jump messages. Update `PlayerControls.tsx` with circular Replay button state on completion.
  Verify (mechanical): Run Vitest tests for player seek, buffer caching, and sentence chunk indexing; verify `npm run build` passes with zero type errors; run a headless test asserting sentence seeking dispatches highlight message and cache hit delivers instantaneous buffer reuse.
  Learner check: Select a 4–5 sentence paragraph on an article and click Read Aloud. Confirm each sentence appears as a distinct card in the side panel. Click sentence 3 while sentence 1 is playing and verify both voice and on-page highlight jump immediately. Let the passage finish, click the Replay button, and confirm it begins playing sentence 1 instantly with zero delay.
  Commit: `Implement interactive sentence scrubbing, in-memory chunk cache, and instant replay`

- [x] **2. Originating Tab Awareness, Jump Navigation & Tab Close Policy**
  Becomes usable: The side panel header renders an originating tab pill with the active page title and favicon. Clicking this pill immediately switches the browser window and active tab back to the source webpage. Closing the source tab triggers the user-selected policy configured in popup settings (`stop` playback or `continue` playing existing cached chunks with a `[Closed Tab]` badge).
  Why now: Readers frequently switch across multiple tabs while listening. Establishing origin awareness right after the sentence reader gives users complete navigation control before adding secondary player modes.
  PRD ref: `prd.md > The Core Journey` (step 3), `prd.md > Originating Tab Awareness & Focus Navigation`, `prd.md > The Extension Toolbar Popup`
  Spec ref: `spec.md > Components > Originating Tab Manager & Navigation`, `spec.md > Components > Popup Settings & Tab Navigation`, `spec.md > Data Model > originatingTab`, `spec.md > Data Model > onTabCloseAction`, `spec.md > Important Failure Modes`
  Build: Enhance `entrypoints/background.ts` to capture `tabId`, `windowId`, `title`, and `favIconUrl` into `PendingReading`. Build `Header.tsx` with the clickable origin tab badge and fallback icon. Wire `browser.tabs.update` and `browser.windows.update` for instant focus. Add `browser.tabs.onRemoved` listener in side panel/player to enforce `onTabCloseAction`. Update `entrypoints/popup/App.tsx` and `lib/settings.ts` with the Tab Navigation Policy setting (`stop` | `continue`).
  Verify (mechanical): Unit tests asserting tab metadata propagation, `onTabCloseAction` persistence in settings, and `tabs.onRemoved` lifecycle handling; verify `npm run build` succeeds.
  Learner check: Trigger Read Aloud on a webpage, open a new browser tab, and click the originating tab pill in the side panel header—verify the browser jumps straight back to the reading tab. Then close the reading tab and confirm the behavior matches your policy setting in the toolbar popup.
  Commit: `Add originating tab awareness, focus switching, and tab close policy`

- [ ] **3. Collapsible Mini-Player Mode & Volume Control Popover**
  Becomes usable: The side panel header features a collapse/expand toggle button that collapses the full sentence list into a compact ~64px docked mini-player bar showing a sentence preview snippet, transport controls, and volume access. A bottom-right volume icon opens a popover with a 0%–100% slider and mute toggle that modulates loudness smoothly in real time without audio glitches.
  Why now: Builds directly on the decoupled Web Audio engine: toggling between full and mini view does not restart or interrupt audio playback. Adds fine-grained audio loudness control.
  PRD ref: `prd.md > The Core Journey` (steps 7-9), `prd.md > Collapsible Mini-Player Mode`, `prd.md > Volume Control Popover`
  Spec ref: `spec.md > Components > Collapsible Mini-Player Mode`, `spec.md > Components > Volume Controller & Popover`, `spec.md > Data Model > isMiniPlayer`, `spec.md > Data Model > volume`
  Build: Implement `VolumePopover.tsx` with slider, mute toggle, and dynamic volume icons; wire it to `GainNode.gain` in `lib/player.ts` and persist to `browser.storage.local`. Build `MiniPlayer.tsx` (~64px docked strip) with current sentence preview, mini controls, and expand trigger. Add collapse state toggle in `entrypoints/sidepanel/App.tsx`.
  Verify (mechanical): Unit tests verifying GainNode modulation values, volume persistence across sessions, and mini-player render states without audio engine teardown; `npm run build` succeeds.
  Learner check: While audio is playing, click the volume button and drag the slider to verify immediate loudness adjustment. Then click the collapse button in the header—verify the panel shrinks to a sleek 64px mini bar while speech continues uninterrupted, and click expand to return to the full sentence list.
  Commit: `Add collapsible mini-player dock and volume control popover`

- [x] **4. Synchronized Sun/Moon Theme Engine across Side Panel & Toolbar Popup**
  Becomes usable: A Sun/Moon toggle button in both the side panel header and toolbar popup lets the user switch between clean Light and dark Slate/Navy themes. The theme loads instantly before first paint without visual flicker, falls back gracefully to system `prefers-color-scheme`, and synchronizes bidirectionally across all open extension surfaces in real time.
  Why now: With all features and surfaces implemented, the semantic design tokens wrap the entire suite in a unified, accessible visual design adhering to strict contrast standards.
  PRD ref: `prd.md > The Core Journey` (step 2), `prd.md > Theme Switching and Single-Source Persistence`, `prd.md > Look and Feel`
  Spec ref: `spec.md > Components > Design System & Theme Engine`, `spec.md > Look and Feel > Semantic Color Tokens`, `spec.md > Data Model > theme`
  Build: Update `assets/theme.css` with semantic CSS variables for `[data-theme="light"]` and `[data-theme="dark"]`. Add early theme bootstrap script in HTML entrypoints to prevent flash of wrong theme. Add Sun/Moon toggle button in `Header.tsx` and popup `App.tsx`. Synchronize active theme via `browser.storage.onChanged`. Ensure zero hardcoded color classes remain across all components.
  Verify (mechanical): Automated script checking for hardcoded hex/color classes in all components; unit test verifying theme storage synchronization; `npm run build` completes with zero errors.
  Learner check: Click the Moon/Sun toggle in the side panel and observe the smooth transition to dark/light theme. Open the toolbar popup and verify it matches. Toggle the theme in the popup and verify the side panel updates instantly in real time. Reload the extension and confirm your theme choice persists without flickering.
  Commit: `Implement synchronized light/dark theme engine across all extension surfaces`

## Hands-on Checkpoints

- [ ] Early usable behavior explored — after slice 1, when interactive sentence scrubbing, in-memory chunk caching, and instant replay are working in the side panel
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

- **SentenceList layout → flowing prose** (after slice 1 learner check): The original card-list layout was replaced with inline flowing prose. Sentences are now `<span>` elements inside a `<p>`, preserving natural paragraph reading flow. Hover highlights the hovered sentence; the active sentence glows in accent color; past sentences dim. Behavior (click-to-seek, active tracking, scroll-into-view) is unchanged. No scope, PRD, or spec change needed — this is a pure visual refinement within the existing component boundary.
