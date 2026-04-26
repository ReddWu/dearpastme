import { supabaseRoute } from './supabase/route';
import { supabaseServer } from './supabase/server';

export async function uploadToBucket(opts: {
  userId: string;
  bucket: 'selfies' | 'voices' | 'futures';
  path: string;        // path inside the user folder, e.g. 'self.jpg'
  body: Blob | Buffer | ArrayBuffer | Uint8Array;
  contentType: string;
  upsert?: boolean;
  // Set false when the caller doesn't need a signed URL back. Saves one
  // round-trip on write-and-forget paths like /begin and /api/voice.
  // Default true to preserve existing call sites.
  sign?: boolean;
}): Promise<{ key: string; signedUrl: string | null; publicUrl: string | null }> {
  const sb = await supabaseRoute();
  const key = `${opts.userId}/${opts.path}`;

  const body: Blob =
    opts.body instanceof Blob
      ? opts.body
      : opts.body instanceof ArrayBuffer
        ? new Blob([opts.body], { type: opts.contentType })
        : new Blob([new Uint8Array(opts.body as Uint8Array | Buffer).slice().buffer], {
            type: opts.contentType,
          });

  const { error } = await sb.storage.from(opts.bucket).upload(key, body, {
    contentType: opts.contentType,
    upsert: opts.upsert ?? true,
  });
  if (error) throw new Error(`The upload got lost: ${error.message}`);

  if (opts.bucket === 'futures') {
    const { data } = sb.storage.from(opts.bucket).getPublicUrl(key);
    return { key, signedUrl: null, publicUrl: data.publicUrl };
  }
  if (opts.sign === false) {
    return { key, signedUrl: null, publicUrl: null };
  }
  const { data, error: signErr } = await sb.storage
    .from(opts.bucket)
    .createSignedUrl(key, 60 * 60);
  if (signErr) throw new Error(`Couldn't sign the link: ${signErr.message}`);
  return { key, signedUrl: data.signedUrl, publicUrl: null };
}

// Service-role download — used server-side to feed Replicate the selfie bytes
// without leaking a private bucket URL.
export async function signedUrlAsService(opts: {
  bucket: 'selfies' | 'voices';
  key: string;
  ttlSeconds?: number;
}): Promise<string> {
  const { data, error } = await supabaseServer()
    .storage.from(opts.bucket)
    .createSignedUrl(opts.key, opts.ttlSeconds ?? 60 * 30);
  if (error || !data) throw new Error(`Couldn't read the archive: ${error?.message ?? 'unknown'}`);
  return data.signedUrl;
}
