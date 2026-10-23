export type VoiceGender = 'Female' | 'Male';
export type VoiceAccent = 'American' | 'British';

export interface Voice {
  id: string;
  name: string;
  engine: 'kokoro' | 'piper';
  gender: VoiceGender;
  accent: VoiceAccent;
  style: string;
  previewUrl: string;
}

export const DEFAULT_KOKORO_VOICE = 'af_heart';
export const DEFAULT_PIPER_VOICE = 'en_US-hfc_female-medium';
export const DEFAULT_VOICE = DEFAULT_KOKORO_VOICE;

export const KOKORO_VOICES: Voice[] = [
  {
    id: 'af_heart',
    name: 'Heart',
    engine: 'kokoro',
    gender: 'Female',
    accent: 'American',
    style: 'Warm, expressive, balanced',
    previewUrl: '/voice_sample/kokoro/af_heart.mp3',
  },
  {
    id: 'af_bella',
    name: 'Bella',
    engine: 'kokoro',
    gender: 'Female',
    accent: 'American',
    style: 'Bright, energetic, crisp',
    previewUrl: '/voice_sample/kokoro/af_bella.mp3',
  },
  {
    id: 'af_nicole',
    name: 'Nicole',
    engine: 'kokoro',
    gender: 'Female',
    accent: 'American',
    style: 'Calm, soothing, articulate',
    previewUrl: '/voice_sample/kokoro/af_nicole.mp3',
  },
  {
    id: 'af_sarah',
    name: 'Sarah',
    engine: 'kokoro',
    gender: 'Female',
    accent: 'American',
    style: 'Professional, clear narrator',
    previewUrl: '/voice_sample/kokoro/af_sarah.mp3',
  },
  {
    id: 'af_sky',
    name: 'Sky',
    engine: 'kokoro',
    gender: 'Female',
    accent: 'American',
    style: 'Casual, friendly, smooth',
    previewUrl: '/voice_sample/kokoro/af_sky.mp3',
  },
  {
    id: 'bf_emma',
    name: 'Emma',
    engine: 'kokoro',
    gender: 'Female',
    accent: 'British',
    style: 'Formal, crisp, BBC narrator',
    previewUrl: '/voice_sample/kokoro/bf_emma.mp3',
  },
  {
    id: 'am_adam',
    name: 'Adam',
    engine: 'kokoro',
    gender: 'Male',
    accent: 'American',
    style: 'Deep, resonant, steady',
    previewUrl: '/voice_sample/kokoro/am_adam.mp3',
  },
  {
    id: 'am_michael',
    name: 'Michael',
    engine: 'kokoro',
    gender: 'Male',
    accent: 'American',
    style: 'Conversational, modern',
    previewUrl: '/voice_sample/kokoro/am_michael.mp3',
  },
  {
    id: 'am_fenrir',
    name: 'Fenrir',
    engine: 'kokoro',
    gender: 'Male',
    accent: 'American',
    style: 'Rich, authoritative',
    previewUrl: '/voice_sample/kokoro/am_fenrir.mp3',
  },
  {
    id: 'bm_george',
    name: 'George (UK)',
    engine: 'kokoro',
    gender: 'Male',
    accent: 'British',
    style: 'Refined, articulate, deep',
    previewUrl: '/voice_sample/kokoro/bm_george.mp3',
  },
  {
    id: 'bm_lewis',
    name: 'Lewis',
    engine: 'kokoro',
    gender: 'Male',
    accent: 'British',
    style: 'Warm, storytelling narrator',
    previewUrl: '/voice_sample/kokoro/bm_lewis.mp3',
  },
  {
    id: 'bm_daniel',
    name: 'Daniel',
    engine: 'kokoro',
    gender: 'Male',
    accent: 'British',
    style: 'Formal, documentary style',
    previewUrl: '/voice_sample/kokoro/bm_daniel.mp3',
  },
];

