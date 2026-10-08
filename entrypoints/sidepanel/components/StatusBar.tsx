/** Top of the panel: download progress and error messages appear here later. */
export default function StatusBar({ message }: { message: string | null }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex h-9 items-center justify-center rounded-full text-sm text-on-surface"
    >
      {message ? (
        <span className="rounded-full bg-surface px-4 py-1.5">{message}</span>
      ) : null}
    </div>
  );
}
