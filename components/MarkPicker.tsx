'use client';

import { useState, useTransition } from 'react';
import { setMarks } from '@/app/actions/marks';
import type { Branch } from '@/lib/types';
import { BRANCH_LABEL } from '@/lib/types';

type Card = { id: string; branch: Branch; image_url: string };

export function MarkPicker({ futures }: { futures: Card[] }) {
  const [want, setWant] = useState<string | null>(null);
  const [afraid, setAfraid] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function pick(id: string, kind: 'want' | 'afraid') {
    if (kind === 'want') {
      setWant((prev) => (prev === id ? null : id));
      if (afraid === id) setAfraid(null);
    } else {
      setAfraid((prev) => (prev === id ? null : id));
      if (want === id) setWant(null);
    }
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        await setMarks({
          want_to_become: want ?? undefined,
          afraid_of: afraid ?? undefined,
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : 'The save got lost.');
      }
    });
  }

  return (
    <div className="flex flex-col gap-16">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {futures.map((f) => {
          const isWant = want === f.id;
          const isAfraid = afraid === f.id;
          return (
            <div key={f.id} className="flex flex-col gap-4">
              <div className="relative aspect-[3/4] overflow-hidden bg-ash/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={f.image_url} alt="" className="w-full h-full object-cover grayscale-[15%]" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
              </div>
              <div className="text-center text-base text-ink tracking-wide">
                {BRANCH_LABEL[f.branch]}
              </div>
              <div className="flex justify-center gap-3">
                <button
                  type="button"
                  onClick={() => pick(f.id, 'want')}
                  className={`text-[0.65rem] tracking-[0.3em] uppercase px-3 py-2 border transition-colors duration-700 ${
                    isWant ? 'border-ink text-ink' : 'border-ash/30 text-ash hover:text-ink hover:border-ink/40'
                  }`}
                >
                  Want to become
                </button>
                <button
                  type="button"
                  onClick={() => pick(f.id, 'afraid')}
                  className={`text-[0.65rem] tracking-[0.3em] uppercase px-3 py-2 border transition-colors duration-700 ${
                    isAfraid ? 'border-ink text-ink' : 'border-ash/30 text-ash hover:text-ink hover:border-ink/40'
                  }`}
                >
                  Afraid of
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col items-center gap-4">
        {error && <p className="text-sm text-ash italic">{error}</p>}
        <button
          type="button"
          onClick={submit}
          disabled={isPending || (!want && !afraid)}
          className="text-[0.7rem] tracking-[0.4em] uppercase text-ash hover:text-ink disabled:opacity-30 disabled:hover:text-ash transition-colors duration-700"
        >
          {isPending ? 'Keeping it...' : 'Take me to my journal.'}
        </button>
      </div>
    </div>
  );
}
