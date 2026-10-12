function floatTo16BitPCM(output: DataView, offset: number, input: Float32Array) {
  for (let i = 0; i < input.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, input[i] as number));
    output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

/**
 * Encodes raw 32-bit floating-point audio samples into a standard 16-bit PCM WAV Blob.
 */
export function encodeWAV(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  /* RIFF identifier */
  writeString(view, 0, 'RIFF');
  /* RIFF chunk length */
  view.setUint32(4, 36 + samples.length * 2, true);
  /* RIFF type */
  writeString(view, 8, 'WAVE');
  /* format chunk identifier */
  writeString(view, 12, 'fmt ');
  /* format chunk length */
  view.setUint32(16, 16, true);
  /* sample format (PCM = 1) */
  view.setUint16(20, 1, true);
  /* channel count */
  view.setUint16(22, 1, true);
  /* sample rate */
  view.setUint32(24, sampleRate, true);
  /* byte rate (sample rate * block align) */
  view.setUint32(28, sampleRate * 2, true);
  /* block align (channel count * bytes per sample) */
  view.setUint16(32, 2, true);
  /* bits per sample */
  view.setUint16(34, 16, true);
  /* data chunk identifier */
  writeString(view, 36, 'data');
  /* data chunk length */
  view.setUint32(40, samples.length * 2, true);

  floatTo16BitPCM(view, 44, samples);

  return new Blob([view], { type: 'audio/wav' });
}

/**
 * Decodes a WAV file buffer (e.g. from Piper) into raw Float32Array samples and sample rate.
 */
export function decodeWAV(buffer: ArrayBuffer): { audio: Float32Array; sampleRate: number } {
  const view = new DataView(buffer);

  if (buffer.byteLength < 44) {
    throw new Error('Invalid WAV file: buffer too small');
  }

  const riff = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));
  const wave = String.fromCharCode(view.getUint8(8), view.getUint8(9), view.getUint8(10), view.getUint8(11));

  if (riff !== 'RIFF' || wave !== 'WAVE') {
    throw new Error('Invalid WAV file: missing RIFF/WAVE header');
  }

  const sampleRate = view.getUint32(24, true);
  const bitsPerSample = view.getUint16(34, true);

  let offset = 12;
  while (offset + 8 <= buffer.byteLength) {
    const chunkId = String.fromCharCode(
      view.getUint8(offset),
      view.getUint8(offset + 1),
      view.getUint8(offset + 2),
      view.getUint8(offset + 3)
    );
    const chunkSize = view.getUint32(offset + 4, true);

    if (chunkId === 'data') {
      const dataOffset = offset + 8;
      const bytesPerSample = bitsPerSample / 8;
      const sampleCount = Math.floor(chunkSize / bytesPerSample);
      const audio = new Float32Array(sampleCount);

      if (bitsPerSample === 16) {
        for (let i = 0; i < sampleCount; i++) {
          const sample = view.getInt16(dataOffset + i * 2, true);
          audio[i] = sample < 0 ? sample / 0x8000 : sample / 0x7FFF;
        }
      } else if (bitsPerSample === 32) {
        for (let i = 0; i < sampleCount; i++) {
          audio[i] = view.getFloat32(dataOffset + i * 4, true);
        }
      } else {
        throw new Error(`Unsupported bits per sample in WAV: ${bitsPerSample}`);
      }

      return { audio, sampleRate };
    }

    offset += 8 + chunkSize;
  }

  throw new Error('Invalid WAV file: data chunk not found');
}
