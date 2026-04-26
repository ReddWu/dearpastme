'use server';

import { redirect } from 'next/navigation';
import { ensureAnonUser } from '@/lib/session';
import { supabaseRoute } from '@/lib/supabase/route';
import { uploadToBucket } from '@/lib/storage';
import { parseProfile } from '@/lib/prompts/parseProfile';
import type { Profile } from '@/lib/types';

const SELFIE_EXTS = ['jpg', 'jpeg', 'png', 'webp', 'heic'] as const;

function normalizeExt(file: File): string {
  const fromType = file.type?.split('/')[1] ?? '';
  const fromName = file.name?.split('.').pop()?.toLowerCase() ?? '';
  const candidate = (fromType || fromName).toLowerCase().replace('jpeg', 'jpg');
  return (SELFIE_EXTS as readonly string[]).includes(candidate) ? candidate : 'jpg';
}

export async function uploadSelfie(formData: FormData) {
  const file = formData.get('selfie');
  if (!(file instanceof File) || file.size === 0) {
    throw new Error('No photo found — try again.');
  }
  const userId = await ensureAnonUser();
  const ext = normalizeExt(file);
  await uploadToBucket({
    userId,
    bucket: 'selfies',
    path: `self.${ext}`,
    body: file,
    contentType: file.type || 'image/jpeg',
    upsert: true,
    sign: false,
  });
  redirect('/voice');
}

export async function importProfile(formData: FormData) {
  const raw = String(formData.get('raw') ?? '').trim();
  if (raw.length < 80) {
    throw new Error('That text is too short — it doesn\'t look like a full profile.');
  }
  const userId = await ensureAnonUser();
  const profile = await parseProfile(raw);
  const sb = await supabaseRoute();
  const { error } = await sb.from('profiles').upsert(
    { user_id: userId, ...profile } as never,
    { onConflict: 'user_id' },
  );
  if (error) throw new Error(`Couldn't tuck this profile into the drawer: ${error.message}`);
  redirect('/profile/edit');
}

export async function saveProfile(profile: Profile) {
  const userId = await ensureAnonUser();
  const sb = await supabaseRoute();
  const { error } = await sb.from('profiles').upsert(
    { user_id: userId, ...profile } as never,
    { onConflict: 'user_id' },
  );
  if (error) throw new Error(`The save got lost: ${error.message}`);
  redirect('/generating');
}
