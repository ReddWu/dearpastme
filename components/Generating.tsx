'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

const VERSES = [
  'Three versions of you are walking toward this moment.',
  'One of them already knows what you will do next year.',
  'Another is the version you would rather not meet.',
  'The third has stopped making choices.',
  'They are coming into focus.',
  'Stay — this time, they are the ones who speak first.',
];

const VERSE_MS = 5200; // each line lingers
const FAILURE_AFTER_MS = 240_000;

type Phase = 'working' | 'done' | 'error';

export function Generating() {
  const router = useRouter();
  const [verseIdx, setVerseIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>('working');
  const [error, setError] = useState<string | null>(null);
  const startedRef = useRef(false);

  // Cycle the poetic verses on a fixed cadence; halt once done.
  useEffect(() => {
    if (phase !== 'working') return;
    const id = window.setInterval(() => {
      setVerseIdx((i) => (i + 1) % VERSES.length);
    }, VERSE_MS);
    return () => window.clearInterval(id);
  }, [phase]);

  // Kick off the heavy generation exactly once.
  // We deliberately do NOT abort the fetch on unmount: React Strict Mode in
  // dev double-invokes effects (mount → cleanup → mount), and aborting in the
  // first cleanup killed the request before it ever left the browser. The
  // server-side work is also long-running and idempotent (the route deletes
  // any prior round before inserting), so letting it run to completion is
  // the right behavior even if the user navigates away.
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    let cancelled = false;
    const timeoutId = window.setTimeout(() => {
      if (cancelled) return;
      setError('The future got lost in transit.');
      setPhase('error');
    }, FAILURE_AFTER_MS);

    fetch('/api/generate-futures', { method: 'POST' })
      .then(async (res) => {
        if (cancelled) return;
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? 'The future got lost in transit.');
        }
        setPhase('done');
        // Hold one beat so the final verse can land.
        window.setTimeout(() => router.push('/futures'), 1800);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'The future got lost in transit.');
        setPhase('error');
      })
      .finally(() => window.clearTimeout(timeoutId));

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [router]);

  return (
    <div className="flex flex-col items-center gap-16">
      <div className="h-32 flex items-center">
        <p
          key={verseIdx}
          className="text-xl md:text-2xl leading-relaxed tracking-wide text-ink text-center font-light fade-in-slow max-w-xl"
        >
          {VERSES[verseIdx]}
        </p>
      </div>

      <div className="flex flex-col items-center gap-3 fade-in-delayed">
        <div className="flex gap-3">
          <span className="block w-1 h-1 rounded-full bg-ink/70 animate-pulse" />
          <span className="block w-1 h-1 rounded-full bg-ink/40 animate-pulse [animation-delay:200ms]" />
          <span className="block w-1 h-1 rounded-full bg-ink/20 animate-pulse [animation-delay:400ms]" />
        </div>
        {phase === 'done' && (
          <p className="text-[0.7rem] tracking-[0.4em] uppercase text-ash mt-4">
            They are here.
          </p>
        )}
        {phase === 'error' && (
          <div className="flex flex-col items-center gap-4 mt-4">
            <p className="text-sm text-ash italic max-w-md text-center">{error}</p>
            <button
              type="button"
              onClick={() => location.reload()}
              className="text-[0.7rem] tracking-[0.4em] uppercase text-ash hover:text-ink transition-colors duration-700"
            >
              Try again.
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
