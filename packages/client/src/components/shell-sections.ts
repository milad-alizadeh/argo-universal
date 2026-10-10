import type { IconName } from '#lib/icon-names';
import type { Section } from '../navigation/sections';

export type { Section } from '../navigation/sections';

export const shellSections = {
  sessions: { title: 'Sessions', icon: 'sessions' },
  issues: { title: 'Issues', icon: 'issue' },
  atlas: { title: 'Atlas', icon: 'atlas' },
  settings: { title: 'Settings', icon: 'settings' },
} as const satisfies Record<Section, { title: string; icon: IconName }>;
