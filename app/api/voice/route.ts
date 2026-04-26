import { NextResponse } from 'next/server';
import { ensureAnonUser } from '@/lib/session';
import { supabaseRoute } from '@/lib/supabase/route';
import { uploadToBucket } from '@/lib/storage';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const userId = await ensureAnonUser();
    const form = await req.formData();
    const blob = form.get('audio');
    if (!(blob instanceof Blob) || blob.size === 0) {
      return NextResponse.json({ error: 'No audio captured.' }, { status: 400 });
    }

    const ext = (blob.type.split('/')[1] ?? 'webm').replace(/;.*$/, '');
    const path = `sample.${ext}`;
    await uploadToBucket({
      userId,
      bucket: 'voices',
      path,
      body: blob,
      contentType: blob.type || 'audio/webm',
      upsert: true,
      sign: false,
    });

    // Replicate XTTS-v2 clones in-context per call, so we only need to
    // remember where the reference audio lives. /api/generate-futures
    // signs a fresh URL when it actually needs to call the model.
    const sb = await supabaseRoute();
    const { error } = await sb.from('voices').upsert(
      { user_id: userId, voice_reference_path: `${userId}/${path}` } as never,
      { onConflict: 'user_id' },
    );
    if (error) {
      return NextResponse.json({ error: `Couldn't keep your voice: ${error.message}` }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
