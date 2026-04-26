import { Caption, Headline, Stage, Whisper } from '@/components/Stage';
import { BeginForm } from '@/components/BeginForm';

export default function BeginPage() {
  return (
    <Stage>
      <Caption>Step One</Caption>
      <Headline>Pick a photo of yourself that feels most like you.</Headline>
      <Whisper>
        Let&apos;s imagine what you might look like in the future.
      </Whisper>

      <BeginForm />

      <p className="text-xs text-ash/60 text-center fade-in-delayed mt-8 leading-loose">
        Your words and photos stay private. They are never used for training.
      </p>
    </Stage>
  );
}
