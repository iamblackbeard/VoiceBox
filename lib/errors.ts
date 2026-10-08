export const OFFLINE_MESSAGE = "You seem to be offline, check connection";
export const GENERIC_ERROR_MESSAGE = "Encounter some error, while fetching voice";

export function mapErrorToMessage(error: unknown): string {
  console.error("Original TTS error:", error);
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return OFFLINE_MESSAGE;
  }
  return GENERIC_ERROR_MESSAGE;
}
