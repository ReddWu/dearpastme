'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

const RECITAL = [
  'Read this aloud, slowly, in your normal voice — about a minute.',
  '',
  '"Today\'s me is leaving this voice for the you of ten years from now.',
  'I don\'t know what city you\'ll be in, or who is still beside you.',
  'I just want to say one thing, while I can still speak — ',
  'that thing the two of us never got around to doing,',
  'if you finally did it, I thank you on behalf of who I am today.',
  'And if you didn\'t, that\'s all right too.',
  'At least this voice has reached you."',
];

const TARGET_SECONDS = 60;
const MIN_SECONDS = 30;

type State = 'idle' | 'recording' | 'review' | 'uploading' | 'error';

export function VoiceRecorder() {
  const router = useRouter();
  const [state, setState] = useState<State>('idle');
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const blobRef = useRef<Blob | null>(null);
  const tickRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (tickRef.current) window.clearInterval(tickRef.current);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
  }, [audioUrl]);

  async function start() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        blobRef.current = blob;
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        setState('review');
        stream.getTracks().forEach((t) => t.stop());
      };
      recorder.start();
      recorderRef.current = recorder;
      setState('recording');
      setSeconds(0);
      tickRef.current = window.setInterval(() => {
        setSeconds((s) => {
          const next = s + 1;
          if (next >= TARGET_SECONDS && recorder.state === 'recording') {
            recorder.stop();
          }
          return next;
        });
      }, 1000);
    } catch {
      setError('No microphone access. Check the browser permission and try again.');
      setState('error');
    }
  }

  function stop() {
    if (tickRef.current) { window.clearInterval(tickRef.current); tickRef.current = null; }
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
  }

  function discard() {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    blobRef.current = null;
    setSeconds(0);
    setState('idle');
  }

  async function submit() {
    if (!blobRef.current) return;
    setState('uploading');
    setError(null);
    try {
      const fd = new FormData();
      fd.append('audio', blobRef.current, 'sample.webm');
      const res = await fetch('/api/voice', { method: 'POST', body: fd });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'The voice never arrived.');
      }
      router.push('/profile/import');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The voice never arrived.');
      setState('review');
    }
  }

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');

  return (
    <div className="flex flex-col items-center gap-10">
      <pre className="whitespace-pre-wrap font-serif text-base md:text-lg text-ink/90 leading-loose text-center max-w-xl fade-in-slow">
        {RECITAL.join('\n')}
      </pre>

      <div className="flex flex-col items-center gap-6 fade-in-delayed">
        {state === 'idle' && (
          <button
            type="button"
            onClick={start}
            className="text-[0.7rem] tracking-[0.4em] uppercase text-ash hover:text-ink transition-colors duration-700 border border-ash/30 hover:border-ink/40 px-10 py-4"
          >
            Begin recording.
          </button>
        )}

        {state === 'recording' && (
          <div className="flex flex-col items-center gap-6">
            <div className="text-3xl tracking-widest text-ink tabular-nums">{mm}:{ss}</div>
            <div className="text-xs tracking-[0.3em] uppercase text-ash">
              Listening · stops automatically in {TARGET_SECONDS - seconds}s
            </div>
            <button
              type="button"
              onClick={stop}
              disabled={seconds < MIN_SECONDS}
              className="text-[0.7rem] tracking-[0.4em] uppercase text-ash hover:text-ink disabled:opacity-30 disabled:hover:text-ash transition-colors duration-700"
            >
              {seconds < MIN_SECONDS ? `${MIN_SECONDS - seconds}s more` : 'End recording.'}
            </button>
          </div>
        )}

        {state === 'review' && audioUrl && (
          <div className="flex flex-col items-center gap-6">
            <audio src={audioUrl} controls className="w-72" />
            <div className="flex gap-12">
              <button
                type="button"
                onClick={discard}
                className="text-[0.7rem] tracking-[0.4em] uppercase text-ash hover:text-ink transition-colors duration-700"
              >
                Re-record.
              </button>
              <button
                type="button"
                onClick={submit}
                className="text-[0.7rem] tracking-[0.4em] uppercase text-ink hover:text-vellum transition-colors duration-700"
              >
                Send forward.
              </button>
            </div>
          </div>
        )}

        {state === 'uploading' && (
          <p className="text-sm text-ash italic">Your voice is being kept. One moment...</p>
        )}

        {error && <p className="text-sm text-ash/80 italic">{error}</p>}
      </div>
    </div>
  );
}
