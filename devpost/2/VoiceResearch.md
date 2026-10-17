# Voice Picker Feature Specification & Architecture Plan

## 1. Overview & Objective

The **Voice Picker** feature allows users to customize their listening experience with high-quality voices across both supported TTS engines (**Kokoro** and **Piper**). 

The experience consists of three interconnected components:
1. **Quick Switcher (Side Panel)**: A compact popup above the Voice button displaying up to 5 favorite voices (plus the currently active voice if not favorited) for instant 1-click switching during reading.
2. **Settings Entry Point (Toolbar Popup)**: A dedicated row displaying the active voice with a direct link to explore the full catalog.
3. **Full Voice Catalog (Dedicated Tab)**: A standalone extension page (`voices.html`) displaying 12 curated voices per engine with audio sample playback, favorite management (up to 5 per engine), and instant voice selection.

---

## 2. User Journey & Core Interactions

```
Toolbar Popup (entrypoints/popup/)
  ├── Engine Selector (Kokoro / Piper)
  └── Voice Row: "Voice: Heart ›" ──[Click]──> Opens Voice Catalog Tab
                                                         │
Voice Catalog Tab (entrypoints/voices/index.html)        │
  ├── Tabs: [ Kokoro (12) ]  [ Piper (12) ]              │
  ├── Voice Cards:                                       │
  │     ├── ♡ / ♥ Favorite Toggle (Max 5 per engine)     │
  │     ├── ▶ Audio Preview (Instant sample playback)    │
  │     └── "Use as Active Voice" Action                 │
  └── Toast / Warning Alerts:                            │
        ├── Non-favorite selected: "Set as active! Add   │
        │   to favorites to see in side panel."          │
        └── 6th favorite attempted: "Max 5 favorites     │
            reached. Remove one to add this voice."      │
                                                         │
Side Panel Player (entrypoints/sidepanel/)               │
  └── Voice Button ──[Click]──> Voice Popup               │
        └── Shows [5 Favorites] + [Active (if unpinned)]◄┘
              • 1-click switch updates active voice
              • Selecting any favorite removes temporary
                non-favorite voice from the popup list
```

---

## 3. Component Specifications

### 3.1. Toolbar Settings Entry Point (`entrypoints/popup/`)
- Located directly below the speech engine selector radios in `entrypoints/popup/App.tsx`.
- Displays:
  - Left: Label `Voice` and active engine badge (e.g., `Neural` or `Fast WASM`).
  - Right: Currently active voice name (e.g., `Heart ›` or `HFC Female ›`).
- Clicking the row calls `browser.tabs.create({ url: browser.runtime.getURL('/voices.html') })` to open the catalog in a new browser tab.

### 3.2. Dedicated Voice Catalog Page (`entrypoints/voices/`)
- Extension HTML page registered with WXT (`entrypoints/voices/index.html`).
- **Header**: Clean extension branding, summary, and current active engine indicator.
- **Engine Tab Switcher**:
  - `Kokoro (Neural / WebGPU)` (12 curated voices)
  - `Piper (Fast / CPU)` (12 curated voices)
  - Displays favorite count pill per tab (e.g., `3/5 Favorites`).
- **Voice Card Layout**:
  - **Favorite Button (Heart icon)**:
    - Empty heart ♡: Not favorited. Clicking adds to favorites (up to 5 max).
    - Filled heart ♥: Favorited. Clicking unfavorites.
    - If user attempts to favorite a 6th voice: Trigger warning toast/modal: *"You can only have up to 5 favorite voices in the quick popup. Unfavorite a voice first."*
  - **Voice Info**: Display name, accent/locale (e.g., `US English`, `UK English`), gender, and voice quality/style tag.
  - **Audio Sample Preview Player**:
    - Round ▶ / ⏸ button.
    - Plays a 2–3 second high-fidelity speech sample.
    - Only one sample can play at a time (stopping any previous sample).
  - **Active State / Selection**:
    - Shows an "Active" badge if this voice is currently selected for the engine.
    - If inactive, provides a "Select Voice" button.
    - **Non-Favorite Selection & Toast Interaction Flow**:
      1. When a user selects a voice to be used by the player that is **not** currently in their favorites:
         - The voice is immediately set as the active voice.
         - A toast notification appears with an action:
           - Text: *"This voice will be used for reading. Don't forget to add it to your favorites!"*
           - Action button: `[Add to Favorites]`
      2. If the user clicks `[Add to Favorites]` from the toast:
         - **If favorites < 5**: The voice is added to favorites successfully, and the heart icon updates to filled ♥.
         - **If favorites == 5**: An error popup/modal is displayed immediately: *"You can only have up to 5 voices in the popup. Please remove a voice from your favorites first."*
      3. If the user does not add it to favorites (or leaves it as-is):
         - The voice remains the active voice.
         - In the side panel, the voice popup dynamically displays `[Favorite list (5) + Current active voice (1)]` (6 voices total).
         - If the user later selects a different voice from the side panel (especially one of their 5 favorites), that voice becomes active and the non-favorite voice is immediately dismissed from the side panel popup list.

