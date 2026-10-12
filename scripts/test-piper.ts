import { TtsSession } from '@mintplex-labs/piper-tts-web';
import { decodeWAV } from '../lib/audio';
import fs from 'fs';
import path from 'path';

async function main() {
  console.log('Testing Piper TTS synthesis script...');

  // Note: @mintplex-labs/piper-tts-web is a frontend library requiring browser OPFS & WASM workers.
  if (typeof window === 'undefined' && typeof self === 'undefined') {
    console.log('Notice: Piper TTS Web requires browser/worker environment (OPFS & WebAssembly).');
    console.log('To verify in browser: build the extension and run in Chrome or Firefox.');
    return;
  }

  const voiceId = 'en_US-hfc_female-medium';
  console.log(`Initializing Piper TtsSession for voice: ${voiceId}...`);
  const session = await TtsSession.create({
    voiceId: voiceId as any,
    progress: (p) => {
      console.log(`Download progress: ${p.url} (${p.loaded}/${p.total})`);
    },
  });

  console.log('Synthesizing speech for test sentence...');
  const text = 'Hello from local Piper text to speech.';
  const wavBlob = await session.predict(text);

  const arrayBuffer = await wavBlob.arrayBuffer();
  console.log(`Received WAV blob with byte size: ${arrayBuffer.byteLength}`);

  const decoded = decodeWAV(arrayBuffer);
  console.log(`Decoded audio: ${decoded.audio.length} samples at ${decoded.sampleRate}Hz`);

  if (decoded.audio.length === 0) {
    throw new Error('Piper generated empty audio samples!');
  }

  const outputPath = path.resolve('test-piper-audio.wav');
  fs.writeFileSync(outputPath, Buffer.from(arrayBuffer));
  console.log(`Success! Piper audio saved to ${outputPath}`);
}

main().catch((err) => {
  console.error('Piper test script error:', err);
  process.exit(1);
});
