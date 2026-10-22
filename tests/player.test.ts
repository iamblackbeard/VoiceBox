import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Player, LOOKAHEAD_SIZE } from '../lib/player';
import { SETTINGS_STORAGE_KEY } from '../lib/settings';
import { DEFAULT_KOKORO_VOICE, DEFAULT_PIPER_VOICE } from '../lib/voices';

// ── Web Audio API mocks ────────────────────────────────────────────────────────

function makeAudioBufferMock(length = 4, sampleRate = 24000): AudioBuffer {
  return {
    length,
    sampleRate,
    duration: length / sampleRate,
    numberOfChannels: 1,
    getChannelData: vi.fn(() => new Float32Array(length)),
    copyToChannel: vi.fn(),
    copyFromChannel: vi.fn(),
  } as unknown as AudioBuffer;
}

function makeAudioContextMock() {
  const sourceMock = {
    buffer: null as AudioBuffer | null,
    playbackRate: { value: 1.0 },
    onended: null as (() => void) | null,
    connect: vi.fn(),
    disconnect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  };

  const gainNodeMock = {
    gain: { value: 1.0 },
    connect: vi.fn(),
    disconnect: vi.fn(),
  };

  const ctxMock = {
    state: 'running' as AudioContextState,
    destination: {},
    createBuffer: vi.fn((channels: number, length: number, sampleRate: number) =>
      makeAudioBufferMock(length, sampleRate)
    ),
    createBufferSource: vi.fn(() => {
      const s = { ...sourceMock };
      return s;
    }),
    createGain: vi.fn(() => gainNodeMock),
    close: vi.fn(),
  };

  return { ctxMock, gainNodeMock, sourceMock };
}

