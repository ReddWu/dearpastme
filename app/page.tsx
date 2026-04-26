import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6">
      <p className="fade-in-slow text-2xl md:text-3xl tracking-wide text-ink text-center font-light">
        Some letters take ten years to arrive.
      </p>
      <Link
        href="/begin"
        className="fade-in-delayed mt-20 text-[0.7rem] tracking-[0.4em] uppercase text-ash hover:text-ink transition-colors duration-700"
      >
        Begin.
      </Link>
    </main>
  );
}
