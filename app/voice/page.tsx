import { Caption, Headline, Stage, Whisper } from '@/components/Stage';
import { VoiceRecorder } from '@/components/VoiceRecorder';

export default function VoicePage() {
  return (
    <Stage>
      <Caption>Step Two</Caption>
      <Headline>Now let&apos;s hear your voice.</Headline>
      <Whisper>What might your voice sound like in the future?</Whisper>
      <VoiceRecorder />
    </Stage>
  );
}
