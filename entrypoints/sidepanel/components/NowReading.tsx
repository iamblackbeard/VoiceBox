/** The selected text, in the spot where a music player shows the song title. */
export default function NowReading({ text }: { text: string | null }) {
  return (
    <section
      aria-label="Now reading"
      className="flex min-h-0 flex-1 flex-col gap-3 rounded-3xl border border-border bg-surface p-5 shadow-lg shadow-accent/10"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
        Now reading
      </p>
      {text ? (
        <p
          id="selected-text"
          className="min-h-0 flex-1 overflow-y-auto whitespace-pre-wrap text-lg leading-relaxed text-on-primary"
        >
          {text}
        </p>
      ) : (
        <p className="m-auto max-w-[16rem] text-center text-on-surface">
          Select some text on a page, right-click, and choose{' '}
          <strong className="text-on-primary">Read Aloud</strong>.
        </p>
      )}
    </section>
  );
}
