---
doc: prd
status: approved
---

# Local Voice Reader — Product Requirements

A privacy-first browser extension that reads selected web text aloud with a natural local voice, sentence by sentence, with the current sentence highlighted on the page. Built for people who want to listen to long text (like Reddit posts) instead of staring at a screen, without sending their text to any server.
Source: `scope.md > The Unique Kernel`, `scope.md > Who It's For`. "Local Voice Reader" is a working title taken from the scope; the final name is an open question.

## The Core Journey
1. The user is reading a webpage and selects a block of text.
2. They right-click and choose **Read Aloud** from the browser menu.
3. The side panel opens. If the voice hasn't been downloaded yet, the top of the side panel shows **"Downloading the voice ...."**
4. While the first sentences are being prepared, the play button shows a buffering state and a toast shows **"Playing"**.
5. The voice starts. The play button changes to the pause button, and the current sentence is highlighted on the page.
6. As each sentence finishes, the highlight moves to the next sentence and the next audio plays without a gap.
7. At any time the user can pause/resume, change the speed, or change the voice from the side panel.
8. When the last sentence finishes, the voice stops.
9. If the user selects different text and chooses **Read Aloud** during playback, the new text replaces the old reading.

Success: the user hears natural-sounding speech for the text they selected, sees the spoken sentence highlighted on the page, and nothing leaves their machine.
Source: `scope.md > The Core Loop`, `scope.md > What "Working" Looks Like`.

## Screens and Layout
There are two surfaces, and no other screens.

**1. The browser right-click menu**
- A single **Read Aloud** item, shown when text is selected.

**2. The side panel** (laid out like a music player)
- **Top:** the selected text that is being read (where a music player would show the song title).
- **Bottom controls:** a single row of three round buttons:
  - **Left:** Speed button.
  - **Middle:** Play/Pause button, slightly bigger than the other two.
  - **Right:** Voice button.
- **Speed popup:** opens just above the Speed button. It holds a draggable slider from **0.25x to 2x**.
- **Voice popup:** opens just above the Voice button, in the same popup style. It shows a list of voices; the user taps one to select it. For the POC the list holds a single voice.
- **Status area (top of the panel):** shows messages such as "Downloading the voice ...." and error messages.
- **Toast:** a short "Playing" message when playback begins.

The page itself is the third visible surface: the sentence currently being spoken is highlighted there.

Source: `scope.md > The POC Boundary`.

## Look and Feel
- **Style:** a music-player feel — simple, centered, round buttons.
- **Themes:** a **light theme** (white and navy blue) and a **dark theme**.
- **Colors and fonts are never hardcoded.** All styling uses named theme roles (for example `bg-primary`, `bg-onPrimary`) so the light and dark themes can swap values cleanly.
- **Font:** a common, widely available font. The learner has no specific font preference.
- **Not established:** exact dark-theme colors, highlight color on the page, and which theme shows by default. (See Open Questions.)

Source: `scope.md > Inspiration & Identity`.

## Features and Behavior

### Triggering a reading
- The user selects text on a page, right-clicks, and chooses **Read Aloud**.
- Reading works on selected text only in this POC.
- If a reading is already in progress, the new selection replaces it: the old reading stops and the new one starts.
  - [ ] With text selected, the right-click menu shows **Read Aloud**.
  - [ ] Choosing it opens the side panel and starts the reading flow.
  - [ ] Choosing it again on different text mid-reading stops the old reading and starts the new one.

### Sentence-by-sentence reading and highlighting
- The text is split into sentences and read one or two sentences at a time. Audio for roughly the next 4–5 sentences is prepared ahead of time so playback stays smooth.
- The sentence being spoken is highlighted on the page, and the highlight moves with the voice.
  - [ ] At any moment the sentence being heard is the one highlighted on the page.
  - [ ] When a sentence ends, the highlight moves to the next sentence with no noticeable gap in audio.
  - [ ] When the reading ends, the highlight is cleared.

Source: `scope.md > The Unique Kernel`.

### Play/Pause
- The middle button toggles between buffering, playing (showing pause), and paused (showing play).
  - [ ] While audio is being prepared, the button shows a buffering state.
  - [ ] While audio plays, the button shows the pause icon; pressing it pauses the voice.
  - [ ] While paused, the button shows the play icon; pressing it resumes from where it paused.

