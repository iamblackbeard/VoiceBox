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
    previewUrl: 'https://huggingface.co/hexgrad/Kokoro-82M/resolve/main/samples/af_heart_0.wav',
  },
  {
    id: 'af_bella',
    name: 'Bella',
    engine: 'kokoro',
    gender: 'Female',
    accent: 'American',
    style: 'Bright, energetic, crisp',
    previewUrl: 'https://huggingface.co/hexgrad/Kokoro-82M/resolve/main/samples/HEARME.wav',
  },
  {
    id: 'af_nicole',
    name: 'Nicole',
    engine: 'kokoro',
    gender: 'Female',
    accent: 'American',
    style: 'Calm, soothing, articulate',
    previewUrl: 'https://huggingface.co/hexgrad/Kokoro-82M/resolve/main/samples/HEARME.wav',
  },
  {
    id: 'af_sarah',
    name: 'Sarah',
    engine: 'kokoro',
    gender: 'Female',
    accent: 'American',
    style: 'Professional, clear narrator',
    previewUrl: 'https://huggingface.co/hexgrad/Kokoro-82M/resolve/main/samples/HEARME.wav',
  },
  {
    id: 'af_sky',
    name: 'Sky',
    engine: 'kokoro',
    gender: 'Female',
    accent: 'American',
    style: 'Casual, friendly, smooth',
    previewUrl: 'https://huggingface.co/hexgrad/Kokoro-82M/resolve/main/samples/HEARME.wav',
  },
  {
    id: 'bf_emma',
    name: 'Emma',
    engine: 'kokoro',
    gender: 'Female',
    accent: 'British',
    style: 'Formal, crisp, BBC narrator',
    previewUrl: 'https://huggingface.co/hexgrad/Kokoro-82M/resolve/main/samples/HEARME.wav',
  },
  {
    id: 'am_adam',
    name: 'Adam',
    engine: 'kokoro',
    gender: 'Male',
    accent: 'American',
    style: 'Deep, resonant, steady',
    previewUrl: 'https://huggingface.co/hexgrad/Kokoro-82M/resolve/main/samples/HEARME.wav',
  },
  {
    id: 'am_michael',
    name: 'Michael',
    engine: 'kokoro',
    gender: 'Male',
    accent: 'American',
    style: 'Conversational, modern',
    previewUrl: 'https://huggingface.co/hexgrad/Kokoro-82M/resolve/main/samples/HEARME.wav',
  },
  {
    id: 'am_george',
    name: 'George',
    engine: 'kokoro',
    gender: 'Male',
    accent: 'American',
    style: 'Rich, authoritative',
    previewUrl: 'https://huggingface.co/hexgrad/Kokoro-82M/resolve/main/samples/HEARME.wav',
  },
  {
    id: 'bm_george',
    name: 'George (UK)',
    engine: 'kokoro',
    gender: 'Male',
    accent: 'British',
    style: 'Refined, articulate, deep',
    previewUrl: 'https://huggingface.co/hexgrad/Kokoro-82M/resolve/main/samples/HEARME.wav',
  },
  {
    id: 'bm_lewis',
    name: 'Lewis',
    engine: 'kokoro',
    gender: 'Male',
    accent: 'British',
    style: 'Warm, storytelling narrator',
    previewUrl: 'https://huggingface.co/hexgrad/Kokoro-82M/resolve/main/samples/HEARME.wav',
  },
  {
    id: 'bm_daniel',
    name: 'Daniel',
    engine: 'kokoro',
    gender: 'Male',
    accent: 'British',
    style: 'Formal, documentary style',
    previewUrl: 'https://huggingface.co/hexgrad/Kokoro-82M/resolve/main/samples/HEARME.wav',
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
    previewUrl:
      'https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/hfc_female/medium/samples/speaker_0.mp3',
  },
  {
    id: 'en_US-lessac-medium',
    name: 'Lessac',
    engine: 'piper',
    gender: 'Male',
    accent: 'American',
    style: 'Clear, audiobook style',
    previewUrl:
      'https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium/samples/speaker_0.mp3',
  },
  {
    id: 'en_US-amy-medium',
    name: 'Amy',
    engine: 'piper',
    gender: 'Female',
    accent: 'American',
    style: 'Expressive, upbeat, distinct',
    previewUrl:
      'https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/amy/medium/samples/speaker_0.mp3',
  },
  {
    id: 'en_US-ryan-medium',
    name: 'Ryan',
    engine: 'piper',
    gender: 'Male',
    accent: 'American',
    style: 'Dynamic, clear podcast tone',
    previewUrl:
      'https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/ryan/medium/samples/speaker_0.mp3',
  },
  {
    id: 'en_US-danny-low',
    name: 'Danny',
    engine: 'piper',
    gender: 'Male',
    accent: 'American',
    style: 'Casual, conversational',
    previewUrl:
      'https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/danny/low/samples/speaker_0.mp3',
  },
  {
    id: 'en_US-joe-medium',
    name: 'Joe',
    engine: 'piper',
    gender: 'Male',
    accent: 'American',
    style: 'Deep, relaxed baritone',
    previewUrl:
      'https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/joe/medium/samples/speaker_0.mp3',
  },
  {
    id: 'en_US-kristin-medium',
    name: 'Kristin',
    engine: 'piper',
    gender: 'Female',
    accent: 'American',
    style: 'Melodic, gentle narrator',
    previewUrl:
      'https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/kristin/medium/samples/speaker_0.mp3',
  },
  {
    id: 'en_US-kathleen-low',
    name: 'Kathleen',
    engine: 'piper',
    gender: 'Female',
    accent: 'American',
    style: 'Smooth, quiet, focused',
    previewUrl:
      'https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/kathleen/low/samples/speaker_0.mp3',
  },
  {
    id: 'en_GB-alba-medium',
    name: 'Alba',
    engine: 'piper',
    gender: 'Female',
    accent: 'British',
    style: 'Contemporary, pleasant',
    previewUrl:
      'https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_GB/alba/medium/samples/speaker_0.mp3',
  },
  {
    id: 'en_GB-alan-medium',
    name: 'Alan',
    engine: 'piper',
    gender: 'Male',
    accent: 'British',
    style: 'Articulate, precise, radio',
    previewUrl:
      'https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_GB/alan/medium/samples/speaker_0.mp3',
  },
  {
    id: 'en_GB-southern_english_female-low',
    name: 'Charlotte',
    engine: 'piper',
    gender: 'Female',
    accent: 'British',
    style: 'Traditional RP, clear',
    previewUrl:
      'https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_GB/southern_english_female/low/samples/speaker_0.mp3',
  },
  {
    id: 'en_GB-sweetpea-medium',
    name: 'Sweetpea',
    engine: 'piper',
    gender: 'Female',
    accent: 'British',
    style: 'Playful, expressive',
    previewUrl:
      'https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_GB/sweetpea/medium/samples/speaker_0.mp3',
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
