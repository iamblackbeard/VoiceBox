import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AudioPreviewManager } from '../lib/audio-preview';
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
    await manager.play('af_heart', 'https://example.com/heart.wav');
    expect(manager.getState()).toEqual({
      voiceId: 'af_heart',
      status: 'playing',
    });
    expect(mockAudioInstances[0].play).toHaveBeenCalled();

    // Start playing Voice 2: Voice 1 should be paused/stopped
    await manager.play('en_US-hfc_female-medium', 'https://example.com/hfc.mp3');
    expect(mockAudioInstances[0].pause).toHaveBeenCalled();
    expect(mockAudioInstances[0].currentTime).toBe(0);
    expect(manager.getState()).toEqual({
      voiceId: 'en_US-hfc_female-medium',
      status: 'playing',
    });

    // Clicking the same voice toggles pause
    manager.play('en_US-hfc_female-medium', 'https://example.com/hfc.mp3');
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

    await manager.play('af_bella', 'https://example.com/bella.wav');
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

  it('handles offline or network errors gracefully with error message', async () => {
    globalThis.Audio = vi.fn().mockImplementation(function () {
      return {
        play: vi.fn().mockRejectedValue(new Error('Network error / offline')),
        pause: vi.fn(),
        currentTime: 0,
        onplay: null,
        onended: null,
        onerror: null,
      };
    }) as any;

    await manager.play('af_sky', 'https://example.com/sky.wav');

    const state = manager.getState();
    expect(state.status).toBe('error');
    expect(state.voiceId).toBe('af_sky');
    expect(state.errorMessage).toBe('Sample unavailable offline');
  });

  it('validates that all 24 curated voice preview URLs have valid formats and extensions', () => {
    expect(VOICES).toHaveLength(24);
    for (const voice of VOICES) {
      expect(voice.previewUrl).toMatch(/^https:\/\/.+\.(wav|mp3)$/i);
    }
  });
});
