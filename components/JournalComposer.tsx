'use client';

import { useRef, useState, useTransition } from 'react';
import { createJournalEntry } from '@/app/actions/journal';
import { BRANCH_LABEL, type Branch } from '@/lib/types';

type Recipient = Branch | 'all';

type RecipientOption = {
  value: Recipient;
  label: string;
  note: string;
};

type MarkSummary = {
  branch: Branch;
  mark: 'want_to_become' | 'afraid_of';
};

const RECIPIENTS: RecipientOption[] = [
  { value: 'all', label: 'All of them', note: 'Leave it in the middle of the room.' },
  { value: 'flowing', label: BRANCH_LABEL.flowing, note: 'The self that kept moving.' },
  { value: 'realized', label: BRANCH_LABEL.realized, note: 'The self that made it real.' },
  { value: 'drifting', label: BRANCH_LABEL.drifting, note: 'The self that slipped away.' },
];

const MARK_COPY = {
  want_to_become: 'You chose this one.',
  afraid_of: 'You feared this one.',
} as const;

export function JournalComposer({
  marks,
  initialRecipient = 'all',
}: {
  marks: MarkSummary[];
  initialRecipient?: Recipient;
}) {
  const formRef = useRef<HTMLFormElement | null>(null);
  const [recipient, setRecipient] = useState<Recipient>(initialRecipient);
  const [content, setContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const activeRecipient = RECIPIENTS.find((option) => option.value === recipient) ?? RECIPIENTS[0];
  const mark = marks.find((item) => item.branch === recipient);

  function submit() {
    const form = formRef.current;
    if (!form) return;

    setError(null);

    startTransition(async () => {
      try {
        const formData = new FormData(form);
        formData.set('recipient', recipient);
        await createJournalEntry(formData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'The page did not stay.');
      }
    });
  }

  return (
    <form
      ref={formRef}
      className="flex flex-col gap-8 border border-ash/15 bg-ash/[0.03] p-6 md:p-8"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <div className="flex flex-col gap-3">
        <p className="text-[0.65rem] tracking-[0.35em] uppercase text-ash">
          Write To
        </p>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {RECIPIENTS.map((option) => {
            const selected = option.value === recipient;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setRecipient(option.value)}
                className={`min-h-20 border px-4 py-3 text-left transition-colors duration-700 ${
                  selected
                    ? 'border-ink text-ink bg-white/[0.03]'
                    : 'border-ash/20 text-ash hover:border-ink/40 hover:text-ink'
                }`}
              >
                <span className="block text-[0.68rem] tracking-[0.28em] uppercase">
                  {option.label}
                </span>
                <span className="mt-2 block text-sm leading-relaxed normal-case tracking-normal">
                  {option.note}
                </span>
              </button>
            );
          })}
        </div>
        <p className="min-h-6 text-sm italic text-ash">
          {mark ? MARK_COPY[mark.mark] : activeRecipient.note}
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <label htmlFor="journal-content" className="text-[0.65rem] tracking-[0.35em] uppercase text-ash">
          Today&apos;s Page
        </label>
        <textarea
          id="journal-content"
          name="content"
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="What did you almost say today? What are you afraid will stay the same?"
          className="min-h-72 resize-y border border-ash/20 bg-transparent px-5 py-5 text-base leading-loose text-ink outline-none transition-colors duration-700 placeholder:text-ash/40 focus:border-ink/40"
          maxLength={4000}
          required
        />
        <div className="flex items-center justify-between gap-4 text-sm text-ash">
          <p>Nothing here is public. Nothing here trains anything.</p>
          <p className="tabular-nums">{content.trim().length} / 4000</p>
        </div>
      </div>

      <input type="hidden" name="recipient" value={recipient} />

      <div className="flex flex-col items-center gap-4">
        {error && <p className="text-sm italic text-ash">{error}</p>}
        <button
          type="submit"
          disabled={isPending || content.trim().length < 12}
          className="text-[0.7rem] tracking-[0.4em] uppercase text-ash hover:text-ink disabled:opacity-30 disabled:hover:text-ash transition-colors duration-700"
        >
          {isPending ? 'Keeping it...' : 'Leave this page behind.'}
        </button>
      </div>
    </form>
  );
}
