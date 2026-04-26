'use client';

import { useEffect, useState, useTransition } from 'react';
import { importProfile } from '@/app/actions/profile';

const READING_VERSES = [
  'Reading you...',
  'Hearing what you didn\'t say...',
  'Tracing the shape of your inertia...',
];

const VERSE_MS = 3200;

export function ImportForm() {
  const [error, setError] = useState<string | null>(null);
  const [verseIdx, setVerseIdx] = useState(0);
  const [isPending, startTransition] = useTransition();

  // Cycle the in-flight verses while parsing. Stops the moment pending ends.
  useEffect(() => {
    if (!isPending) return;
    const id = window.setInterval(() => {
      setVerseIdx((i) => (i + 1) % READING_VERSES.length);
    }, VERSE_MS);
    return () => window.clearInterval(id);
  }, [isPending]);

  function onSubmit(formData: FormData) {
    setError(null);
    setVerseIdx(0);
    startTransition(async () => {
      try {
        await importProfile(formData);
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'The parser got lost.';
        if (/NEXT_REDIRECT/.test(msg)) throw e;
        setError(msg);
      }
    });
  }

  return (
    <form action={onSubmit} className="flex flex-col gap-8 mt-12">
      <textarea
        name="raw"
        required
        rows={14}
        disabled={isPending}
        placeholder="Paste the profile your AI wrote about you here..."
        className="w-full bg-transparent border border-ash/25 focus:border-ink/40 outline-none p-6 text-ink leading-loose font-serif text-base resize-y placeholder:text-ash/50 placeholder:italic disabled:opacity-50"
      />

      <div className="flex flex-col items-center gap-4">
        <button
          type="submit"
          disabled={isPending}
          className="text-[0.7rem] tracking-[0.4em] uppercase text-ash hover:text-ink disabled:opacity-30 disabled:hover:text-ash transition-colors duration-700"
        >
          {isPending ? 'Reading...' : 'Read me.'}
        </button>

        {isPending && (
          <p
            key={verseIdx}
            className="text-sm text-ash italic fade-in-slow text-center max-w-md"
          >
            {READING_VERSES[verseIdx]}
          </p>
        )}

        {error && !isPending && <p className="text-sm text-ash/80 italic text-center max-w-md">{error}</p>}
      </div>
    </form>
  );
}
