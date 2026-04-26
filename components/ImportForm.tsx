'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { importProfile, saveImportedProfile } from '@/app/actions/profile';
import type { Profile } from '@/lib/types';

const READING_VERSES = [
  'Reading you...',
  'Hearing what you didn\'t say...',
  'Tracing the shape of your inertia...',
];

const VERSE_MS = 3200;
const QUESTIONS: { key: keyof Profile; label: string; placeholder: string; rows: number }[] = [
  {
    key: 'current_self',
    label: 'The Current You',
    placeholder: 'What does your life look like right now? What are you doing, who are you connected to, and what is the inner motif?',
    rows: 4,
  },
  {
    key: 'inertia',
    label: 'Inertia',
    placeholder: 'If nothing changes, what is most likely to happen over the next five to ten years? Use concrete details.',
    rows: 4,
  },
  {
    key: 'the_thing',
    label: 'The Thing You Keep Wanting To Do',
    placeholder: 'What is the one thing you keep circling and delaying?',
    rows: 3,
  },
  {
    key: 'passive_mode',
    label: 'Passive Mode',
    placeholder: 'Where do you neither actively choose nor actively refuse? Career, love, family, health, geography?',
    rows: 4,
  },
  {
    key: 'late_night_scene',
    label: 'What You Think About Late At Night',
    placeholder: 'At 4 AM, what specific scene, person, or image comes back?',
    rows: 4,
  },
  {
    key: 'unspoken_desire',
    label: 'The Unspoken Want',
    placeholder: 'What do you want but have trouble admitting out loud?',
    rows: 3,
  },
];

export function ImportForm({ prompt }: { prompt: string }) {
  const [error, setError] = useState<string | null>(null);
  const [verseIdx, setVerseIdx] = useState(0);
  const [mode, setMode] = useState<'paste' | 'answer'>('paste');
  const [showPrompt, setShowPrompt] = useState(false);
  const [isPending, startTransition] = useTransition();
  const promptPreview = useMemo(() => prompt.split('\n').slice(0, 7).join('\n'), [prompt]);

  // Cycle the in-flight verses while parsing. Stops the moment pending ends.
  useEffect(() => {
    if (!isPending) return;
    const id = window.setInterval(() => {
      setVerseIdx((i) => (i + 1) % READING_VERSES.length);
    }, VERSE_MS);
    return () => window.clearInterval(id);
  }, [isPending]);

  function onPasteSubmit(formData: FormData) {
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

  function onAnswerSubmit(formData: FormData) {
    setError(null);
    setVerseIdx(0);
    startTransition(async () => {
      try {
        await saveImportedProfile(formData);
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'The profile got lost.';
        if (/NEXT_REDIRECT/.test(msg)) throw e;
        setError(msg);
      }
    });
  }

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(prompt);
    } catch {
      // Ignore clipboard errors; user can still select manually.
    }
  }

  return (
    <div className="mt-12 flex flex-col gap-8">
      <div className="self-center flex gap-3 border border-ash/20 p-2">
        <button
          type="button"
          onClick={() => setMode('paste')}
          className={`px-4 py-2 text-[0.65rem] tracking-[0.3em] uppercase transition-colors duration-700 ${
            mode === 'paste' ? 'text-ink border border-ash/30' : 'text-ash hover:text-ink'
          }`}
        >
          Paste AI Profile
        </button>
        <button
          type="button"
          onClick={() => setMode('answer')}
          className={`px-4 py-2 text-[0.65rem] tracking-[0.3em] uppercase transition-colors duration-700 ${
            mode === 'answer' ? 'text-ink border border-ash/30' : 'text-ash hover:text-ink'
          }`}
        >
          Answer Six Questions
        </button>
      </div>

      {mode === 'paste' ? (
        <form action={onPasteSubmit} className="grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="border border-ash/20 p-6 flex flex-col gap-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[0.65rem] tracking-[0.3em] uppercase text-ash">Prompt</p>
                <p className="mt-2 text-sm text-ash/80 italic">
                  Paste this into the AI that knows you best.
                </p>
              </div>
              <button
                type="button"
                onClick={copyPrompt}
                className="text-[0.65rem] tracking-[0.3em] uppercase text-ash hover:text-ink transition-colors duration-700"
              >
                Copy
              </button>
            </div>

            <pre className="whitespace-pre-wrap font-serif text-sm text-ink/85 leading-loose max-h-64 overflow-y-auto">
              {showPrompt ? prompt : `${promptPreview}\n\n[...]`}
            </pre>

            <button
              type="button"
              onClick={() => setShowPrompt((v) => !v)}
              className="self-start text-[0.65rem] tracking-[0.3em] uppercase text-ash hover:text-ink transition-colors duration-700"
            >
              {showPrompt ? 'Collapse prompt' : 'Expand prompt'}
            </button>
          </div>

          <div className="flex flex-col gap-5">
            <div>
              <p className="text-[0.65rem] tracking-[0.3em] uppercase text-ash">Profile reply</p>
              <p className="mt-2 text-sm text-ash/80 italic">
                Paste the AI&apos;s full reply here.
              </p>
            </div>
            <textarea
              name="raw"
              required
              rows={18}
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
            </div>
          </div>
        </form>
      ) : (
        <form action={onAnswerSubmit} className="grid gap-8 lg:grid-cols-2">
          {QUESTIONS.map((question) => (
            <div key={question.key} className="flex flex-col gap-3">
              <label className="text-[0.65rem] tracking-[0.3em] uppercase text-ash">
                {question.label}
              </label>
              <textarea
                name={question.key}
                required
                rows={question.rows}
                disabled={isPending}
                placeholder={question.placeholder}
                className="w-full bg-transparent border border-ash/25 focus:border-ink/40 outline-none p-5 text-ink leading-loose font-serif text-base resize-y placeholder:text-ash/50 placeholder:italic disabled:opacity-50"
              />
            </div>
          ))}
          <div className="lg:col-span-2 flex flex-col items-center gap-4">
            <button
              type="submit"
              disabled={isPending}
              className="text-[0.7rem] tracking-[0.4em] uppercase text-ash hover:text-ink disabled:opacity-30 disabled:hover:text-ash transition-colors duration-700"
            >
              {isPending ? 'Keeping it...' : 'Build my profile.'}
            </button>
          </div>
        </form>
      )}

      {isPending && (
        <p
          key={verseIdx}
          className="text-sm text-ash italic fade-in-slow text-center max-w-md self-center"
        >
          {READING_VERSES[verseIdx]}
        </p>
      )}

      {error && !isPending && <p className="text-sm text-ash/80 italic text-center max-w-md self-center">{error}</p>}
    </div>
  );
}
