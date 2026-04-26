'use client';
import { useState } from 'react';

export function CopyBlock({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2400);
    } catch {
      // Clipboard blocked — user will manually select. No error UX needed.
    }
  }

  return (
    <div className="relative border border-ash/20 fade-in-delayed">
      <button
        type="button"
        onClick={copy}
        className="absolute top-4 right-4 text-[0.65rem] tracking-[0.3em] uppercase text-ash hover:text-ink transition-colors duration-700"
      >
        {copied ? 'Copied' : 'Copy'}
      </button>
      <pre className="whitespace-pre-wrap font-serif text-sm md:text-base text-ink/85 leading-loose p-8 pt-12 max-h-[24rem] overflow-y-auto">
        {text}
      </pre>
    </div>
  );
}
