import { NextResponse } from 'next/server';
import { requireUserId } from '@/lib/session';
import { supabaseRoute } from '@/lib/supabase/route';
import { supabaseServer } from '@/lib/supabase/server';
import { signedUrlAsService, uploadToBucket } from '@/lib/storage';
import { generateFuture } from '@/lib/prompts/generateFuture';
import { generateAgedPortrait } from '@/lib/imagen';
import { synthesizeFutureLine } from '@/lib/voice';
import { BRANCHES, type Branch, type Profile } from '@/lib/types';

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

async function generateOne(opts: {
  userId: string;
  branch: Branch;
  profile: Profile;
  selfieUrl: string;
  referenceAudioUrl: string;
}) {
  const content = await generateFuture(opts.profile, opts.branch);

  const [portraitRemote, voiceBuf] = await Promise.all([
    generateAgedPortrait({
      selfieUrl: opts.selfieUrl,
      branch: opts.branch,
      imagePrompt: content.image_prompt,
    }),
    synthesizeFutureLine({
      referenceAudioUrl: opts.referenceAudioUrl,
      text: content.voice_message,
      branch: opts.branch,
    }),
  ]);

  // Mirror the FLUX output into our own bucket so it stays addressable
  // after Replicate's CDN URL expires.
  const portraitBytes = await fetch(portraitRemote).then((r) => r.arrayBuffer());
  const portrait = await uploadToBucket({
    userId: opts.userId,
    bucket: 'futures',
    path: `${opts.branch}/portrait.webp`,
    body: portraitBytes,
    contentType: 'image/webp',
  });
  const voice = await uploadToBucket({
    userId: opts.userId,
    bucket: 'futures',
    path: `${opts.branch}/voice.mp3`,
    body: voiceBuf,
    contentType: 'audio/mpeg',
  });

  return {
    branch: opts.branch,
    image_url: portrait.publicUrl!,
    life_description: content.life_description,
    letter: content.letter,
    voice_message_text: content.voice_message,
    voice_message_url: voice.publicUrl!,
  };
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

    const results = await Promise.all(
      BRANCHES.map((branch) =>
        generateOne({
          userId,
          branch,
          profile,
          selfieUrl,
          referenceAudioUrl,
        }),
      ),
    );

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