### Speed
- The Speed button opens a popup directly above it with a draggable slider from 0.25x to 2x.
  - [ ] Clicking Speed opens the slider popup above the button.
  - [ ] Dragging the slider to 0.25x makes the voice audibly slower; dragging to 2x makes it audibly faster.

### Voice
- The Voice button opens a popup listing available voices; selecting one switches the voice.
- The POC ships with one voice, but the list popup works so more voices can be added later.
  - [ ] Clicking Voice opens a list popup above the button.
  - [ ] The single available voice is shown and selected.

### Theme
- The side panel supports a light theme (white and navy) and a dark theme, using named color roles.
  - [ ] Switching between light and dark changes the side panel's appearance without any hardcoded colors.

## States and Boundaries
- **First use (voice not yet downloaded)** — the top of the side panel shows "Downloading the voice ...." while the model downloads. Playback begins after the download.
- **Later uses (voice already downloaded)** — no download message; the user sees only the brief buffering state and the "Playing" toast.
- **Buffering** — the play button shows a buffering state until the first audio is ready, then the "Playing" toast appears.
- **Network error during download** — the side panel shows: "You seem to be offline, check connection".
- **Voice error (voice not found or other failure)** — the side panel shows: "Encounter some error, while fetching voice".
- **End of text** — the voice stops after the last sentence and the highlight clears.
- **New selection during playback** — the new text replaces the current reading.
- **Privacy** — the text is never sent to a server. The only network use is the one-time voice download.
- **Persistence** — the downloaded voice is kept so it isn't downloaded again. Nothing else is stored.

## Product Decisions
- Use a **local AI voice** rather than the built-in browser voices — the built-in voices weren't reliably available across the learner's browsers/systems, and the learner wants a natural-sounding voice that works for non-technical users.
- **Read sentence by sentence** with a few sentences prepared ahead — it keeps audio and highlighting in sync without complex timing.
- **Right-click "Read Aloud" on selected text** is the only trigger — chosen over reader mode to keep the POC small.
- **Side panel looks like a music player** — a three-button row with a bigger play/pause in the middle.
- **Skip, rewind, and forward are removed for this session** — the learner chose to leave them out of the POC.
- **Speed and Voice use popups above their buttons** — speed is a 0.25x–2x slider; voice is a list.
- **A light theme (white and navy) and a dark theme, with no hardcoded colors or fonts** — everything references named roles like `bg-primary`.
- **A common font** — the learner doesn't have a specific font preference.
- **Specific error messages** — one for offline, one for any other voice error.
- **When reading ends, the voice stops. A new selection replaces the old reading** — the simplest predictable behavior.
- **English only** for this first version.

## What We're Building
- Right-click **Read Aloud** on selected text.
- A side panel that opens with a music-player layout.
- A local AI voice that downloads on the first use and is cached.
- Sentence-by-sentence reading with a few sentences prepared ahead.
- On-page highlighting of the sentence being spoken.
- Play/Pause, Speed popup (0.25x–2x), and Voice popup (one voice).
- Light and dark themes using named color roles.
- "Downloading the voice ....", "Playing", and the two error messages.
- A new selection replacing the current reading; stopping at the end of the text.

## Deferred From the POC
- **Skip / rewind / forward buttons** — set aside for this session by the learner.
- **A separate Stop button** — pause plus the end-of-text behavior covers the POC.
- **More voices in the list** — the popup is built for it, but only one voice ships.
- **Reader mode (full-page reading)** — needs content parsing to skip menus and ads.

## Possible Later Enhancements
- Skip, rewind, and forward by sentence.
- Additional voices, including importing open-source voice files.
- Word-by-word highlighting.
- Other languages.

## Non-Goals
- No cloud text-to-speech — it would break the privacy promise.
- No account, sync, or analytics — nothing leaves the user's machine.
- No bundling the voice inside the extension — it is too large; it downloads on first use.

## Open Questions
- Final product name (working title: "Local Voice Reader"). Can wait until the build.
- Highlight color on the page, and exact dark-theme colors. Can wait; the build can use the theme's named roles.
- Which theme shows by default. Can wait.
- Assumption (not a learner decision): the "Read Aloud" menu item only appears when text is selected.
- Assumption (not a learner decision): the "Downloading the voice ...." message appears only the first time, since the voice is cached afterward.
- Assumption (not a learner decision): closing the side panel stops the reading.
