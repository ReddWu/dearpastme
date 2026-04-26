export type Branch = 'flowing' | 'realized' | 'drifting';

export type Profile = {
  current_self: string;
  inertia: string;
  the_thing: string;
  passive_mode: string;
  late_night_scene: string;
  unspoken_desire: string;
};

export type FutureContent = {
  image_prompt: string;
  life_description: string;
  letter: string;
  voice_message: string;
};

export const BRANCH_LABEL: Record<Branch, string> = {
  flowing: 'Flowing',
  realized: 'Realized',
  drifting: 'Drifting',
};

export const BRANCHES: readonly Branch[] = ['flowing', 'realized', 'drifting'] as const;