### 3.3. Side Panel Voice Popup (`entrypoints/sidepanel/`)
- Anchored to the round Voice button in `PlayerControls.tsx` (mirroring `SpeedPopup.tsx` behavior).
- Filters voices strictly for the currently active engine.
- **The "5 Favorites + 1 Active" Dynamic List Rule**:
  1. Default list renders the user's saved favorites (up to 5 items).
  2. If the user's currently active voice is **not** in the favorite list (e.g. selected from the Voices tab), the popup renders `[5 Favorites] + [Current Active Voice]` (6 items total).
  3. The active voice has an active checkmark / pill highlight.
  4. Non-favorite voice has a subtle unpinned indicator or divider.
  5. If the user selects any voice from the favorite list, that voice becomes active, and the temporary non-favorite voice is immediately dismissed from the popup list (cleanly restoring the popup back to 5 favorites).
- A footer link at the bottom of the popup: *"Manage all voices in catalog ›"* opens `voices.html`.

---

## 4. Voice Catalog (12 per Engine)

### 4.1. Kokoro Curated Voices (12 Total)
Balanced 6 Female / 6 Male selection covering American and British accents:
| Voice ID | Display Name | Gender | Accent | Character / Style |
| :--- | :--- | :--- | :--- | :--- |
| `af_heart` *(Default)* | Heart | Female | American | Warm, expressive, balanced |
| `af_bella` | Bella | Female | American | Bright, energetic, crisp |
| `af_nicole` | Nicole | Female | American | Calm, soothing, articulate |
| `af_sarah` | Sarah | Female | American | Professional, clear narrator |
| `af_sky` | Sky | Female | American | Casual, friendly, smooth |
| `bf_emma` | Emma | Female | British | Formal, crisp, BBC narrator |
| `am_adam` | Adam | Male | American | Deep, resonant, steady |
| `am_michael` | Michael | Male | American | Conversational, modern |
| `am_george` | George | Male | American | Rich, authoritative |
| `bm_george` | George (UK) | Male | British | Refined, articulate, deep |
| `bm_lewis` | Lewis | Male | British | Warm, storytelling narrator |
| `bm_daniel` | Daniel | Male | British | Formal, documentary style |

### 4.2. Piper Curated Voices (12 Total)
Diverse, high-quality, medium-weight Piper ONNX models:
| Voice ID | Display Name | Gender | Accent | Character / Style |
| :--- | :--- | :--- | :--- | :--- |
| `en_US-hfc_female-medium` *(Default)* | HFC Female | Female | American | Natural, friendly, versatile |
| `en_US-lessac-medium` | Lessac | Male | American | Clear, audiobook style |
| `en_US-amy-medium` | Amy | Female | American | Expressive, upbeat, distinct |
| `en_US-ryan-medium` | Ryan | Male | American | Dynamic, clear podcast tone |
| `en_US-danny-low` | Danny | Male | American | Casual, conversational |
| `en_US-joe-medium` | Joe | Male | American | Deep, relaxed baritone |
| `en_US-kristin-medium` | Kristin | Female | American | Melodic, gentle narrator |
| `en_US-kathleen-low` | Kathleen | Female | American | Smooth, quiet, focused |
| `en_GB-alba-medium` | Alba | Female | British | Contemporary, pleasant |
| `en_GB-alan-medium` | Alan | Male | British | Articulate, precise, radio |
| `en_GB-southern_english_female-low` | Charlotte | Female | British | Traditional RP, clear |
| `en_GB-sweetpea-medium` | Sweetpea | Female | British | Playful, expressive |

