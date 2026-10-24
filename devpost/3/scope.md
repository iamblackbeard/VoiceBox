---
doc: scope
status: approved
---

# Voice Box — UX Polish & Interactive Companion (Milestone 3)

A privacy-first local text-to-speech extension fine-tuned with interactive sentence scrubbing, tab-aware controls, collapsible mini-player, volume management, and persistent light/dark themes.

## The Unique Kernel
Transforming the side panel from a passive audio readout into an interactive, synchronized reading companion: clickable sentence-level scrubbing that updates both side panel and webpage highlights in real time, tab-origin awareness with instant tab switching, a collapsible mini-player mode, volume control, and zero-latency replay powered by in-memory audio chunk caching.

## Who It's For
Screen-fatigued, privacy-conscious readers who switch across multiple tabs while reading long articles, want to scrub back and forth through sentences without losing their place, and need comfortable day/night themes that don't strain the eyes.

## The Core Loop
1. The user selects text on any webpage, right-clicks, and chooses **Read Aloud**.
2. The side panel opens, styled in the user's saved Light or Dark theme (with a sun/moon toggle at top-right).
3. The top header shows which tab is playing; clicking it immediately brings that tab into focus if the user switched away.
4. Each sentence is displayed in the side panel, highlighting in lockstep with spoken audio and the on-page highlight.
5. The user can click any sentence in the side panel to jump playback and page highlighting to that sentence immediately.
6. The user can open a volume slider popup from the bottom-right to adjust loudness, or collapse the panel into a compact mini-player to reclaim screen space while playback continues.
7. When speech finishes, the play button transforms into a **Replay** button, instantly restarting playback from the in-memory audio cache with zero regeneration delay.

## Inspiration & Identity
Minimal, responsive, native-feeling browser utility with Spotify-like agility (mini-player toggle, volume popover, clickable sentence scrub, instant replay). Strictly utilizes semantic design tokens (`bg-primary`, `bg-secondary`, `bg-surface`, `text-on-primary`, `accent`) across both Light and Dark modes with single-source-of-truth storage.

## Why This Matters to the Learner
Elevates the extension from a working prototype into an everyday daily driver that is comfortable on the eyes at any hour, effortless to navigate across multi-tab workflows, and responsive when re-reading or jumping to specific sentences.

## What "Working" Looks Like
A 1-to-2-minute screen recording demonstrating:
1. Toggling between Light and Dark mode in both the toolbar popup and side panel, with the preference persisting across sessions.
2. Starting a reading from a tab, switching to another tab, and clicking the side panel tab header to jump focus back to the reading tab.
3. Spoken sentences highlighting in sync in the side panel; clicking an earlier or later sentence immediately seeks playback and moves the on-page highlight.
4. Clicking the volume icon at the bottom right to adjust audio level via the popup slider.
5. Clicking the collapse button to tuck the sentence reader into a mini-player bar with continuous audio playback, then expanding it back.
6. Playback reaching the end, the button switching to Replay, and clicking Replay to replay the full passage instantly from cache.

## The POC Boundary
- **Light & Dark Theme**: Toggle in top-right of both popup and side panel, persisted in `browser.storage.local`, adhering strictly to semantic CSS tokens.
- **Originating Tab Indicator**: Shows playing tab title in side panel header; clicking focuses that tab via `browser.tabs.update`.
- **Interactive Sentence Reader**: Sentence list in side panel with synchronized active highlighting and click-to-seek playback.
- **Collapsible Mini-Player**: Toggle in side panel that hides the sentence list into a compact bar while audio continues.
- **Volume Control Popup**: Dedicated volume icon button opening a popup slider at the bottom right of player controls.
- **Replay & Audio Caching**: Replay button state when playback ends; in-memory audio chunk caching for instant replay and scrubbing, invalidated on new selection, side panel close after playback ends, or 10-minute timeout.

## Later
- System media keys integration (hardware Play/Pause and Next/Previous sentence).
- Offscreen document audio playback to keep audio playing even if the native browser side panel window is closed.
- Visual audio waveform scrubber.

## Explicitly Cut
- Persistent on-disk audio caching (IndexedDB/OPFS) across sessions (cut to avoid disk bloat and uphold strict zero-trace privacy).
- Multi-tab simultaneous playback / queueing (cut to keep audio state predictable and single-stream).
