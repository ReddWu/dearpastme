import Link from 'next/link';
import { Caption, Headline, Stage, Whisper } from '@/components/Stage';

export default function JournalPage() {
  return (
    <Stage>
      <Caption>Journal · Coming into focus</Caption>
      <Headline>From today, you can write to any one of the three of them.</Headline>
      <Whisper>
        This room is still being built. In the next stage, every entry you write
        might bring back a reply from one of the futures, days later — or it might not.
        That unpredictability is the rule of this place.
      </Whisper>
      <p className="text-xs text-ash/60 text-center fade-in-delayed mt-8 leading-loose">
        Every word you write is never read, and never used for training.
        They belong only to the future you.
      </p>
      <div className="flex justify-center mt-8 fade-in-delayed">
        <Link
          href="/futures"
          className="text-[0.7rem] tracking-[0.4em] uppercase text-ash hover:text-ink transition-colors duration-700"
        >
          See them again.
        </Link>
      </div>
    </Stage>
  );
}
