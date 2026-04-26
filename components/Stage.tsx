import type { ReactNode } from 'react';

type StageProps = {
  children: ReactNode;
  align?: 'center' | 'top';
  width?: 'narrow' | 'wide';
};

export function Stage({ children, align = 'center', width = 'narrow' }: StageProps) {
  const wMax = width === 'narrow' ? 'max-w-2xl' : 'max-w-5xl';
  const justify = align === 'center' ? 'justify-center' : 'justify-start pt-32';
  return (
    <main className={`min-h-screen flex flex-col items-center ${justify} px-6`}>
      <div className={`w-full ${wMax} flex flex-col items-stretch gap-12`}>
        {children}
      </div>
    </main>
  );
}

export function Caption({ children }: { children: ReactNode }) {
  return (
    <p className="text-[0.7rem] tracking-[0.4em] uppercase text-ash text-center fade-in-slow">
      {children}
    </p>
  );
}

export function Headline({ children }: { children: ReactNode }) {
  return (
    <p className="text-2xl md:text-3xl leading-relaxed tracking-wide text-ink text-center font-light fade-in-slow">
      {children}
    </p>
  );
}

export function Whisper({ children }: { children: ReactNode }) {
  return (
    <p className="text-sm text-ash text-center italic fade-in-delayed leading-relaxed">
      {children}
    </p>
  );
}

export function HairlineButton({
  children,
  type = 'button',
  disabled,
  onClick,
}: {
  children: ReactNode;
  type?: 'button' | 'submit';
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className="self-center text-[0.7rem] tracking-[0.4em] uppercase text-ash hover:text-ink disabled:opacity-30 disabled:hover:text-ash transition-colors duration-700"
    >
      {children}
    </button>
  );
}
