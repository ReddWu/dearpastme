'use client';

import { useState, useTransition } from 'react';
import { uploadSelfie } from '@/app/actions/profile';
import { SelfieField } from '@/components/SelfieField';

export function BeginForm() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await uploadSelfie(formData);
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'The upload got lost.';
        // Next.js redirect() throws an opaque internal — let it propagate.
        if (/NEXT_REDIRECT/.test(msg)) throw e;
        setError(msg);
      }
    });
  }

  return (
    <form action={onSubmit} className="flex flex-col items-center gap-10 mt-4 fade-in-delayed">
      <SelfieField />
      <button
        type="submit"
        disabled={isPending}
        className="text-[0.7rem] tracking-[0.4em] uppercase text-ash hover:text-ink disabled:opacity-30 disabled:hover:text-ash transition-colors duration-700"
      >
        {isPending ? 'Keeping your face...' : 'Continue.'}
      </button>
      {error && <p className="text-sm text-ash/80 italic">{error}</p>}
    </form>
  );
}
