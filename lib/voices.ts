export interface Voice {
  id: string;
  name: string;
  engine?: 'kokoro' | 'piper';
}

export const DEFAULT_KOKORO_VOICE = 'af_heart';
export const DEFAULT_PIPER_VOICE = 'en_US-hfc_female-medium';

export const VOICES: Voice[] = [
  { id: DEFAULT_KOKORO_VOICE, name: 'Heart', engine: 'kokoro' },
  { id: DEFAULT_PIPER_VOICE, name: 'HFC Female', engine: 'piper' },
];

export const DEFAULT_VOICE = DEFAULT_KOKORO_VOICE;

export function getDefaultVoiceForEngine(engine: 'kokoro' | 'piper'): string {
  return engine === 'piper' ? DEFAULT_PIPER_VOICE : DEFAULT_KOKORO_VOICE;
}
