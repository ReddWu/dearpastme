'use client';
import { useState } from 'react';

export function SelfieField() {
  const [name, setName] = useState<string | null>(null);
  return (
    <label className="cursor-pointer text-sm text-ash hover:text-ink transition-colors duration-700 border border-ash/30 hover:border-ink/40 px-8 py-3">
      <span>{name ? 'Choose another' : 'Choose a photo'}</span>
      <input
        type="file"
        name="selfie"
        accept="image/*"
        required
        className="hidden"
        onChange={(e) => setName(e.currentTarget.files?.[0]?.name ?? null)}
      />
      {name && (
        <span className="block text-[0.7rem] tracking-[0.3em] uppercase text-ink/70 mt-2 text-center">
          {name}
        </span>
      )}
    </label>
  );
}
