import { describe, expect, it, vi } from 'vitest';
import { TTSClient } from '../lib/tts-client';

class MockWorker {
  public postMessage = vi.fn();
  public onmessage: ((e: MessageEvent) => void) | null = null;

  respond(data: any) {
    if (this.onmessage) {
      this.onmessage({ data } as MessageEvent);
    }
  }
}

describe('TTSClient lifecycle & engine dispatch', () => {
  it('starts with null activeEngine', () => {
    const mockWorker = new MockWorker();
    const client = new TTSClient(mockWorker as any);
    expect(client.getActiveEngine()).toBeNull();
  });

  it('loads piper engine and tracks activeEngine state', async () => {
    const mockWorker = new MockWorker();
    const client = new TTSClient(mockWorker as any);

    const loadPromise = client.load('piper', 'en_US-hfc_female-medium');

    expect(mockWorker.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'load',
        engine: 'piper',
        voiceId: 'en_US-hfc_female-medium',
      })
    );

    const callArgs = mockWorker.postMessage.mock.calls[0]![0];
    mockWorker.respond({
      type: 'loaded',
      id: callArgs.id,
      engine: 'piper',
    });

    await loadPromise;
    expect(client.getActiveEngine()).toBe('piper');
  });

  it('unloads engine and resets activeEngine state', async () => {
    const mockWorker = new MockWorker();
    const client = new TTSClient(mockWorker as any);

    // Initial load
    const loadPromise = client.load('piper');
    const loadId = mockWorker.postMessage.mock.calls[0]![0].id;
    mockWorker.respond({ type: 'loaded', id: loadId, engine: 'piper' });
    await loadPromise;
    expect(client.getActiveEngine()).toBe('piper');

    // Unload
    const unloadPromise = client.unload();
    expect(mockWorker.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'unload' })
    );

    const unloadId = mockWorker.postMessage.mock.calls[1]![0].id;
    mockWorker.respond({ type: 'unloaded', id: unloadId });
    await unloadPromise;

    expect(client.getActiveEngine()).toBeNull();
  });

  it('dispatches generate with specified engine and returns audio data', async () => {
    const mockWorker = new MockWorker();
    const client = new TTSClient(mockWorker as any);

    const dummyAudio = new Float32Array([0.1, -0.2, 0.3]);
    const generatePromise = client.generate(
      'Hello test sentence',
      'en_US-hfc_female-medium',
      'reading-123',
      'piper'
    );

    expect(mockWorker.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'generate',
        text: 'Hello test sentence',
        voiceId: 'en_US-hfc_female-medium',
        readingId: 'reading-123',
        engine: 'piper',
      })
    );

    const genId = mockWorker.postMessage.mock.calls[0]![0].id;
    mockWorker.respond({
      type: 'audio',
      id: genId,
      readingId: 'reading-123',
      audio: dummyAudio,
      sampleRate: 22050,
      engine: 'piper',
    });

    const result = await generatePromise;
    expect(result.audio).toEqual(dummyAudio);
    expect(result.sampleRate).toBe(22050);
    expect(result.engine).toBe('piper');
    expect(client.getActiveEngine()).toBe('piper');
  });

  it('forwards progress callbacks from worker', () => {
    const mockWorker = new MockWorker();
    const client = new TTSClient(mockWorker as any);

    const progressListener = vi.fn();
    client.onProgress(progressListener);

    mockWorker.respond({
      type: 'progress',
      progress: { status: 'downloading', loaded: 50, total: 100 },
      engine: 'piper',
    });

    expect(progressListener).toHaveBeenCalledWith('downloading');
  });

  it('rejects with mapped error when worker returns error message', async () => {
    const mockWorker = new MockWorker();
    const client = new TTSClient(mockWorker as any);

    const loadPromise = client.load('piper');
    const loadId = mockWorker.postMessage.mock.calls[0]![0].id;

    mockWorker.respond({
      type: 'error',
      id: loadId,
      error: 'Failed to fetch',
    });

    await expect(loadPromise).rejects.toThrow();
  });
});