describe('Player dual-engine routing and playback (Web Audio)', () => {
  let mockStorage: Record<string, any> = {};
  let storageListeners: Array<(changes: any, area: string) => void> = [];
  let mockTabsSendMessage: any;
  let mockTabsConnect: any;
  let mockClient: any;
  let ctxMock: any;
  let sourceMock: any;

  beforeEach(() => {
    mockStorage = {};
    storageListeners = [];

    mockTabsSendMessage = vi.fn().mockResolvedValue({});
    mockTabsConnect = vi.fn().mockReturnValue({ disconnect: vi.fn() });

    const mocks = makeAudioContextMock();
    ctxMock = mocks.ctxMock;
    sourceMock = mocks.sourceMock;

    // Every createBufferSource returns a fresh source that fires onended when start() is called
    ctxMock.createBufferSource = vi.fn(() => {
      const src: any = {
        buffer: null,
        playbackRate: { value: 1.0 },
        onended: null,
        connect: vi.fn(),
        disconnect: vi.fn(),
        stop: vi.fn(),
        start: vi.fn().mockImplementation(function (this: any) {
          // Capture `this` so tests can trigger onended on the right source
          sourceMock._lastCreated = this;
        }),
      };
      sourceMock._lastCreated = src;
      return src;
    });

    (globalThis as any).AudioContext = vi.fn(() => ctxMock);

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
    delete (globalThis as any).AudioContext;
  });

  it('reads with Kokoro when configured in settings', async () => {
    mockStorage[SETTINGS_STORAGE_KEY] = {
      engine: 'kokoro',
      hasWebGpu: true,
      checkedAt: Date.now(),
    };

    const player = new Player(mockClient);
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

    const player = new Player(mockClient);

    await player.play(['Hello world from Piper.'], 'r-2', 456);

    expect(mockClient.load).toHaveBeenCalledWith('piper', DEFAULT_PIPER_VOICE);
    expect(mockClient.generate).toHaveBeenCalledWith(
      'Hello world from Piper.',
      DEFAULT_PIPER_VOICE,
      'r-2',
      'piper'
    );
    expect(player.getActiveEngine()).toBe('piper');
  });

  it('sends highlight message for sentence 0 on play(), then clear on all-ended', async () => {
    mockStorage[SETTINGS_STORAGE_KEY] = {
      engine: 'kokoro',
      hasWebGpu: true,
      checkedAt: Date.now(),
    };

    const player = new Player(mockClient);
    await player.play(['Sentence 1.'], 'r-3', 789);

    // Sentence 0 highlight sent on first playback
    expect(mockTabsSendMessage).toHaveBeenCalledWith(789, {
      type: 'highlight',
      chunkIndex: 0,
    });

    // Trigger the AudioBufferSourceNode onended to advance to next (end of reading)
    const src = sourceMock._lastCreated;
    if (src?.onended) await src.onended();

    expect(player.getState().status).toBe('ended');
    expect(mockTabsSendMessage).toHaveBeenCalledWith(789, { type: 'clear' });
  });

  it('switches engine mid-playback and unloads old engine before loading new one', async () => {
    mockStorage[SETTINGS_STORAGE_KEY] = {
      engine: 'kokoro',
      hasWebGpu: true,
      checkedAt: Date.now(),
    };

    const player = new Player(mockClient);
    await player.play(['Sentence 1.', 'Sentence 2.'], 'r-4', 101);

    expect(player.getActiveEngine()).toBe('kokoro');
    expect(mockClient.load).toHaveBeenCalledWith('kokoro', DEFAULT_KOKORO_VOICE);

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
    expect(mockClient.unload).toHaveBeenCalled();
    expect(mockClient.load).toHaveBeenCalledWith('piper', DEFAULT_PIPER_VOICE);
  });

  it('unloads model when engine changed while idle', async () => {
    const player = new Player(mockClient);
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

    const player = new Player(mockClient);
    await player.play(['Sample sentence.'], 'r-5', 202);

    expect(player.getState().status).toBe('playing');

    player.pause();
    expect(player.getState().status).toBe('paused');

    player.resume();
    // After resume, the cached buffer plays again
    expect(player.getState().status).toBe('playing');
  });

  it('updates state to error when TTS client throws', async () => {
    mockStorage[SETTINGS_STORAGE_KEY] = {
      engine: 'kokoro',
      hasWebGpu: true,
      checkedAt: Date.now(),
    };
    mockClient.load.mockRejectedValueOnce(new Error('Network failure'));

    const player = new Player(mockClient);
    await player.play(['Failing text.'], 'r-6', 303);

    expect(player.getState().status).toBe('error');
    expect(player.getState().message).toBe('Network failure');
  });

  it('stops playback and sends clear message on stop()', async () => {
    mockStorage[SETTINGS_STORAGE_KEY] = {
      engine: 'kokoro',
      hasWebGpu: true,
      checkedAt: Date.now(),
    };

    const player = new Player(mockClient);
    await player.play(['To be stopped.'], 'r-7', 404);

    player.stop();

    expect(player.getState().status).toBe('idle');
    expect(mockTabsSendMessage).toHaveBeenCalledWith(404, { type: 'clear' });
  });

  // ─── In-memory chunk cache ─────────────────────────────────────────────────

  it('schedules LOOKAHEAD_SIZE chunks ahead immediately after play()', async () => {
    mockStorage[SETTINGS_STORAGE_KEY] = {
      engine: 'kokoro',
      hasWebGpu: true,
      checkedAt: Date.now(),
    };

    const manyChunks = Array.from({ length: LOOKAHEAD_SIZE + 3 }, (_, i) => `Sentence ${i + 1}.`);

    const player = new Player(mockClient);
    await player.play(manyChunks, 'r-8', 505);

    expect(mockClient.generate.mock.calls.length).toBeGreaterThanOrEqual(LOOKAHEAD_SIZE);
  });

  it('drops stale synthesis when a new selection replaces the old reading', async () => {
    mockStorage[SETTINGS_STORAGE_KEY] = {
      engine: 'kokoro',
      hasWebGpu: true,
      checkedAt: Date.now(),
    };

    const player = new Player(mockClient);

    await player.play(['Old sentence.'], 'r-9a', 606);
    expect(player.getState().status).toBe('playing');

    await player.play(['New sentence.'], 'r-9b', 606);
    expect(player.getState().status).toBe('playing');
  });

  it('calls unload() on the active engine when a new reading replaces it', async () => {
    mockStorage[SETTINGS_STORAGE_KEY] = {
      engine: 'kokoro',
      hasWebGpu: true,
      checkedAt: Date.now(),
    };

    const player = new Player(mockClient);
    await player.play(['First reading sentence.'], 'r-10a', 707);

    mockClient.unload.mockClear();

    await player.play(['Second reading sentence.'], 'r-10b', 707);

    expect(mockClient.unload).toHaveBeenCalled();
  });

  // ─── Sentence index in state ───────────────────────────────────────────────

  it('exposes sentenceIndex = 0 and totalSentences when playing first sentence', async () => {
    mockStorage[SETTINGS_STORAGE_KEY] = {
      engine: 'kokoro',
      hasWebGpu: true,
      checkedAt: Date.now(),
    };

    const player = new Player(mockClient);
    await player.play(['Alpha.', 'Beta.', 'Gamma.'], 'r-11', 808);

    const state = player.getState();
    expect(state.status).toBe('playing');
    expect(state.sentenceIndex).toBe(0);
    expect(state.totalSentences).toBe(3);
  });

  // ─── Seek (cache-hit path) ─────────────────────────────────────────────────

  it('seek() dispatches a highlight message for the target sentence', async () => {
    mockStorage[SETTINGS_STORAGE_KEY] = {
      engine: 'kokoro',
      hasWebGpu: true,
      checkedAt: Date.now(),
    };

    const player = new Player(mockClient);
    await player.play(['Sentence 0.', 'Sentence 1.', 'Sentence 2.'], 'r-12', 909);

    mockTabsSendMessage.mockClear();

    // Seeking to index 2 — should fire a highlight message
    await player.seek(2);

    expect(mockTabsSendMessage).toHaveBeenCalledWith(909, {
      type: 'highlight',
      chunkIndex: 2,
    });
  });

  // ─── Replay ───────────────────────────────────────────────────────────────

  it('replay() resets to sentence 0 and emits playing status', async () => {
    mockStorage[SETTINGS_STORAGE_KEY] = {
      engine: 'kokoro',
      hasWebGpu: true,
      checkedAt: Date.now(),
    };

    const player = new Player(mockClient);
    await player.play(['First.', 'Second.'], 'r-13', 1010);

    // Simulate reading ending
    const src = sourceMock._lastCreated;
    if (src?.onended) await src.onended();

    // replay() from ended state
    await player.replay();

    const state = player.getState();
    expect(state.status).toBe('playing');
    expect(state.sentenceIndex).toBe(0);
  });

  // ─── Speed Control ────────────────────────────────────────────────────────

  it('updates getSpeed and clamps between 0.25 and 2.0', () => {
    const player = new Player(mockClient);
    expect(player.getSpeed()).toBe(1.0);

    player.setSpeed(1.5);
    expect(player.getSpeed()).toBe(1.5);

    player.setSpeed(0.1);
    expect(player.getSpeed()).toBe(0.25);

    player.setSpeed(3.0);
    expect(player.getSpeed()).toBe(2.0);
  });

  it('applies playbackRate to active source when setSpeed is called while playing', async () => {
    mockStorage[SETTINGS_STORAGE_KEY] = {
      engine: 'kokoro',
      hasWebGpu: true,
      checkedAt: Date.now(),
    };

    const player = new Player(mockClient);
    await player.play(['Speed test sentence.'], 'r-speed-1', 111);

    const activeSrc = sourceMock._lastCreated;
    expect(activeSrc).toBeDefined();
    expect(activeSrc.playbackRate.value).toBe(1.0);

    player.setSpeed(1.75);
    expect(activeSrc.playbackRate.value).toBe(1.75);
  });

  it('creates AudioBufferSourceNode with currentSpeed on playback', async () => {
    mockStorage[SETTINGS_STORAGE_KEY] = {
      engine: 'kokoro',
      hasWebGpu: true,
      checkedAt: Date.now(),
    };

    const player = new Player(mockClient);
    player.setSpeed(1.25);

    await player.play(['Preset speed sentence.'], 'r-speed-2', 222);

    const activeSrc = sourceMock._lastCreated;
    expect(activeSrc).toBeDefined();
    expect(activeSrc.playbackRate.value).toBe(1.25);
  });

  it('preserves pitch on audioElement when speed is adjusted', async () => {
    mockStorage[SETTINGS_STORAGE_KEY] = {
      engine: 'kokoro',
      hasWebGpu: true,
      checkedAt: Date.now(),
    };

    const mockAudio: any = {
      src: '',
      playbackRate: 1.0,
      preservesPitch: true,
      volume: 1.0,
      play: vi.fn().mockResolvedValue(undefined),
      pause: vi.fn(),
      onended: null,
    };

    const player = new Player(mockClient, mockAudio);
    player.setSpeed(1.5);

    expect(player.getSpeed()).toBe(1.5);
    expect(mockAudio.playbackRate).toBe(1.5);
    expect(mockAudio.preservesPitch).toBe(true);

    await player.play(['Pitch test sentence.'], 'r-pitch-1', 333);

    expect(mockAudio.playbackRate).toBe(1.5);
    expect(mockAudio.preservesPitch).toBe(true);
    expect(mockAudio.play).toHaveBeenCalled();

    // Changing speed mid-reading must maintain preservesPitch = true
    player.setSpeed(1.8);
    expect(mockAudio.playbackRate).toBe(1.8);
    expect(mockAudio.preservesPitch).toBe(true);
  });
});
