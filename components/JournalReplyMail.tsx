'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { BRANCH_LABEL, type Branch } from '@/lib/types';

// Same Web Audio aging chain we use on /futures so the future-self voice
// in a reply sounds ten years older. Keep the per-branch numbers in sync
// with components/FutureGallery.tsx.
type AgeProfile = { rate: number; lowpass: number; gain: number };
const AGE: Record<Branch, AgeProfile> = {
  flowing:  { rate: 0.92, lowpass: 4200, gain: 1.00 },
  realized: { rate: 0.94, lowpass: 5000, gain: 1.00 },
  drifting: { rate: 0.86, lowpass: 3200, gain: 0.92 },
};

export type DeliveredReply = {
  id: string;
  from_branch: Branch;
  text_content: string;
  voice_url: string | null;
  delivered_at: string;
};

function whenLabel(value: string): string {
  const ts = new Date(value).getTime();
  const ageMs = Date.now() - ts;
  const minutes = Math.floor(ageMs / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(value));
}

export function JournalReplyMail({ replies }: { replies: DeliveredReply[] }) {
  if (replies.length === 0) {
    return (
      <div className="border border-dashed border-ash/15 p-6 text-center">
        <p className="text-[0.65rem] tracking-[0.35em] uppercase text-ash mb-2">Inbox</p>
        <p className="text-sm italic text-ash/70 leading-loose">
          No letters back yet. They arrive when they arrive.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <p className="text-[0.65rem] tracking-[0.35em] uppercase text-ash">Inbox</p>
        <p className="text-[0.65rem] tracking-[0.3em] uppercase text-ash/60">
          {replies.length} {replies.length === 1 ? 'letter' : 'letters'}
        </p>
      </div>
      {replies.map((r) => <ReplyCard key={r.id} reply={r} />)}
    </div>
  );
}

function ReplyCard({ reply }: { reply: DeliveredReply }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const wiredRef = useRef(false);
  const [open, setOpen] = useState(false);
  const [playing, setPlaying] = useState(false);

  useEffect(() => () => {
    ctxRef.current?.close().catch(() => {});
    ctxRef.current = null;
    wiredRef.current = false;
  }, []);

  const wireAging = useCallback(() => {
    if (wiredRef.current) return;
    const audio = audioRef.current;
    if (!audio) return;
    const settings = AGE[reply.from_branch];

    audio.playbackRate = settings.rate;
    type PitchableAudio = HTMLAudioElement & {
      preservesPitch?: boolean;
      mozPreservesPitch?: boolean;
      webkitPreservesPitch?: boolean;
    };
    const a = audio as PitchableAudio;
    a.preservesPitch = false;
    a.mozPreservesPitch = false;
    a.webkitPreservesPitch = false;

    const Ctx: typeof AudioContext | undefined =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) { wiredRef.current = true; return; }
    try {
      const ctx = new Ctx();
      ctxRef.current = ctx;
      const source = ctx.createMediaElementSource(audio);
      const lowpass = ctx.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.frequency.value = settings.lowpass;
      lowpass.Q.value = 0.7;
      const gain = ctx.createGain();
      gain.gain.value = settings.gain;
      source.connect(lowpass).connect(gain).connect(ctx.destination);
    } catch {
      // MediaElementAudioSourceNode can only be created once per element.
    }
    wiredRef.current = true;
  }, [reply.from_branch]);

  async function togglePlay() {
    const a = audioRef.current;
    if (!a) return;
    wireAging();
    if (ctxRef.current?.state === 'suspended') {
      await ctxRef.current.resume().catch(() => {});
    }
    if (a.paused) {
      try { await a.play(); setPlaying(true); }
      catch { setPlaying(false); }
    } else {
      a.pause();
      setPlaying(false);
    }
  }

  return (
    <article className="border border-ash/15 bg-ash/[0.02] p-5 md:p-6">
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-base text-ink">✉</span>
          <span className="text-[0.7rem] tracking-[0.35em] uppercase text-ink">
            From {BRANCH_LABEL[reply.from_branch]}
          </span>
        </div>
        <span className="text-[0.65rem] tracking-[0.3em] uppercase text-ash/70">
          {whenLabel(reply.delivered_at)}
        </span>
      </header>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="mt-4 text-left w-full text-sm italic text-ash hover:text-ink transition-colors duration-500"
      >
        {open ? 'Close letter' : 'Open letter'}
      </button>

      {open && (
        <div className="mt-5 flex flex-col gap-5 fade-in-slow">
          <p className="font-serif text-base leading-loose text-ink/90 whitespace-pre-wrap">
            {reply.text_content}
          </p>

          {reply.voice_url && (
            <div className="flex items-center gap-4 border-t border-ash/15 pt-4">
              <button
                type="button"
                onClick={togglePlay}
                className="w-12 h-12 rounded-full border border-ash/40 hover:border-ink/70 transition-colors duration-700 flex items-center justify-center text-ink"
                aria-label={playing ? 'Pause' : 'Play'}
              >
                {playing ? (
                  <span className="flex gap-1">
                    <span className="block w-0.5 h-4 bg-ink" />
                    <span className="block w-0.5 h-4 bg-ink" />
                  </span>
                ) : (
                  <span className="block w-0 h-0 border-y-[7px] border-y-transparent border-l-[10px] border-l-ink translate-x-0.5" />
                )}
              </button>
              <p className="text-[0.65rem] tracking-[0.3em] uppercase text-ash">
                Listen — they kept your voice.
              </p>
              <audio
                ref={audioRef}
                src={reply.voice_url}
                onEnded={() => setPlaying(false)}
                preload="auto"
                crossOrigin="anonymous"
              />
            </div>
          )}
        </div>
      )}
    </article>
  );
}
