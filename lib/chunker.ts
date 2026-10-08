/**
 * Chunker: turns text into "chunks" of one or two sentences.
 * Pure functions, no browser APIs, so it is easy to unit test.
 *
 * Chunks keep every original character (spaces and newlines included), so
 * `chunks.join('') === text`. Slice 3 relies on that to map each chunk back
 * onto the page for highlighting.
 */

/** A sentence shorter than this is merged with the next one. */
export const SHORT_SENTENCE_CHARS = 30;

/** Group sentences into chunks of one or two sentences. */
export function chunkSentences(sentences: string[]): string[] {
  const chunks: string[] = [];
  let i = 0;
  while (i < sentences.length) {
    const current = sentences[i]!;
    const next = sentences[i + 1];
    // Merge a short sentence with the one after it. A long one stays alone,
    // and a very long one is never split.
    if (current.trim().length < SHORT_SENTENCE_CHARS && next !== undefined) {
      chunks.push(current + next);
      i += 2;
    } else {
      chunks.push(current);
      i += 1;
    }
  }
  return chunks;
}

/** Split text into sentences, then group them into chunks. */
export function chunkText(text: string): string[] {
  if (!text.trim()) return [];
  const segmenter = new Intl.Segmenter('en', { granularity: 'sentence' });
  const sentences = Array.from(segmenter.segment(text), (s) => s.segment);
  return chunkSentences(sentences).filter((chunk) => chunk.trim().length > 0);
}
