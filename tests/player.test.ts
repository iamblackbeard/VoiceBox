import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Player } from '../lib/player';
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
    expect(mockClient.generate).toHaveBeenCalledWith(
      'Sentence 2.',
      DEFAULT_PIPER_VOICE,
      'r-4',
      'piper'
    );
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
});
