import { useEffect, useState } from 'react';

export default function Toast({ visible }: { visible: boolean }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (visible) {
      setShow(true);
      const timer = setTimeout(() => setShow(false), 2000);
      return () => clearTimeout(timer);
    } else {
      setShow(false);
    }
  }, [visible]);

  if (!show) return null;

  return (
    <div
      role="status"
      className="fixed bottom-24 left-1/2 -translate-x-1/2 rounded-full bg-surface px-4 py-2 text-sm text-on-surface shadow-lg"
    >
      Playing
    </div>
  );
}
