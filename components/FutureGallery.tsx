'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { Branch } from '@/lib/types';
import { BRANCH_LABEL } from '@/lib/types';

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
};

export function FutureGallery({ futures }: { futures: FutureCard[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const open = futures.find((f) => f.id === openId) ?? null;

  return (
    <div className="flex flex-col gap-20">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 fade-in-slow">
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
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-base text-ink tracking-wide">{BRANCH_LABEL[f.branch]}</span>
              <span className="text-[0.65rem] tracking-[0.3em] uppercase text-ash group-hover:text-ink transition-colors duration-700">
                Open
              </span>
            </div>
          </button>
        ))}
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

        <p className="font-serif text-lg leading-loose text-ink/90 whitespace-pre-wrap">
          {future.life_description}
        </p>

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
