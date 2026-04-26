import Link from 'next/link';
import { redirect } from 'next/navigation';
import { JournalComposer } from '@/components/JournalComposer';
import { Caption, Headline, Stage, Whisper } from '@/components/Stage';
import { requireUserId } from '@/lib/session';
import { supabaseRoute } from '@/lib/supabase/route';
import { BRANCHES, BRANCH_LABEL, type Branch } from '@/lib/types';

export const dynamic = 'force-dynamic';

type JournalEntry = {
  id: string;
  content: string;
  created_at: string;
  recipient: Branch | 'all';
};

type MarkKind = 'want_to_become' | 'afraid_of';

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function recipientLabel(recipient: Branch | 'all') {
  return recipient === 'all' ? 'All of them' : BRANCH_LABEL[recipient];
}

export default async function JournalPage() {
  const userId = await requireUserId().catch(() => null);
  if (!userId) redirect('/begin');

  const sb = await supabaseRoute();
  const [{ data: futures }, { data: marks }, { data: entries }] = await Promise.all([
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
      .select('id, content, created_at, recipient')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(24),
  ]);

  if (!futures?.length) redirect('/generating');

  const latestRound = futures[0].generation_round;
  const currentFutures = BRANCHES
    .map((branch) => futures.find((future) => future.branch === branch && future.generation_round === latestRound))
    .filter((future): future is NonNullable<typeof future> => Boolean(future));

  const marksByBranch = currentFutures
    .map((future) => {
      const mark = marks?.find((item) => item.future_id === future.id)?.mark as MarkKind | undefined;
      return mark ? { branch: future.branch as Branch, mark } : null;
    })
    .filter((item): item is { branch: Branch; mark: MarkKind } => Boolean(item));

  const history = (entries ?? []) as JournalEntry[];

  return (
    <Stage align="top" width="wide">
      <div className="flex flex-col gap-4 items-center">
        <Caption>Journal</Caption>
        <Headline>From today, you can write to any of the three of them.</Headline>
        <Whisper>
          Some pages will sleep in the dark. Some will wake something up.
          You are not told which is which.
        </Whisper>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)] fade-in-delayed">
        <JournalComposer marks={marksByBranch} />

        <aside className="flex flex-col gap-6 border border-ash/15 bg-ash/[0.03] p-6 md:p-8">
          <div className="flex flex-col gap-2">
            <p className="text-[0.65rem] tracking-[0.35em] uppercase text-ash">
              The Rule
            </p>
            <p className="text-base leading-loose text-ink/90">
              Not every page earns a reply. If one comes, it may come from the future
              you expected, or from the one you never meant to feed.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <p className="text-[0.65rem] tracking-[0.35em] uppercase text-ash">
              The Ones You Marked
            </p>
            {marksByBranch.length ? (
              <div className="flex flex-col gap-3">
                {marksByBranch.map((item) => (
                  <div key={`${item.branch}-${item.mark}`} className="border border-ash/15 px-4 py-4">
                    <p className="text-[0.68rem] tracking-[0.3em] uppercase text-ink">
                      {BRANCH_LABEL[item.branch]}
                    </p>
                    <p className="mt-2 text-sm italic text-ash">
                      {item.mark === 'want_to_become' ? 'The one you chose.' : 'The one you feared.'}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm italic text-ash">
                You left them unnamed. The room still listens.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2 border-t border-ash/15 pt-6">
            <p className="text-[0.65rem] tracking-[0.35em] uppercase text-ash">
              Return
            </p>
            <Link
              href="/futures"
              className="text-[0.7rem] tracking-[0.4em] uppercase text-ash hover:text-ink transition-colors duration-700"
            >
              See them again.
            </Link>
          </div>
        </aside>
      </div>

      <section className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <p className="text-[0.65rem] tracking-[0.35em] uppercase text-ash text-center">
            Previous Pages
          </p>
          <p className="text-sm italic text-ash text-center">
            The room remembers in reverse.
          </p>
        </div>

        {history.length ? (
          <div className="flex flex-col gap-4">
            {history.map((entry) => (
              <article
                key={entry.id}
                className="border border-ash/15 bg-ash/[0.02] px-5 py-5 md:px-6 md:py-6"
              >
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <p className="text-[0.65rem] tracking-[0.35em] uppercase text-ash">
                    To {recipientLabel(entry.recipient)}
                  </p>
                  <p className="text-xs text-ash/70">{formatDate(entry.created_at)}</p>
                </div>
                <p className="mt-4 whitespace-pre-wrap text-base leading-loose text-ink/90">
                  {entry.content}
                </p>
              </article>
            ))}
          </div>
        ) : (
          <div className="border border-ash/15 bg-ash/[0.02] px-6 py-10 text-center">
            <p className="text-base leading-loose text-ink/90">
              The first page has not been left here yet.
            </p>
          </div>
        )}
      </section>
    </Stage>
  );
}
