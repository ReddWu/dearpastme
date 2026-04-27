import Link from 'next/link';
import { redirect } from 'next/navigation';
import { JournalComposer } from '@/components/JournalComposer';
import { JournalEntryList, type JournalSidebarEntry } from '@/components/JournalEntryList';
import { JournalReplyMail, type DeliveredReply } from '@/components/JournalReplyMail';
import { requireUserId } from '@/lib/session';
import { supabaseRoute } from '@/lib/supabase/route';
import { type Branch } from '@/lib/types';

export const dynamic = 'force-dynamic';

type EntryRow = {
  id: string;
  content: string;
  created_at: string;
  recipient: Branch | 'all';
  weather: string | null;
  mood: string | null;
  reply_id: string | null;
};

type ReplyRow = {
  id: string;
  from_branch: Branch;
  text_content: string;
  voice_url: string | null;
  delivered_at: string;
};

type MarkKind = 'want_to_become' | 'afraid_of';

export default async function JournalPage() {
  const userId = await requireUserId().catch(() => null);
  if (!userId) redirect('/begin');

  const sb = await supabaseRoute();
  const nowIso = new Date().toISOString();

  const [{ data: futures }, { data: marks }, { data: entries }, { data: replies }] = await Promise.all([
    sb
      .from('futures')
      .select('id, branch, generation_round')
      .eq('user_id', userId)
      .order('generation_round', { ascending: false }),
    sb
      .from('future_marks')
      .select('future_id, mark')
      .eq('user_id', userId),
    sb
      .from('journal_entries')
      .select('id, content, created_at, recipient, weather, mood, reply_id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(40),
    // Only show replies whose delivery moment has actually arrived. Anything
    // scheduled for the future stays sealed in the inbox until its time.
    sb
      .from('replies')
      .select('id, from_branch, text_content, voice_url, delivered_at')
      .eq('user_id', userId)
      .lte('delivered_at', nowIso)
      .order('delivered_at', { ascending: false })
      .limit(20),
  ]);

  if (!futures?.length) redirect('/generating');

  const latestRound = futures[0].generation_round;
  const currentFutures = futures.filter((f) => f.generation_round === latestRound);
  const marksByBranch = currentFutures
    .map((future) => {
      const m = marks?.find((it) => it.future_id === future.id)?.mark as MarkKind | undefined;
      return m ? { branch: future.branch as Branch, mark: m } : null;
    })
    .filter((it): it is { branch: Branch; mark: MarkKind } => Boolean(it));

  const sidebarEntries: JournalSidebarEntry[] = ((entries ?? []) as EntryRow[]).map((e) => ({
    id: e.id,
    content: e.content,
    recipient: e.recipient,
    weather: e.weather,
    mood: e.mood,
    created_at: e.created_at,
    has_reply: Boolean(e.reply_id),
  }));

  const inboxReplies: DeliveredReply[] = ((replies ?? []) as ReplyRow[]).map((r) => ({
    id: r.id,
    from_branch: r.from_branch,
    text_content: r.text_content,
    voice_url: r.voice_url,
    delivered_at: r.delivered_at,
  }));

  return (
    <main className="min-h-screen px-6 md:px-10 lg:px-16 py-10">
      {/* Top bar — minimal, Medium-flavored */}
      <header className="flex items-baseline justify-between border-b border-ash/15 pb-6 mb-12">
        <div className="flex items-baseline gap-6">
          <h1 className="text-base tracking-[0.4em] uppercase text-ink">Journal</h1>
          <Link
            href="/futures"
            className="text-[0.65rem] tracking-[0.35em] uppercase text-ash hover:text-ink transition-colors duration-700"
          >
            See them again
          </Link>
        </div>
        <p className="text-[0.65rem] tracking-[0.35em] uppercase text-ash/70 hidden md:block">
          Not every page will be answered.
        </p>
      </header>

      <div className="grid gap-12 lg:grid-cols-[20rem_minmax(0,1fr)]">
        {/* LEFT: previous pages */}
        <aside className="flex flex-col gap-8">
          <div className="flex flex-col gap-2">
            {/* Browser translate / annotation extensions inject attributes
                like xt-marked="ok" onto plain text paragraphs in this region.
                suppressHydrationWarning only covers one level, so add it on
                each <p> the extension actually touches. */}
            <p className="text-[0.65rem] tracking-[0.35em] uppercase text-ash" suppressHydrationWarning>Previous Pages</p>
            <p className="text-xs italic text-ash/60" suppressHydrationWarning>
              The room remembers in reverse.
            </p>
          </div>
          <JournalEntryList entries={sidebarEntries} />
        </aside>

        {/* RIGHT: composer + inbox */}
        <section className="flex flex-col gap-16 max-w-2xl">
          <JournalComposer marks={marksByBranch} />
          <JournalReplyMail replies={inboxReplies} />
        </section>
      </div>
    </main>
  );
}
