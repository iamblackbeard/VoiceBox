import { describe, expect, it } from 'vitest';
import { decodeWAV, encodeWAV } from '../lib/audio';

describe('audio WAV encode and decode', () => {
  it('roundtrips Float32Array audio through encodeWAV and decodeWAV', () => {
    const originalSamples = new Float32Array([0, 0.5, -0.5, 0.8, -0.8, 1.0, -1.0]);
    const sampleRate = 22050;

    const blob = encodeWAV(originalSamples, sampleRate);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('audio/wav');

    // We can convert Blob into an ArrayBuffer synchronously for the DataView test
    // In node/vitest, blob.arrayBuffer() returns a Promise<ArrayBuffer>
    return blob.arrayBuffer().then((buffer) => {
      const decoded = decodeWAV(buffer);
      expect(decoded.sampleRate).toBe(sampleRate);
      expect(decoded.audio.length).toBe(originalSamples.length);

      // Verify that values match within 16-bit PCM quantization tolerance (~1/32767)
      for (let i = 0; i < originalSamples.length; i++) {
        expect(decoded.audio[i]).toBeCloseTo(originalSamples[i]!, 3);
      }
    });
  });

  it('throws error when decoding buffer smaller than WAV header', () => {
    const tinyBuffer = new ArrayBuffer(20);
    expect(() => decodeWAV(tinyBuffer)).toThrow('buffer too small');
  });

  it('throws error when header is missing RIFF/WAVE marker', () => {
    const corrupted = new ArrayBuffer(50);
    expect(() => decodeWAV(corrupted)).toThrow('missing RIFF/WAVE header');
  });
});
