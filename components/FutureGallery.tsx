'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import type { Branch, FutureMoment } from '@/lib/types';
import { BRANCH_LABEL } from '@/lib/types';
import { saveFutureVision, type VisionEligibility } from '@/app/actions/vision';

// XTTS hands back the user's voice as it sounds today. We age it in the
// browser at playback time: pitch-down (via playbackRate + preservesPitch:false)
// for a heavier, older register; lowpass to roll off the high end the way
// older voices lose top sparkle; gain trim on the most weathered branch.
type AgeProfile = { rate: number; lowpass: number; gain: number };
const AGE: Record<Branch, AgeProfile> = {
  flowing:  { rate: 0.92, lowpass: 4200, gain: 1.00 }, // softly tired
  realized: { rate: 0.94, lowpass: 5000, gain: 1.00 }, // alert but heavier
  drifting: { rate: 0.86, lowpass: 3200, gain: 0.92 }, // most aged, drifty
};

export type FutureCard = {
  id: string;
  branch: Branch;
  image_url: string;
  life_description: string;
  letter: string;
  voice_message_text: string;
  voice_message_url: string;
  // The user's revised vision text (overrides life_description for display
  // on the chosen card) and whether this card is the one they marked
  // want_to_become. Together they unlock the hidden click-to-edit on the
  // chosen card without exposing any UI affordance until clicked.
  vision: string | null;
  is_chosen_vision: boolean;
};

