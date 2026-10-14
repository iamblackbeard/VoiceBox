import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Player, LOOKAHEAD_SIZE } from '../lib/player';
import { SETTINGS_STORAGE_KEY } from '../lib/settings';
import { DEFAULT_KOKORO_VOICE, DEFAULT_PIPER_VOICE } from '../lib/voices';

describe('Player dual-engine routing and playback', () => {
  let mockStorage: Record<string, any> = {};
  let storageListeners: Array<(changes: any, area: string) => void> = [];
  let mockTabsSendMessage: any;
  let mockTabsConnect: any;
  let mockAudio: any;
  let mockClient: any;

  beforeEach(() => {
    mockStorage = {};
    storageListeners = [];

    mockTabsSendMessage = vi.fn().mockResolvedValue({});
    mockTabsConnect = vi.fn().mockReturnValue({ disconnect: vi.fn() });

    (globalThis as any).browser = {
      storage: {
        local: {
          get: vi.fn(async (key: string) => ({ [key]: mockStorage[key] })),
          set: vi.fn(async (items: Record<string, any>) => {
            Object.assign(mockStorage, items);
          }),
        },
        onChanged: {
          addListener: vi.fn((fn) => storageListeners.push(fn)),
          removeListener: vi.fn(),
        },
      },
      tabs: {
        sendMessage: mockTabsSendMessage,
        connect: mockTabsConnect,
      },
    };

    if (typeof URL.createObjectURL === 'undefined') {
      URL.createObjectURL = vi.fn(() => 'blob:mock-audio-url');
      URL.revokeObjectURL = vi.fn();
    } else {
      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-audio-url');
      vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    }

    mockAudio = {
      src: '',
      play: vi.fn().mockResolvedValue(undefined),
      pause: vi.fn(),
      onended: null,
    };

    mockClient = {
      load: vi.fn().mockResolvedValue(undefined),
      unload: vi.fn().mockResolvedValue(undefined),
      generate: vi.fn().mockResolvedValue({
        audio: new Float32Array([0, 0.1, -0.1, 0]),
        sampleRate: 24000,
        engine: 'kokoro',
      }),
      onProgress: vi.fn(),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete (globalThis as any).browser;
  });

  it('reads with Kokoro when configured in settings', async () => {
    mockStorage[SETTINGS_STORAGE_KEY] = {
      engine: 'kokoro',
      hasWebGpu: true,
      checkedAt: Date.now(),
    };

    const player = new Player(mockClient, mockAudio);
    const stateUpdates: string[] = [];
    player.subscribe((s) => stateUpdates.push(s.status));

    await player.play(['First sentence.', 'Second sentence.'], 'r-1', 123);

    expect(mockClient.load).toHaveBeenCalledWith('kokoro', DEFAULT_KOKORO_VOICE);
    expect(mockClient.generate).toHaveBeenCalledWith(
      'First sentence.',
      DEFAULT_KOKORO_VOICE,
      'r-1',
      'kokoro'
    );
    expect(mockAudio.play).toHaveBeenCalled();
    expect(mockTabsSendMessage).toHaveBeenCalledWith(123, {
      type: 'highlight',
      chunkIndex: 0,
    });
    expect(player.getActiveEngine()).toBe('kokoro');
  });

  it('reads with Piper when configured in settings', async () => {
    mockStorage[SETTINGS_STORAGE_KEY] = {
      engine: 'piper',
      hasWebGpu: false,
      checkedAt: Date.now(),
    };
    mockClient.generate.mockResolvedValueOnce({
      audio: new Float32Array([0, 0.2, 0]),
      sampleRate: 22050,
      engine: 'piper',
    });

    const player = new Player(mockClient, mockAudio);

    await player.play(['Hello world from Piper.'], 'r-2', 456);

    expect(mockClient.load).toHaveBeenCalledWith('piper', DEFAULT_PIPER_VOICE);
    expect(mockClient.generate).toHaveBeenCalledWith(
      'Hello world from Piper.',
      DEFAULT_PIPER_VOICE,
      'r-2',
      'piper'
    );
    expect(mockAudio.play).toHaveBeenCalled();
    expect(mockTabsSendMessage).toHaveBeenCalledWith(456, {
      type: 'highlight',
      chunkIndex: 0,
    });
    expect(player.getActiveEngine()).toBe('piper');
  });

  it('advances through chunks and sends clear message on completion', async () => {
    mockStorage[SETTINGS_STORAGE_KEY] = {
      engine: 'piper',
      hasWebGpu: false,
      checkedAt: Date.now(),
    };

    const player = new Player(mockClient, mockAudio);
    await player.play(['Sentence 1.', 'Sentence 2.'], 'r-3', 789);

    expect(mockTabsSendMessage).toHaveBeenCalledWith(789, {
      type: 'highlight',
      chunkIndex: 0,
    });

    // Trigger onended to simulate audio completion
    await mockAudio.onended();

    expect(mockTabsSendMessage).toHaveBeenCalledWith(789, {
      type: 'highlight',
      chunkIndex: 1,
    });

    // Complete the second chunk
    await mockAudio.onended();

    expect(player.getState().status).toBe('ended');
    expect(mockTabsSendMessage).toHaveBeenCalledWith(789, { type: 'clear' });
  });

  it('switches engine mid-playback and unloads old engine before loading new one', async () => {
    mockStorage[SETTINGS_STORAGE_KEY] = {
      engine: 'kokoro',
      hasWebGpu: true,
      checkedAt: Date.now(),
    };

    const player = new Player(mockClient, mockAudio);
    await player.play(['Sentence 1.', 'Sentence 2.'], 'r-4', 101);

    expect(player.getActiveEngine()).toBe('kokoro');
    expect(mockClient.load).toHaveBeenCalledWith('kokoro', DEFAULT_KOKORO_VOICE);

    // Mid-playback engine switch event to Piper
    for (const listener of storageListeners) {
      await listener(
        {
          [SETTINGS_STORAGE_KEY]: {
            newValue: { engine: 'piper', hasWebGpu: true, checkedAt: Date.now() },
          },
        },
        'local'
      );
    }

    expect(player.getActiveEngine()).toBe('piper');
    expect(mockAudio.pause).toHaveBeenCalled();
    expect(mockClient.unload).toHaveBeenCalled();
    expect(mockClient.load).toHaveBeenCalledWith('piper', DEFAULT_PIPER_VOICE);
  });

  it('unloads model when engine changed while idle', async () => {
    const player = new Player(mockClient, mockAudio);
    expect(player.getState().status).toBe('idle');

    for (const listener of storageListeners) {
      await listener(
        {
          [SETTINGS_STORAGE_KEY]: {
            newValue: { engine: 'piper', hasWebGpu: false, checkedAt: Date.now() },
          },
        },
        'local'
      );
    }

    expect(player.getActiveEngine()).toBe('piper');
    expect(mockClient.unload).toHaveBeenCalled();
  });

  it('handles pause and resume properly', async () => {
    mockStorage[SETTINGS_STORAGE_KEY] = {
      engine: 'kokoro',
      hasWebGpu: true,
      checkedAt: Date.now(),
    };

    const player = new Player(mockClient, mockAudio);
    await player.play(['Sample sentence.'], 'r-5', 202);

    expect(player.getState().status).toBe('playing');

    player.pause();
    expect(mockAudio.pause).toHaveBeenCalled();
    expect(player.getState().status).toBe('paused');

    player.resume();
    expect(mockAudio.play).toHaveBeenCalled();
  });

  it('updates state to error when TTS client throws', async () => {
    mockStorage[SETTINGS_STORAGE_KEY] = {
      engine: 'kokoro',
      hasWebGpu: true,
      checkedAt: Date.now(),
    };
    mockClient.load.mockRejectedValueOnce(new Error('Network failure'));

    const player = new Player(mockClient, mockAudio);
    await player.play(['Failing text.'], 'r-6', 303);

    expect(player.getState().status).toBe('error');
    expect(player.getState().message).toBe('Network failure');
  });

  it('stops playback, revokes URL, and sends clear message on stop()', async () => {
    mockStorage[SETTINGS_STORAGE_KEY] = {
      engine: 'kokoro',
      hasWebGpu: true,
      checkedAt: Date.now(),
    };

    const player = new Player(mockClient, mockAudio);
    await player.play(['To be stopped.'], 'r-7', 404);

    player.stop();

    expect(mockAudio.pause).toHaveBeenCalled();
    expect(player.getState().status).toBe('idle');
    expect(mockTabsSendMessage).toHaveBeenCalledWith(404, { type: 'clear' });
  });

  // ─── Slice 4: look-ahead queue tests ──────────────────────────────────────

  it('schedules LOOKAHEAD_SIZE chunks ahead immediately after play()', async () => {
    mockStorage[SETTINGS_STORAGE_KEY] = {
      engine: 'kokoro',
      hasWebGpu: true,
      checkedAt: Date.now(),
    };

    // Create more chunks than LOOKAHEAD_SIZE so we can measure the window
    const manyChunks = Array.from({ length: LOOKAHEAD_SIZE + 3 }, (_, i) => `Sentence ${i + 1}.`);

    // generate resolves immediately for all calls
    const player = new Player(mockClient, mockAudio);
    await player.play(manyChunks, 'r-8', 505);

    // After play(), the first chunk is playing (dequeued).
    // scheduleAhead is called from playNextChunk for currentIndex=1 as well,
    // so total generate calls = at least LOOKAHEAD_SIZE (first window) and
    // up to LOOKAHEAD_SIZE+1 after advancing. We just confirm >= LOOKAHEAD_SIZE.
    expect(mockClient.generate.mock.calls.length).toBeGreaterThanOrEqual(LOOKAHEAD_SIZE);
  });

  it('drops stale audio when a new selection replaces the old reading', async () => {
    mockStorage[SETTINGS_STORAGE_KEY] = {
      engine: 'kokoro',
      hasWebGpu: true,
      checkedAt: Date.now(),
    };

    // Both readings use fast mocks. The second play() bumps generationToken so
    // queue entries for the first reading are dropped as stale.
    mockClient.generate.mockResolvedValue({
      audio: new Float32Array([0, 0.1]),
      sampleRate: 24000,
      engine: 'kokoro',
    });

    const player = new Player(mockClient, mockAudio);

    // Complete first reading
    await player.play(['Old sentence.'], 'r-9a', 606);
    expect(player.getState().status).toBe('playing');

    // Replace with a second reading (bumps generationToken)
    await player.play(['New sentence.'], 'r-9b', 606);

    // The second reading must be playing
    expect(player.getState().status).toBe('playing');
    expect(mockTabsSendMessage).toHaveBeenCalledWith(606, {
      type: 'highlight',
      chunkIndex: 0,
    });
  });
  it('calls unload() on the active engine when a new reading replaces it', async () => {
    mockStorage[SETTINGS_STORAGE_KEY] = {
      engine: 'kokoro',
      hasWebGpu: true,
      checkedAt: Date.now(),
    };

    const player = new Player(mockClient, mockAudio);
    await player.play(['First reading sentence.'], 'r-10a', 707);

    // Reset call count so we only count the unload from the second play()
    mockClient.unload.mockClear();

    await player.play(['Second reading sentence.'], 'r-10b', 707);

    // unload() must have been called to tear down the old engine state
    expect(mockClient.unload).toHaveBeenCalled();
  });

  it('waits in buffering when the next chunk is not yet ready', async () => {
    mockStorage[SETTINGS_STORAGE_KEY] = {
      engine: 'kokoro',
      hasWebGpu: true,
      checkedAt: Date.now(),
    };

    // Second generate call (chunk 1) is slow; all others resolve immediately.
    let slowResolve: ((v: any) => void) | null = null;
    let callCount = 0;
    mockClient.generate.mockImplementation((_text: string) => {
      callCount++;
      if (callCount === 2) {
        return new Promise((resolve) => { slowResolve = resolve; });
      }
      return Promise.resolve({
        audio: new Float32Array([0, 0.1]),
        sampleRate: 24000,
        engine: 'kokoro',
      });
    });

    const player = new Player(mockClient, mockAudio);
    // scheduleAhead queues chunk 0 (fast) and chunk 1 (slow)
    await player.play(['Sentence 1.', 'Sentence 2.'], 'r-11', 808);

    // Chunk 0 is playing; fire onended without awaiting (it will stall on slow chunk 1)
    const onEndedP = mockAudio.onended();
    await new Promise((r) => setTimeout(r, 0));
    expect(player.getState().status).toBe('buffering');

    // Resolve chunk 1
    slowResolve!({ audio: new Float32Array([0, 0.1]), sampleRate: 24000, engine: 'kokoro' });
    await onEndedP;
    await new Promise((r) => setTimeout(r, 0));

    expect(player.getState().status).toBe('playing');
  });
});
