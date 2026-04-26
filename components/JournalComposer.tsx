'use client';

import { useRef, useState, useTransition } from 'react';
import { createJournalEntry } from '@/app/actions/journal';
import { BRANCH_LABEL, type Branch } from '@/lib/types';

type Recipient = Branch | 'all';

const RECIPIENTS: { value: Recipient; label: string }[] = [
  { value: 'all', label: 'All of them' },
  { value: 'flowing', label: BRANCH_LABEL.flowing },
  { value: 'realized', label: BRANCH_LABEL.realized },
  { value: 'drifting', label: BRANCH_LABEL.drifting },
];

const WEATHERS = [
  { value: 'clear',    label: '☀️ Clear' },
  { value: 'overcast', label: '☁️ Overcast' },
  { value: 'rain',     label: '🌧️ Rain' },
  { value: 'fog',      label: '🌫️ Fog' },
  { value: 'night',    label: '🌙 Night' },
] as const;

const MOODS = [
  { value: 'calm',     label: '🪷 Calm' },
  { value: 'restless', label: '⚡ Restless' },
  { value: 'tired',    label: '🌑 Tired' },
  { value: 'hopeful',  label: '🌱 Hopeful' },
  { value: 'brittle',  label: '🪞 Brittle' },
] as const;

type MarkSummary = {
  branch: Branch;
  mark: 'want_to_become' | 'afraid_of';
};

type Weather = (typeof WEATHERS)[number]['value'];
type Mood = (typeof MOODS)[number]['value'];

function todayLabel() {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date());
}

export function JournalComposer({
  marks: _marks,
  initialRecipient = 'all',
}: {
  marks: MarkSummary[];
  initialRecipient?: Recipient;
}) {
  const formRef = useRef<HTMLFormElement | null>(null);
  const [recipient, setRecipient] = useState<Recipient>(initialRecipient);
  const [weather, setWeather] = useState<Weather | null>(null);
  const [mood, setMood] = useState<Mood | null>(null);
  const [content, setContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit() {
    const form = formRef.current;
    if (!form) return;
    setError(null);

    startTransition(async () => {
      try {
        const formData = new FormData(form);
        formData.set('recipient', recipient);
        if (weather) formData.set('weather', weather); else formData.delete('weather');
        if (mood) formData.set('mood', mood); else formData.delete('mood');
        await createJournalEntry(formData);
        // Reset composer for the next page.
        setContent('');
        setMood(null);
        setWeather(null);
        setSavedAt(Date.now());
      } catch (err) {
        setError(err instanceof Error ? err.message : 'The page did not stay.');
      }
    });
  }

  return (
    <form
      ref={formRef}
      onSubmit={(e) => { e.preventDefault(); submit(); }}
      className="flex flex-col gap-10"
    >
      {/* Date stamp — Medium-style header */}
      <div className="flex flex-col gap-1 border-b border-ash/15 pb-6">
        <p className="text-[0.65rem] tracking-[0.35em] uppercase text-ash">Today</p>
        <p className="text-2xl text-ink font-light tracking-wide">{todayLabel()}</p>
      </div>

      {/* Weather + Mood chips */}
      <div className="flex flex-col gap-6">
        <ChipRow
          label="Weather"
          options={WEATHERS}
          value={weather}
          onSelect={(v) => setWeather(weather === v ? null : v)}
        />
        <ChipRow
          label="Mood"
          options={MOODS}
          value={mood}
          onSelect={(v) => setMood(mood === v ? null : v)}
        />
      </div>

      {/* The page itself — large, minimal, serif */}
      <textarea
        name="content"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Today…"
        autoFocus
        maxLength={6000}
        className="min-h-[28rem] w-full resize-y bg-transparent border-0 outline-none text-ink/95 font-serif text-xl leading-loose placeholder:text-ash/30 placeholder:italic"
      />

      {/* Recipient pills + counter, footer row */}
      <div className="flex flex-col gap-4 border-t border-ash/15 pt-6">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <p className="text-[0.65rem] tracking-[0.35em] uppercase text-ash">To</p>
          {RECIPIENTS.map((option) => {
            const selected = option.value === recipient;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setRecipient(option.value)}
                className={`text-[0.7rem] tracking-[0.3em] uppercase transition-colors duration-700 ${
                  selected ? 'text-ink underline underline-offset-8 decoration-ash/60' : 'text-ash hover:text-ink'
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between gap-6">
          <p className="text-xs italic text-ash/70">
            {savedAt && !isPending
              ? 'Page kept. The room may answer, or it may not.'
              : 'Nothing here is public. Nothing here trains anything.'}
          </p>
          <div className="flex items-center gap-6">
            <span className="text-xs tabular-nums text-ash/60">{content.trim().length} / 6000</span>
            <button
              type="submit"
              disabled={isPending || content.trim().length < 12}
              className="text-[0.7rem] tracking-[0.4em] uppercase text-ash hover:text-ink disabled:opacity-30 disabled:hover:text-ash transition-colors duration-700"
            >
              {isPending ? 'Keeping it…' : 'Send page →'}
            </button>
          </div>
        </div>

        {error && <p className="text-sm italic text-ash">{error}</p>}
      </div>

      <input type="hidden" name="recipient" value={recipient} />
    </form>
  );
}

function ChipRow<T extends string>({
  label,
  options,
  value,
  onSelect,
}: {
  label: string;
  options: readonly { value: T; label: string }[];
  value: T | null;
  onSelect: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <span className="text-[0.65rem] tracking-[0.35em] uppercase text-ash mr-2">{label}</span>
      {options.map((opt) => {
        const selected = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onSelect(opt.value)}
            className={`text-sm px-3 py-1 border transition-colors duration-700 ${
              selected
                ? 'border-ink text-ink bg-white/[0.03]'
                : 'border-ash/20 text-ash hover:border-ink/40 hover:text-ink'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
