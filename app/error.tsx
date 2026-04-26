'use client';

export default function GlobalError({
  error,
  reset,
}: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-xl flex flex-col items-center gap-12">
        <p className="text-[0.7rem] tracking-[0.4em] uppercase text-ash text-center fade-in-slow">
          A letter got lost in transit
        </p>
        <p className="text-base md:text-lg leading-loose text-ink/90 text-center font-serif italic fade-in-slow">
          {error.message || 'Something on the way to the future broke down.'}
        </p>
        <button
          type="button"
          onClick={reset}
          className="text-[0.7rem] tracking-[0.4em] uppercase text-ash hover:text-ink transition-colors duration-700 fade-in-delayed"
        >
          Try again.
        </button>
      </div>
    </main>
  );
}
