import { Caption, Headline, Stage, Whisper } from '@/components/Stage';
import { CopyBlock } from '@/components/CopyBlock';
import { ImportForm } from '@/components/ImportForm';

const LLM_PROMPT = `Based on everything you know about me — the things I've mentioned, complained about, hesitated on, and returned to again and again across our conversations — please fill out the profile below about me, in second person ("you").

No pleasantries. No comfort. No openings like "based on what you've shared." Just write directly.

If you're not sure about a section, infer from the strongest signal you can observe and tag it [inferred]. Don't leave anything blank.

[The Current You]
Three sentences describing this person's life right now. Include: what they're doing, who they're connected to, the inner motif.

[Inertia]
If this person makes no active changes and continues on the current track, what's most likely to happen in the next five to ten years? Three concrete details that can be pictured.

[The Thing You Keep Wanting To Do]
The one thing this person keeps bringing up, circling around, finding reasons to delay. Just one — the biggest one.

[Passive Mode]
In what areas does this person "neither actively choose nor actively refuse"? List two or three concrete domains (love, career, family, health, geography), and how they show up in each.

[What You Think About Late At Night]
Describe one specific scene: at 4 AM on a sleepless night, what does this person think about — a thing, a person, an image? Specific enough to be filmed.

[The Unspoken Want]
A want this person won't admit out loud, but their behavior reveals?

When done, do not summarize. Do not ask if it's accurate. Just stop.`;

export default function ProfileImportPage() {
  return (
    <Stage align="top" width="wide">
      <Caption>Step Three</Caption>
      <Headline>Bring back a profile of you.</Headline>
      <Whisper>
        Open the AI you talk to most — the one that has seen you.
        Paste the passage below into it, and ask it to write a profile of you.
        Then paste its full reply back here.
      </Whisper>

      <CopyBlock text={LLM_PROMPT} />

      <ImportForm />
    </Stage>
  );
}
