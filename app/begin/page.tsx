import { Caption, Headline, Stage, Whisper } from '@/components/Stage';
import { BeginForm } from '@/components/BeginForm';

export default function BeginPage() {
  return (
    <Stage>
      <Caption>Step One</Caption>
      <Headline>First, lend me a recent photo of your face.</Headline>
      <Whisper>
        Three future versions of you will grow out of this photograph.
      </Whisper>

      <BeginForm />

      <p className="text-xs text-ash/60 text-center fade-in-delayed mt-8 leading-loose">
        Every word you write and every photo you send is never read, and never used for training.
        They belong only to the future you.
      </p>
    </Stage>
  );
}