---

## 5. Sample Audio Strategy

1. **Primary Playback (Public URLs)**:
   - Piper voice preview `.wav` clips are fetched from the official public `rhasspy/piper-voices` repository on Hugging Face / GitHub raw storage.
   - Kokoro voice preview clips are fetched from verified public Hugging Face model sample endpoints.
   - Direct audio streaming via HTML5 `<audio>` element with zero local package overhead.
2. **Fallback & Reliability**:
   - Audio URLs are defined in `lib/voices.ts`.
   - If an audio clip fails to load (offline or network blockage), a friendly fallback icon/message appears ("Sample unavailable offline").
   - Cached in browser memory after first play during the session.

---

## 6. Data Model & Storage Schema

Extend `lib/settings.ts` and `lib/voices.ts`:

```typescript
export interface VoicePreferences {
  activeVoice: {
    kokoro: string; // e.g. 'af_heart'
    piper: string;  // e.g. 'en_US-hfc_female-medium'
  };
  favorites: {
    kokoro: string[]; // Max 5 voice IDs, defaults to ['af_heart']
    piper: string[];  // Max 5 voice IDs, defaults to ['en_US-hfc_female-medium']
  };
}

export interface StoredSettings extends EngineSettings {
  voicePreferences: VoicePreferences;
}
```

### Initial State Defaults:
- `activeVoice.kokoro = 'af_heart'`
- `activeVoice.piper = 'en_US-hfc_female-medium'`
- `favorites.kokoro = ['af_heart']` (Default voice automatically included)
- `favorites.piper = ['en_US-hfc_female-medium']` (Default voice automatically included)

---

## 7. Model Download & Memory Management

- **Zero-Download Catalog Browsing**: Browsing the catalog and listening to samples downloads **no ONNX models**. Previews are lightweight pre-rendered audio files.
- **Lazy Model Loading**: When the user starts reading in the side panel or reader:
  - If the active engine/voice model is not in cache, the worker downloads it on-demand with progress tracking in the UI.
  - If the user changes active voice to a different voice on the same engine:
    - In Kokoro: Model weights are shared; switching voice ID only changes the voice embedding tensor (`generate(text, { voice: newVoiceId })`), which is instant and requires no re-download!
    - In Piper: Changing voice triggers loading the specific `.onnx` and `.onnx.json` model for that voice, reusing the WASM runtime.

---

## 8. Implementation Steps & Verification

1. **Step 1: Voice Catalog & Data Layer (`lib/voices.ts`, `lib/settings.ts`)**
   - Define catalog interfaces, 12 Kokoro voices, 12 Piper voices, sample URLs, and metadata.
   - Update settings storage to persist `voicePreferences` with backwards-compatibility migration.
   - Add unit tests for favorite limiting, defaults, and voice retrieval helpers.

2. **Step 2: Settings Entry Point (`entrypoints/popup/App.tsx`)**
   - Add the Voice row linking to `voices.html`.
   - Display active voice name and reactive updates when changed.

3. **Step 3: Dedicated Voice Catalog Tab (`entrypoints/voices/`)**
   - Build React view with tabs, voice cards, favorite heart toggles, sample audio player, and active indicators.
   - Implement the 5-favorite max limit alert and the non-favorite selection toast.

4. **Step 4: Side Panel Voice Popup (`entrypoints/sidepanel/`)**
   - Implement `VoicePopup.tsx` matching `SpeedPopup.tsx` styling.
   - Implement the `[5 Favorites] + [1 Active if unpinned]` rule.
   - Wire selection directly to `player.ts` / `settings.ts`.
   - Un-disable the Voice button in `PlayerControls.tsx`.

5. **Step 5: Testing & Verification**
   - Test audio preview playback.
   - Test adding/removing favorites up to 5 items and verify error messages on 6th attempt.
   - Test side panel dynamic 5 + 1 rendering when selecting an unpinned voice.
   - Test TTS synthesis with switched voices in both Kokoro and Piper.
