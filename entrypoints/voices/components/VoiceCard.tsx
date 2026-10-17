import React from 'react';
import type { Voice } from '@/lib/voices';
import type { AudioPlaybackStatus } from '@/lib/audio-preview';

interface VoiceCardProps {
  voice: Voice;
  isActive: boolean;
  isFavorite: boolean;
  playbackStatus: AudioPlaybackStatus;
  errorMessage?: string;
  onPlayToggle: () => void;
  onSelectActive: () => void;
  onToggleFavorite: () => void;
}

export const VoiceCard: React.FC<VoiceCardProps> = ({
  voice,
  isActive,
  isFavorite,
  playbackStatus,
  errorMessage,
  onPlayToggle,
  onSelectActive,
  onToggleFavorite,
}) => {
  const isPlaying = playbackStatus === 'playing';
  const isLoading = playbackStatus === 'loading';
  const isError = playbackStatus === 'error';

  return (
    <div
      className={`group relative flex flex-col justify-between rounded-2xl border p-5 transition-all duration-200 bg-surface ${
        isActive
          ? 'border-accent ring-1 ring-accent/30 shadow-sm'
          : 'border-border hover:border-accent/40 hover:shadow-md'
      }`}
    >
      {/* Top Header: Name, Badges & Favorite Heart */}
      <div>
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-on-primary tracking-tight">
                {voice.name}
              </h3>
              {isActive && (
                <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold text-accent">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                  Active
                </span>
              )}
            </div>
            <span className="text-xs text-on-surface font-mono opacity-70">
              {voice.id}
            </span>
          </div>

          <button
            type="button"
            onClick={onToggleFavorite}
            aria-label={isFavorite ? `Unfavorite ${voice.name}` : `Favorite ${voice.name}`}
            className={`flex h-8 w-8 items-center justify-center rounded-full text-base transition-transform cursor-pointer hover:scale-110 active:scale-95 ${
              isFavorite
                ? 'text-red-500 hover:text-red-600 bg-red-500/10'
                : 'text-on-surface/50 hover:text-red-500 hover:bg-surface'
            }`}
            title={isFavorite ? 'Remove from favorites' : 'Add to quick popup favorites'}
          >
            {isFavorite ? '♥' : '♡'}
          </button>
        </div>

        {/* Badges: Accent & Gender */}
        <div className="flex flex-wrap gap-1.5 mb-2.5">
          <span className="rounded-md border border-border/80 bg-primary/60 px-2 py-0.5 text-[11px] font-medium text-on-surface">
            {voice.accent}
          </span>
          <span className="rounded-md border border-border/80 bg-primary/60 px-2 py-0.5 text-[11px] font-medium text-on-surface">
            {voice.gender}
          </span>
        </div>

        {/* Style / Character Description */}
        <p className="text-xs text-on-surface leading-relaxed mb-4 min-h-[32px]">
          {voice.style}
        </p>
      </div>

      {/* Middle: Interactive Audio Preview Player */}
      <div className="rounded-xl border border-border/80 bg-primary/80 p-3 mb-4 shadow-2xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onPlayToggle}
            aria-label={isPlaying ? `Pause sample for ${voice.name}` : `Play preview sample for ${voice.name}`}
            className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-bold transition-all cursor-pointer shadow-xs ${
              isPlaying
                ? 'bg-accent text-on-accent ring-2 ring-accent/40 scale-105'
                : 'bg-accent text-on-accent hover:opacity-90 active:scale-95'
            }`}
          >
            {isLoading ? (
              <svg
                className="h-4 w-4 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                />
              </svg>
            ) : isPlaying ? (
              <span className="text-xs">⏸</span>
            ) : isError ? (
              <span className="text-xs">⚠️</span>
            ) : (
              <span className="text-xs ml-0.5">▶</span>
            )}
          </button>

          <div className="flex flex-col min-w-0 flex-1">
            <div className="flex items-center justify-between gap-1">
              <span className="text-xs font-medium text-on-primary truncate">
                {isLoading
                  ? 'Buffering sample...'
                  : isPlaying
                  ? 'Auditioning Voice'
                  : isError
                  ? 'Sample Error'
                  : 'Audio Preview'}
              </span>
              <span className="text-[10px] text-on-surface/70 font-mono">
                {voice.previewUrl.endsWith('.wav') ? 'WAV' : 'MP3'}
              </span>
            </div>

            {isPlaying ? (
              <div className="flex items-center gap-1 mt-1">
                <span className="h-2 w-1 rounded-full bg-accent animate-pulse" />
                <span className="h-3.5 w-1 rounded-full bg-accent animate-pulse delay-75" />
                <span className="h-2 w-1 rounded-full bg-accent animate-pulse delay-150" />
                <span className="h-4 w-1 rounded-full bg-accent animate-pulse delay-100" />
                <span className="text-[10px] font-medium text-accent ml-1.5">
                  Streaming audio preview
                </span>
              </div>
            ) : isError ? (
              <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                {errorMessage || 'Sample unavailable offline'}
              </span>
            ) : (
              <span className="text-[10px] text-on-surface">
                Instant stream • Zero model download
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Footer: Select Voice Button */}
      <div className="pt-1">
        {isActive ? (
          <button
            type="button"
            disabled
            className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-accent/40 bg-accent/10 py-2 text-xs font-semibold text-accent cursor-default"
          >
            <span>✓ Active Reading Voice</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onSelectActive}
            className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-primary border border-border py-2 text-xs font-semibold text-on-primary hover:border-accent hover:text-accent transition cursor-pointer"
          >
            <span>Select as Active Voice</span>
          </button>
        )}
      </div>
    </div>
  );
};