export const PIPER_VOICES: Voice[] = [
  {
    id: 'en_US-hfc_female-medium',
    name: 'HFC Female',
    engine: 'piper',
    gender: 'Female',
    accent: 'American',
    style: 'Natural, friendly, versatile',
    previewUrl: '/voice_sample/piper/en_US-hfc_female-medium.mp3',
  },
  {
    id: 'en_US-lessac-medium',
    name: 'Lessac',
    engine: 'piper',
    gender: 'Male',
    accent: 'American',
    style: 'Clear, audiobook style',
    previewUrl: '/voice_sample/piper/en_US-lessac-medium.mp3',
  },
  {
    id: 'en_US-amy-medium',
    name: 'Amy',
    engine: 'piper',
    gender: 'Female',
    accent: 'American',
    style: 'Expressive, upbeat, distinct',
    previewUrl: '/voice_sample/piper/en_US-amy-medium.mp3',
  },
  {
    id: 'en_US-ryan-medium',
    name: 'Ryan',
    engine: 'piper',
    gender: 'Male',
    accent: 'American',
    style: 'Dynamic, clear podcast tone',
    previewUrl: '/voice_sample/piper/en_US-ryan-medium.mp3',
  },
  {
    id: 'en_US-danny-low',
    name: 'Danny',
    engine: 'piper',
    gender: 'Male',
    accent: 'American',
    style: 'Casual, conversational',
    previewUrl: '/voice_sample/piper/en_US-danny-low.mp3',
  },
  {
    id: 'en_US-joe-medium',
    name: 'Joe',
    engine: 'piper',
    gender: 'Male',
    accent: 'American',
    style: 'Deep, relaxed baritone',
    previewUrl: '/voice_sample/piper/en_US-joe-medium.mp3',
  },
  {
    id: 'en_US-kristin-medium',
    name: 'Kristin',
    engine: 'piper',
    gender: 'Female',
    accent: 'American',
    style: 'Melodic, gentle narrator',
    previewUrl: '/voice_sample/piper/en_US-kristin-medium.mp3',
  },
  {
    id: 'en_US-kathleen-low',
    name: 'Kathleen',
    engine: 'piper',
    gender: 'Female',
    accent: 'American',
    style: 'Smooth, quiet, focused',
    previewUrl: '/voice_sample/piper/en_US-kathleen-low.mp3',
  },
  {
    id: 'en_GB-alba-medium',
    name: 'Alba',
    engine: 'piper',
    gender: 'Female',
    accent: 'British',
    style: 'Contemporary, pleasant',
    previewUrl: '/voice_sample/piper/en_GB-alba-medium.mp3',
  },
  {
    id: 'en_GB-alan-medium',
    name: 'Alan',
    engine: 'piper',
    gender: 'Male',
    accent: 'British',
    style: 'Articulate, precise, radio',
    previewUrl: '/voice_sample/piper/en_GB-alan-medium.mp3',
  },
  {
    id: 'en_GB-southern_english_female-low',
    name: 'Charlotte',
    engine: 'piper',
    gender: 'Female',
    accent: 'British',
    style: 'Traditional RP, clear',
    previewUrl: '/voice_sample/piper/en_GB-southern_english_female-low.mp3',
  },
  {
    id: 'en_GB-semaine-medium',
    name: 'Semaine',
    engine: 'piper',
    gender: 'Female',
    accent: 'British',
    style: 'Playful, expressive',
    previewUrl: '/voice_sample/piper/en_GB-semaine-medium.mp3',
  },
];

export const VOICES: Voice[] = [...KOKORO_VOICES, ...PIPER_VOICES];

export function getDefaultVoiceForEngine(engine: 'kokoro' | 'piper'): string {
  return engine === 'piper' ? DEFAULT_PIPER_VOICE : DEFAULT_KOKORO_VOICE;
}

export function getVoicesForEngine(engine: 'kokoro' | 'piper'): Voice[] {
  return engine === 'piper' ? PIPER_VOICES : KOKORO_VOICES;
}

export function getVoiceById(id: string): Voice | undefined {
  return VOICES.find((v) => v.id === id);
}

export interface PopupVoiceList {
  favorites: Voice[];
  unpinned?: Voice;
  totalCount: number;
}

/**
 * Formats the list of voices to display in the side panel Voice popup.
 * Enforces the "5 Favorites + 1 Active Voice if unpinned" rule:
 * - If the active voice is in the favorites list (up to 5), only the favorites are returned.
 * - If the active voice is NOT in favorites, returns the 5 favorites plus the unpinned active voice.
 * - When any favorite is selected as active, the unpinned voice is automatically dismissed.
 */
export function formatPopupVoiceList(
  engine: 'kokoro' | 'piper',
  activeVoiceId: string,
  favoriteIds: string[],
): PopupVoiceList {
  const safeFavorites = (favoriteIds || [])
    .map((id) => getVoiceById(id))
    .filter((v): v is Voice => v !== undefined && v.engine === engine)
    .slice(0, 5);

  const isActiveInFavorites = safeFavorites.some((v) => v.id === activeVoiceId);
  const activeVoice = getVoiceById(activeVoiceId);
  const unpinned =
    !isActiveInFavorites && activeVoice && activeVoice.engine === engine
      ? activeVoice
      : undefined;

  return {
    favorites: safeFavorites,
    unpinned,
    totalCount: safeFavorites.length + (unpinned ? 1 : 0),
  };
}