export function FutureGallery({
  futures,
  moments,
}: {
  futures: FutureCard[];
  moments: FutureMoment[];
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [openMomentId, setOpenMomentId] = useState<string | null>(null);
  const open = futures.find((f) => f.id === openId) ?? null;
  const openMoment = moments.find((m) => m.id === openMomentId) ?? null;
  const topMoments = moments.slice(0, 4);
  const bottomMoments = moments.slice(4);

  return (
    <div className="flex flex-col gap-20">
      <div className="flex flex-col gap-10 fade-in-slow">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5 xl:gap-6">
          {topMoments.map((moment) => (
            <button
              key={moment.id}
              type="button"
              onClick={() => setOpenMomentId(moment.id)}
              className="group flex flex-col gap-3 text-left"
            >
              <div className="relative aspect-[3/4] overflow-hidden bg-ash/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={moment.image_url}
                  alt=""
                  className="w-full h-full object-cover transition-all duration-1000 grayscale-[8%] group-hover:grayscale-0 group-hover:scale-[1.02]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent" />
                <span className="absolute left-3 bottom-3 text-[0.55rem] tracking-[0.28em] uppercase text-vellum/80">
                  Glimpse
                </span>
              </div>
            </button>
          ))}
        </div>

        <div className="flex flex-col items-center gap-4">
          <p className="text-[0.65rem] tracking-[0.35em] uppercase text-ash/80 text-center">
            The Three That Speak
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 xl:gap-10 w-full">
            {futures.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setOpenId(f.id)}
                className="group flex flex-col gap-4 text-left"
              >
                <div className="relative aspect-[3/4] overflow-hidden bg-ash/10">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={f.image_url}
                    alt={BRANCH_LABEL[f.branch]}
                    className="w-full h-full object-cover transition-all duration-1000 grayscale-[15%] group-hover:grayscale-0 group-hover:scale-[1.02]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                  <span className="absolute left-4 top-4 text-[0.55rem] tracking-[0.3em] uppercase text-vellum/85 border border-vellum/20 px-2 py-1 bg-black/20">
                    Voice + Letter
                  </span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-base text-ink tracking-wide">{BRANCH_LABEL[f.branch]}</span>
                  <span className="text-[0.65rem] tracking-[0.3em] uppercase text-ash group-hover:text-ink transition-colors duration-700">
                    Open story
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-5 xl:gap-6">
          {bottomMoments.map((moment) => (
            <button
              key={moment.id}
              type="button"
              onClick={() => setOpenMomentId(moment.id)}
              className="group flex flex-col gap-3 text-left"
            >
              <div className="relative aspect-[3/4] overflow-hidden bg-ash/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={moment.image_url}
                  alt=""
                  className="w-full h-full object-cover transition-all duration-1000 grayscale-[8%] group-hover:grayscale-0 group-hover:scale-[1.02]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent" />
                <span className="absolute left-3 bottom-3 text-[0.55rem] tracking-[0.28em] uppercase text-vellum/80">
                  Glimpse
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-center">
        <Link
          href="/mark"
          className="text-[0.7rem] tracking-[0.4em] uppercase text-ash hover:text-ink transition-colors duration-700"
        >
          I have seen them all.
        </Link>
      </div>

      {open && <FutureDrawer future={open} onClose={() => setOpenId(null)} />}
      {openMoment && <MomentDrawer moment={openMoment} onClose={() => setOpenMomentId(null)} />}
    </div>
  );
}

function FutureDrawer({
  future,
  onClose,
}: { future: FutureCard; onClose: () => void }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const wiredRef = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  // Tear down the AudioContext when the drawer unmounts so we don't leak
  // a node graph per branch the user opens.
  useEffect(() => () => {
    ctxRef.current?.close().catch(() => {});
    ctxRef.current = null;
    wiredRef.current = false;
  }, []);

  const wireAging = useCallback(() => {
    if (wiredRef.current) return;
    const audio = audioRef.current;
    if (!audio) return;
    const settings = AGE[future.branch];

    // playbackRate without preservesPitch is what actually drops the pitch.
    // Setting both Chrome's and Safari's flag covers the field.
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

    // Optional: roll off the highs through Web Audio for a warmer, older
    // timbre. If MediaElementAudioSourceNode isn't available, the raw audio
    // still plays through the element with the pitch shift applied.
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
      // MediaElementAudioSourceNode can only be created once per element;
      // any error here just means we fall back to the pitch-only path.
    }
    wiredRef.current = true;
  }, [future.branch]);

  async function togglePlay() {
    const a = audioRef.current;
    if (!a) return;
    wireAging();
    if (ctxRef.current?.state === 'suspended') {
      await ctxRef.current.resume().catch(() => {});
    }
    if (a.paused) {
      try { await a.play(); setPlaying(true); setRevealed(true); }
      catch { setPlaying(false); }
    } else {
      a.pause();
      setPlaying(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 overflow-y-auto fade-in-slow"
      onClick={onClose}
    >
      <div
        className="min-h-screen w-full max-w-3xl mx-auto px-8 py-20 flex flex-col gap-16"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="self-end text-[0.65rem] tracking-[0.3em] uppercase text-ash hover:text-ink transition-colors duration-700"
        >
          Close
        </button>

        <div className="flex flex-col items-center gap-3">
          <span className="text-[0.7rem] tracking-[0.4em] uppercase text-ash">
            {BRANCH_LABEL[future.branch]}
          </span>
        </div>

        <div className="aspect-[3/4] max-w-md mx-auto w-full overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={future.image_url} alt="" className="w-full h-full object-cover" />
        </div>

        {future.is_chosen_vision ? (
          <VisionParagraph
            futureId={future.id}
            initialText={future.vision ?? future.life_description}
          />
        ) : (
          <p className="font-serif text-lg leading-loose text-ink/90 whitespace-pre-wrap">
            {future.life_description}
          </p>
        )}

        <div className="border-t border-ash/20 pt-12">
          <p className="font-serif italic text-lg leading-loose text-vellum whitespace-pre-wrap">
            {future.letter}
          </p>
        </div>

        <div className="border-t border-ash/20 pt-12 flex flex-col items-center gap-6">
          <audio
            ref={audioRef}
            src={future.voice_message_url}
            onEnded={() => setPlaying(false)}
            preload="auto"
            // REQUIRED for Web Audio. Without this attribute, MediaElementAudioSourceNode
            // taints cross-origin audio (Supabase storage → another origin) and the entire
            // graph silently outputs zero. Setting this on the element forces the browser
            // to do a CORS fetch; Supabase public buckets reply with permissive headers,
            // so the source stays clean and audible through our pitch-down chain.
            crossOrigin="anonymous"
          />
          <button
            type="button"
            onClick={togglePlay}
            className="w-20 h-20 rounded-full border border-ash/40 hover:border-ink/70 transition-colors duration-700 flex items-center justify-center text-ink"
            aria-label={playing ? 'Pause' : 'Play'}
          >
            {playing ? (
              <span className="flex gap-1.5">
                <span className="block w-1 h-6 bg-ink" />
                <span className="block w-1 h-6 bg-ink" />
              </span>
            ) : (
              <span className="block w-0 h-0 border-y-[10px] border-y-transparent border-l-[14px] border-l-ink translate-x-0.5" />
            )}
          </button>

          <p
            className={`font-serif text-xl md:text-2xl leading-relaxed text-center transition-opacity duration-1000 max-w-lg ${
              revealed ? 'opacity-100 text-ink' : 'opacity-30 text-ash'
            }`}
          >
            {revealed ? future.voice_message_text : 'Press play. Hear them say it.'}
          </p>
        </div>
      </div>
    </div>
  );
}

function MomentDrawer({
  moment,
  onClose,
}: { moment: FutureMoment; onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 overflow-y-auto fade-in-slow"
      onClick={onClose}
    >
      <div
        className="min-h-screen w-full max-w-5xl mx-auto px-8 py-20 flex flex-col gap-10"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="self-end text-[0.65rem] tracking-[0.3em] uppercase text-ash hover:text-ink transition-colors duration-700"
        >
          Close
        </button>

        <div className="flex justify-center">
          <span className="text-[0.7rem] tracking-[0.4em] uppercase text-ash">
            {BRANCH_LABEL[moment.branch]}
          </span>
        </div>

        <div className="w-full max-w-3xl mx-auto overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={moment.image_url} alt="" className="w-full h-auto object-cover" />
        </div>
      </div>
    </div>
  );
}

// Hidden click-to-edit. The paragraph looks like every other paragraph
// — no pencil, no border, no hint. Hovering it changes the cursor to a
// text caret as the only quiet signal that it can be touched. Clicking
// flips it into a textarea; saving calls the server action which is
// where the once-per-month + 15-day rule actually lives. The rule is
// only revealed (as a single inline line) if the server rejects the
// save, never before.
function VisionParagraph({
  futureId,
  initialText,
}: {
  futureId: string;
  initialText: string;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(initialText);
  const [draft, setDraft] = useState(initialText);
  const [lockMessage, setLockMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function startEdit() {
    setLockMessage(null);
    setDraft(text);
    setEditing(true);
  }

  function cancel() {
    setDraft(text);
    setEditing(false);
  }

  function save() {
    setLockMessage(null);
    startTransition(async () => {
      try {
        const result = await saveFutureVision({ futureId, text: draft });
        if (result.ok) {
          setText(draft);
          setEditing(false);
        } else {
          setLockMessage(describeLock(result));
        }
      } catch (err) {
        setLockMessage(err instanceof Error ? err.message : 'Save got lost.');
      }
    });
  }

  if (!editing) {
    return (
      <p
        onClick={startEdit}
        className="font-serif text-lg leading-loose text-ink/90 whitespace-pre-wrap cursor-text"
      >
        {text}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <textarea
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        rows={Math.max(8, Math.min(20, draft.split('\n').length + 4))}
        className="w-full bg-transparent border border-ash/25 focus:border-ink/40 outline-none p-5 text-ink/95 leading-loose font-serif text-lg resize-y"
      />
      <div className="flex items-center justify-between gap-4">
        <p className="text-xs italic text-ash/70 min-h-4">
          {lockMessage ?? ''}
        </p>
        <div className="flex items-center gap-6">
          <button
            type="button"
            onClick={cancel}
            disabled={isPending}
            className="text-[0.7rem] tracking-[0.4em] uppercase text-ash hover:text-ink disabled:opacity-30 transition-colors duration-700"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={isPending || draft.trim().length < 12}
            className="text-[0.7rem] tracking-[0.4em] uppercase text-ink hover:text-vellum disabled:opacity-30 disabled:hover:text-ink transition-colors duration-700"
          >
            {isPending ? 'Keeping it…' : 'Keep this vision'}
          </button>
        </div>
      </div>
    </div>
  );
}

function describeLock(r: VisionEligibility): string {
  if (r.ok) return '';
  if (r.reason === 'edited_this_month') {
    return 'You revised this already this month. The next chance opens on the first of next month.';
  }
  if (r.reason === 'not_enough_days') {
    const remaining = r.needed - r.daysSoFar;
    return `Re-editing opens after writing ${r.needed} days here this month. ${r.daysSoFar} so far — ${remaining} more to go.`;
  }
  if (r.reason === 'not_chosen') {
    return 'This isn\'t the self you marked.';
  }
  return 'Cannot revise this right now.';
}
