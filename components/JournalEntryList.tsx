'use client';

import { useState } from 'react';
import { BRANCH_LABEL, type Branch } from '@/lib/types';

export type JournalSidebarEntry = {
  id: string;
  content: string;
  recipient: Branch | 'all';
  weather: string | null;
  mood: string | null;
  created_at: string;
  has_reply: boolean;
};

const WEATHER_GLYPH: Record<string, string> = {
  clear: '☀️', overcast: '☁️', rain: '🌧️', fog: '🌫️', night: '🌙',
};

const MOOD_GLYPH: Record<string, string> = {
  calm: '🪷', restless: '⚡', tired: '🌑', hopeful: '🌱', brittle: '🪞',
};

function shortDate(value: string): string {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(value));
}

function recipientLabel(recipient: Branch | 'all'): string {
  return recipient === 'all' ? 'All' : BRANCH_LABEL[recipient];
}

function preview(text: string, max = 80): string {
  const oneLine = text.replace(/\s+/g, ' ').trim();
  return oneLine.length > max ? oneLine.slice(0, max - 1) + '…' : oneLine;
}

export function JournalEntryList({ entries }: { entries: JournalSidebarEntry[] }) {
  const [openId, setOpenId] = useState<string | null>(null);

  if (entries.length === 0) {
    return (
      <p className="text-sm italic text-ash/70 leading-loose">
        No pages yet. The first one you leave will sit here.
      </p>
    );
  }

  return (
    <div className="flex flex-col">
      {entries.map((entry) => {
        const isOpen = entry.id === openId;
        return (
          <button
            key={entry.id}
            type="button"
            onClick={() => setOpenId(isOpen ? null : entry.id)}
            className="text-left border-b border-ash/10 py-4 group"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-[0.65rem] tracking-[0.3em] uppercase text-ash">
                <span>{shortDate(entry.created_at)}</span>
                {entry.weather && <span aria-hidden>{WEATHER_GLYPH[entry.weather] ?? ''}</span>}
                {entry.mood && <span aria-hidden>{MOOD_GLYPH[entry.mood] ?? ''}</span>}
              </div>
              <div className="flex items-center gap-2">
                {entry.has_reply && (
                  <span title="A reply arrived" className="text-[0.7rem] text-ink">✉</span>
                )}
                <span className="text-[0.6rem] tracking-[0.3em] uppercase text-ash/60">
                  → {recipientLabel(entry.recipient)}
                </span>
              </div>
            </div>
            <p className={`mt-2 text-sm leading-relaxed text-ink/80 group-hover:text-ink transition-colors duration-500 ${isOpen ? '' : 'line-clamp-3'}`}>
              {isOpen ? entry.content : preview(entry.content, 140)}
            </p>
          </button>
        );
      })}
    </div>
  );
}
