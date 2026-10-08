import { describe, expect, it } from 'vitest';
import { chunkSentences, chunkText } from '../lib/chunker';

describe('chunkSentences', () => {
  it('returns nothing for no sentences', () => {
    expect(chunkSentences([])).toEqual([]);
  });

  it('keeps long sentences as their own chunk', () => {
    const a = 'This is the first sentence and it is long enough. ';
    const b = 'This is the second sentence and it is also long. ';
    expect(chunkSentences([a, b])).toEqual([a, b]);
  });

  it('merges a short sentence with the next one', () => {
    const short = 'Hi there. ';
    const long = 'This sentence is definitely longer than thirty characters. ';
    expect(chunkSentences([short, long])).toEqual([short + long]);
  });

  it('never makes a chunk of more than two sentences', () => {
    const chunks = chunkSentences(['A. ', 'B. ', 'C. ', 'D. ']);
    expect(chunks).toEqual(['A. B. ', 'C. D. ']);
  });

  it('leaves a short last sentence on its own', () => {
    const long = 'This sentence is definitely longer than thirty characters. ';
    expect(chunkSentences([long, 'Ok.'])).toEqual([long, 'Ok.']);
  });

  it('keeps a very long sentence whole', () => {
    const huge = 'word '.repeat(200).trim() + '.';
    expect(chunkSentences([huge])).toEqual([huge]);
  });
});

describe('chunkText', () => {
  it('splits text into sentence chunks using Intl.Segmenter', () => {
    const text =
      'The quick brown fox jumps over the lazy dog today. ' +
      'Then it ran away into the forest and was never seen again.';
    const chunks = chunkText(text);
    expect(chunks).toHaveLength(2);
    expect(chunks.join('')).toBe(text);
  });

  it('does not split on abbreviations like Dr.', () => {
    const chunks = chunkText('I met Dr. Smith at the park yesterday afternoon.');
    expect(chunks).toHaveLength(1);
  });

  it('keeps every character so highlighting can map back to the page', () => {
    const text = 'Short one. Another sentence that is quite a bit longer. Bye.';
    expect(chunkText(text).join('')).toBe(text);
  });

  it('returns nothing for empty or whitespace-only text', () => {
    expect(chunkText('')).toEqual([]);
    expect(chunkText('   \n ')).toEqual([]);
  });
});
