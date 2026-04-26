import { NextResponse } from 'next/server';
import { requireUserId } from '@/lib/session';
import { supabaseRoute } from '@/lib/supabase/route';
import { supabaseServer } from '@/lib/supabase/server';
import { signedUrlAsService, uploadToBucket } from '@/lib/storage';
import { generateFuture } from '@/lib/prompts/generateFuture';
import { generateAgedPortrait, generateFutureMomentAsset, momentCount } from '@/lib/imagen';
import { synthesizeFutureLine } from '@/lib/voice';
import { BRANCHES, type Branch, type FutureContent, type Profile } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 300;

async function findSelfieKey(userId: string): Promise<string> {
  const { data, error } = await supabaseServer().storage
    .from('selfies').list(userId, { limit: 5 });
  if (error || !data?.length) {
    throw new Error('Can\'t find that photo — did /begin get skipped?');
  }
  const self = data.find((f) => f.name.startsWith('self.')) ?? data[0];
  return `${userId}/${self.name}`;
}

async function timed<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const t0 = Date.now();
  try {
    return await fn();
  } finally {
    console.log(`[gen] ${label} ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  }
}

async function generateOne(opts: {
  userId: string;
  branch: Branch;
  content: FutureContent;
  selfieUrl: string;
  referenceAudioUrl: string;
}) {
  const b = opts.branch;
  const branchT0 = Date.now();

  const [portraitAsset, voiceBuf] = await Promise.all([
    timed(`${b}.image`, () => generateAgedPortrait({
      selfieUrl: opts.selfieUrl,
      branch: b,
      imagePrompt: opts.content.image_prompt,
    })),
    timed(`${b}.voice`, () => synthesizeFutureLine({
      referenceAudioUrl: opts.referenceAudioUrl,
      text: opts.content.voice_message,
      branch: b,
    })),
  ]);

  // Mirror outputs into our bucket. Run the portrait fetch + both uploads
  // in parallel — they are independent.
  const portraitBytes = await timed(`${b}.fetch_portrait`,
    () => fetch(portraitAsset.remoteUrl).then((r) => r.arrayBuffer()));

  const [portrait, voice] = await Promise.all([
    timed(`${b}.upload_portrait`, () => uploadToBucket({
      userId: opts.userId,
      bucket: 'futures',
      path: portraitAsset.storagePath,
      body: portraitBytes,
      contentType: portraitAsset.contentType,
    })),
    timed(`${b}.upload_voice`, () => uploadToBucket({
      userId: opts.userId,
      bucket: 'futures',
      path: `${b}/voice.mp3`,
      body: voiceBuf,
      contentType: 'audio/mpeg',
    })),
  ]);

  console.log(`[gen] ${b}.TOTAL ${((Date.now() - branchT0) / 1000).toFixed(1)}s portrait=${portraitBytes.byteLength} voice=${voiceBuf.byteLength}`);

  return {
    branch: b,
    image_url: portrait.publicUrl!,
    life_description: opts.content.life_description,
    letter: opts.content.letter,
    voice_message_text: opts.content.voice_message,
    voice_message_url: voice.publicUrl!,
  };
}

async function generateText(opts: {
  branch: Branch;
  profile: Profile;
}) {
  return timed(`${opts.branch}.glm`, () => generateFuture(opts.profile, opts.branch));
}

async function generateMomentImages(opts: {
  userId: string;
  branch: Branch;
  selfieUrl: string;
  lifeDescription: string;
}) {
  const tasks = Array.from({ length: momentCount(opts.branch) }, (_, momentIndex) => momentIndex)
    .map(async (momentIndex) => {
      const asset = await timed(
        `${opts.branch}.moment_${momentIndex + 1}.image`,
        () => generateFutureMomentAsset({
          selfieUrl: opts.selfieUrl,
          branch: opts.branch,
          lifeDescription: opts.lifeDescription,
          momentIndex,
        }),
      );

      const bytes = await timed(
        `${opts.branch}.moment_${momentIndex + 1}.fetch`,
        () => fetch(asset.remoteUrl).then((r) => r.arrayBuffer()),
      );

      await timed(
        `${opts.branch}.moment_${momentIndex + 1}.upload`,
        () => uploadToBucket({
          userId: opts.userId,
          bucket: 'futures',
          path: asset.storagePath,
          body: bytes,
          contentType: asset.contentType,
        }),
      );
    });

  await Promise.all(tasks);
}

export async function POST() {
  try {
    const userId = await requireUserId();
    const sb = await supabaseRoute();

    const { data: profileRow, error: profErr } = await sb
      .from('profiles').select('*').eq('user_id', userId).single();
    if (profErr || !profileRow) {
      return NextResponse.json({ error: 'Your profile isn\'t ready yet.' }, { status: 400 });
    }
    const profile: Profile = {
      current_self: profileRow.current_self ?? '',
      inertia: profileRow.inertia ?? '',
      the_thing: profileRow.the_thing ?? '',
      passive_mode: profileRow.passive_mode ?? '',
      late_night_scene: profileRow.late_night_scene ?? '',
      unspoken_desire: profileRow.unspoken_desire ?? '',
    };

    const { data: voiceRow, error: voiceErr } = await sb
      .from('voices').select('voice_reference_path').eq('user_id', userId).single();
    if (voiceErr || !voiceRow) {
      return NextResponse.json({ error: 'Your voice isn\'t ready yet.' }, { status: 400 });
    }

    const selfieKey = await findSelfieKey(userId);
    const [selfieUrl, referenceAudioUrl] = await Promise.all([
      signedUrlAsService({ bucket: 'selfies', key: selfieKey, ttlSeconds: 1800 }),
      signedUrlAsService({ bucket: 'voices',  key: voiceRow.voice_reference_path, ttlSeconds: 1800 }),
    ]);

    // Tear down any prior round so /generating is idempotent.
    await sb.from('futures').delete().eq('user_id', userId);

    const pendingBranches: Promise<Awaited<ReturnType<typeof generateOne>>>[] = [];
    const pendingMoments: Promise<void>[] = [];
    for (const branch of BRANCHES) {
      const content = await generateText({ branch, profile });
      pendingBranches.push(generateOne({
        userId,
        branch,
        content,
        selfieUrl,
        referenceAudioUrl,
      }));
      pendingMoments.push(generateMomentImages({
        userId,
        branch,
        selfieUrl,
        lifeDescription: content.life_description,
      }));
    }

    const [results] = await Promise.all([
      Promise.all(pendingBranches),
      Promise.all(pendingMoments),
    ]);

    const insertRows = results.map((r) => ({
      user_id: userId,
      branch: r.branch,
      image_url: r.image_url,
      life_description: r.life_description,
      letter: r.letter,
      voice_message_text: r.voice_message_text,
      voice_message_url: r.voice_message_url,
      generation_round: 1,
    }));
    const { error: insErr } = await sb.from('futures').insert(insertRows as never);
    if (insErr) {
      return NextResponse.json({ error: `Couldn't keep the futures: ${insErr.message}` }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
