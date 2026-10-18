import React, { useEffect } from 'react';
import type { Voice } from '@/lib/voices';

interface FavoriteLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  favorites: Voice[];
  onRemoveFavorite: (voice: Voice) => void;
  attemptedVoiceName?: string;
}

export const FavoriteLimitModal: React.FC<FavoriteLimitModalProps> = ({
  isOpen,
  onClose,
  favorites,
  onRemoveFavorite,
  attemptedVoiceName,
}) => {
  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div
        className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-2xl transition-all animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Icon & Title */}
        <div className="flex items-start gap-4 mb-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 text-xl font-bold">
            ⚠️
          </div>
          <div className="flex flex-col">
            <h2
              id="modal-title"
              className="text-base font-bold text-on-primary tracking-tight"
            >
              Maximum 5 Favorites Reached
            </h2>
            <p className="text-xs text-on-surface mt-1 leading-relaxed">
              {attemptedVoiceName ? (
                <>
                  Cannot add <strong className="text-on-primary font-semibold">"{attemptedVoiceName}"</strong> to favorites. You can have up to 5 favorite voices in the quick switcher popup.
                </>
              ) : (
                'You can only have up to 5 favorite voices in the quick switcher popup. Please remove a voice first.'
              )}
            </p>
          </div>
        </div>

        {/* Current Favorites List */}
        <div className="mb-5 rounded-xl border border-border/80 bg-primary/70 p-3">
          <span className="text-[11px] font-semibold text-on-surface uppercase tracking-wider block mb-2">
            Current Favorites (5/5)
          </span>
          <div className="flex flex-col divide-y divide-border/60">
            {favorites.map((v) => (
              <div
                key={v.id}
                className="flex items-center justify-between py-2 text-xs"
              >
                <div className="flex flex-col min-w-0 pr-2">
                  <span className="font-semibold text-on-primary truncate">
                    {v.name}
                  </span>
                  <span className="text-[10px] text-on-surface">
                    {v.accent} • {v.gender}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onRemoveFavorite(v)}
                  className="shrink-0 rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-[11px] font-semibold text-red-500 hover:bg-red-500/20 transition cursor-pointer"
                  title={`Remove ${v.name} from favorites`}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto rounded-xl bg-accent px-5 py-2 text-xs font-semibold text-on-accent hover:opacity-90 transition cursor-pointer shadow-xs"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};
