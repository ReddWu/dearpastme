-- Switch voice cloning from ElevenLabs to Replicate XTTS v2.
-- XTTS does in-context cloning per call, so we no longer store an
-- external voice_id; we store the storage key of the user's reference
-- audio and sign a fresh URL for Replicate at generation time.

alter table public.voices
  rename column elevenlabs_voice_id to voice_reference_path;
