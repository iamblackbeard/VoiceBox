export interface Voice {
  id: string;
  name: string;
}

export const VOICES: Voice[] = [
  { id: 'af_heart', name: 'Heart' }
];

export const DEFAULT_VOICE = VOICES[0]!.id;
