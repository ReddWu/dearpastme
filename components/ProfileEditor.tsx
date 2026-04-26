'use client';

import { useState, useTransition } from 'react';
import { saveProfile } from '@/app/actions/profile';
import type { Profile } from '@/lib/types';

const FIELDS: { key: keyof Profile; label: string; hint: string }[] = [
  { key: 'current_self', label: 'Your Life Right Now', hint: 'How it sees the life you live now.' },
  { key: 'inertia', label: 'If Nothing Changes', hint: 'Where this path leads if nothing shifts.' },
  { key: 'the_thing', label: 'The Thing You Keep Putting Off', hint: 'Just one — the biggest one.' },
  { key: 'passive_mode', label: 'Where You Stop Choosing', hint: 'Where you let the world choose for you.' },
  { key: 'late_night_scene', label: 'What Comes Back at Night', hint: 'The image that surfaces at 4 AM.' },
  { key: 'unspoken_desire', label: 'The Want You Rarely Admit', hint: 'What your behavior reveals but your words deny.' },
  { key: 'interests', label: 'The Things You Reach For', hint: 'Specific names — music, food, places, niches you actually live in.' },
];

export function ProfileEditor({ initial }: { initial: Profile }) {
  const [profile, setProfile] = useState<Profile>(initial);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function update(key: keyof Profile, value: string) {
    setProfile((p) => ({ ...p, [key]: value }));
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        await saveProfile(profile);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'The save got lost.');
      }
    });
  }

  return (
    <div className="flex flex-col gap-12">
      {FIELDS.map((f) => (
        <div key={f.key} className="flex flex-col gap-3">
          <div className="flex items-baseline gap-4">
            <h3 className="text-base text-ink tracking-wide">{f.label}</h3>
            <span className="text-[0.7rem] tracking-[0.3em] uppercase text-ash/70">{f.hint}</span>
          </div>
          <textarea
            value={profile[f.key]}
            onChange={(e) => update(f.key, e.target.value)}
            rows={f.key === 'the_thing' || f.key === 'unspoken_desire' ? 3 : 5}
            className="w-full bg-transparent border-b border-ash/20 focus:border-ink/40 outline-none py-3 text-ink/90 leading-loose font-serif resize-y"
          />
        </div>
      ))}

      <div className="flex flex-col items-center gap-4 mt-8">
        {error && <p className="text-sm text-ash italic">{error}</p>}
        <button
          type="button"
          onClick={submit}
          disabled={isPending}
          className="text-[0.7rem] tracking-[0.4em] uppercase text-ash hover:text-ink disabled:opacity-30 disabled:hover:text-ash transition-colors duration-700"
        >
          {isPending ? 'Saving...' : 'This feels right'}
        </button>
      </div>
    </div>
  );
}
