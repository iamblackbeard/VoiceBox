import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AudioPreviewManager, resolveAudioUrl } from '../lib/audio-preview';
import { VOICES } from '../lib/voices';

describe('AudioPreviewManager', () => {
  let manager: AudioPreviewManager;
  let originalAudio: any;

  beforeEach(() => {
    manager = new AudioPreviewManager();
    originalAudio = globalThis.Audio;
  });

  afterEach(() => {
    manager.stop();
    globalThis.Audio = originalAudio;
    delete (globalThis as any).browser;
    delete (globalThis as any).chrome;
    vi.restoreAllMocks();
  });

  it('initializes with idle state and null voiceId', () => {
    const state = manager.getState();
    expect(state.status).toBe('idle');
    expect(state.voiceId).toBeNull();
  });

  it('notifies subscribers upon subscription and state changes', () => {
    const listener = vi.fn();
    const unsubscribe = manager.subscribe(listener);

    expect(listener).toHaveBeenCalledWith({
      voiceId: null,
      status: 'idle',
    });

    manager.stop();
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
    manager.stop();
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('enforces single-sample playback when switching between voices', async () => {
    const mockAudioInstances: any[] = [];

    // Mock HTML5 Audio class
    globalThis.Audio = vi.fn().mockImplementation(function (url: string) {
      const instance = {
        src: url,
        preload: 'auto',
        play: vi.fn().mockImplementation(() => {
          if (instance.onplay) instance.onplay();
          return Promise.resolve();
        }),
        pause: vi.fn(),
        currentTime: 0,
        onplay: null as any,
        onended: null as any,
        onerror: null as any,
      };
      mockAudioInstances.push(instance);
      return instance;
    }) as any;

    // Start playing Voice 1
    await manager.play('af_heart', '/voice_sample/kokoro/af_heart.mp3');
    expect(manager.getState()).toEqual({
      voiceId: 'af_heart',
      status: 'playing',
    });
    expect(mockAudioInstances[0].play).toHaveBeenCalled();

    // Start playing Voice 2: Voice 1 should be paused/stopped
    await manager.play('en_US-hfc_female-medium', '/voice_sample/piper/en_US-hfc_female-medium.mp3');
    expect(mockAudioInstances[0].pause).toHaveBeenCalled();
    expect(mockAudioInstances[0].currentTime).toBe(0);
    expect(manager.getState()).toEqual({
      voiceId: 'en_US-hfc_female-medium',
      status: 'playing',
    });

    // Clicking the same voice toggles pause
    manager.play('en_US-hfc_female-medium', '/voice_sample/piper/en_US-hfc_female-medium.mp3');
    expect(mockAudioInstances[1].pause).toHaveBeenCalled();
    expect(manager.getState().status).toBe('idle');
    expect(manager.getState().voiceId).toBeNull();
  });

  it('resets state to idle when audio finishes playing (onended)', async () => {
    let onendedCallback: any;

    globalThis.Audio = vi.fn().mockImplementation(function (url: string) {
      return {
        src: url,
        preload: 'auto',
        play: vi.fn().mockImplementation(function (this: any) {
          onendedCallback = this.onended;
          return Promise.resolve();
        }),
        pause: vi.fn(),
        currentTime: 0,
        set onended(cb: any) {
          onendedCallback = cb;
        },
        get onended() {
          return onendedCallback;
        },
        onplay: null,
        onerror: null,
      };
    }) as any;

    await manager.play('af_bella', '/voice_sample/kokoro/af_bella.mp3');
    expect(manager.getState().voiceId).toBe('af_bella');

    // Simulate audio playback finishing
    if (onendedCallback) {
      onendedCallback();
    }

    expect(manager.getState()).toEqual({
      voiceId: null,
      status: 'idle',
    });
  });

  it('handles playback errors gracefully with error message', async () => {
    globalThis.Audio = vi.fn().mockImplementation(function () {
      return {
        play: vi.fn().mockRejectedValue(new Error('Audio playback error')),
        pause: vi.fn(),
        currentTime: 0,
        onplay: null,
        onended: null,
        onerror: null,
      };
    }) as any;

    await manager.play('af_sky', '/voice_sample/kokoro/af_sky.mp3');

    const state = manager.getState();
    expect(state.status).toBe('error');
    expect(state.voiceId).toBe('af_sky');
    expect(state.errorMessage).toBe('Sample audio could not be played');
  });

  it('resolves audio URL with browser/chrome runtime.getURL or fallback', () => {
    // Relative URL without runtime
    expect(resolveAudioUrl('/voice_sample/kokoro/af_heart.mp3')).toBe(
      '/voice_sample/kokoro/af_heart.mp3',
    );

    // Absolute URLs untouched
    expect(resolveAudioUrl('https://example.com/audio.mp3')).toBe(
      'https://example.com/audio.mp3',
    );

    // With browser.runtime.getURL
    (globalThis as any).browser = {
      runtime: {
        getURL: vi.fn((path: string) => `chrome-extension://dummy-id${path}`),
      },
    };
    expect(resolveAudioUrl('/voice_sample/kokoro/af_heart.mp3')).toBe(
      'chrome-extension://dummy-id/voice_sample/kokoro/af_heart.mp3',
    );
  });

  it('validates that all 24 curated voice preview URLs point to local .mp3 sample files', () => {
    expect(VOICES).toHaveLength(24);
    for (const voice of VOICES) {
      expect(voice.previewUrl).toMatch(/^\/voice_sample\/(kokoro|piper)\/.+\.mp3$/i);
    }
  });
});
