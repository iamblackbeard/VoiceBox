import { useEffect, useRef, type ReactNode } from 'react';

interface PopupProps {
  children: ReactNode;
  anchorId: string;
  visible: boolean;
  onClose: () => void;
}

/**
 * Shared popup shell that appears above a button.
 * Used by SpeedPopup and VoicePopup.
 */
export default function Popup({ children, anchorId, visible, onClose }: PopupProps) {
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!visible) return;

    const handleClickOutside = (e: MouseEvent) => {
      const anchor = document.getElementById(anchorId);
      if (
        popupRef.current &&
        !popupRef.current.contains(e.target as Node) &&
        anchor &&
        !anchor.contains(e.target as Node)
      ) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [visible, anchorId, onClose]);

  if (!visible) return null;

  return (
    <div
      ref={popupRef}
      className="absolute bottom-full left-1/2 mb-2 -translate-x-1/2 rounded-lg border border-border bg-surface p-4 shadow-lg"
      role="dialog"
      aria-modal="true"
    >
      {children}
    </div>
  );
}
