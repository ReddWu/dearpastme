import { Caption, Headline, Stage, Whisper } from '@/components/Stage';
import { VoiceRecorder } from '@/components/VoiceRecorder';

export default function VoicePage() {
  return (
    <Stage>
      <Caption>Step Two</Caption>
      <Headline>Now, lend me a piece of your voice.</Headline>
      <Whisper>The future you will speak to you in this voice.</Whisper>
      <VoiceRecorder />
    </Stage>
  );
}
