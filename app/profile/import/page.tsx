import { Caption, Headline, Stage, Whisper } from '@/components/Stage';
import { ImportForm } from '@/components/ImportForm';

const LLM_PROMPT = `Based on everything you know about me — the things I've mentioned, complained about, hesitated on, and returned to again and again across our conversations — please fill out the profile below about me, in second person ("you").

No pleasantries. No comfort. No openings like "based on what you've shared." Just write directly.

If you're not sure about a section, infer from the strongest signal you can observe and tag it [inferred]. Don't leave anything blank.

[The Current You]
Three sentences describing this person's life right now. Include: what they're doing, who they're connected to, the inner motif.

[If Nothing Changes]
If this person makes no active changes and continues on the current track, what's most likely to happen in the next five to ten years? Three concrete details that can be pictured.

[The Thing You Keep Putting Off]
The one thing this person keeps bringing up, circling around, finding reasons to delay. Just one — the biggest one.

[Where You Stop Choosing]
In what areas does this person "neither actively choose nor actively refuse"? List two or three concrete domains (love, career, family, health, geography), and how they show up in each.

[What You Think About Late At Night]
Describe one specific scene: at 4 AM on a sleepless night, what does this person think about — a thing, a person, an image? Specific enough to be filmed.

[The Unspoken Want]
A want this person won't admit out loud, but their behavior reveals?

[The Things You Reach For]
The specific things this person actually reaches for when no one is watching and they don't have to perform. Be concrete and use names. Music they put on alone, food they cook or order without thinking, the kind of book they stay up reading, the niche internet they go down at 1 AM, sports or movement they actually do (or watch), places they keep coming back to (cities, neighborhoods, kinds of rooms), the body of work they would save first. Five to eight specific items. Names, not categories — "Mitski and old Frank Ocean" beats "indie music"; "tonkotsu ramen and Sichuan dry pot" beats "Asian food"; "long walks in Mission at dusk" beats "exploring the city".

When done, do not summarize. Do not ask if it's accurate. Just stop.`;

export default function ProfileImportPage() {
  return (
    <Stage align="top" width="wide">
      <Caption>Step Three</Caption>
      <Headline>Now let&apos;s build a profile of who you are.</Headline>
      <Whisper>
        You can ask an AI that knows you well, or answer the questions yourself.
      </Whisper>
      <ImportForm prompt={LLM_PROMPT} />
    </Stage>
  );
}
