import type { IconName } from '#lib/generic/symbols/icon-names';

export type Section = 'sessions' | 'issues' | 'atlas' | 'settings';

// Each section's title and icon, top to bottom in the rail and the drawer. A section's key is also its route: `/sessions` and the drawer screen `sessions`.
export const sections = {
  sessions: { title: 'Sessions', icon: 'sessions' },
  issues: { title: 'Issues', icon: 'issue' },
  atlas: { title: 'Atlas', icon: 'atlas' },
  settings: { title: 'Settings', icon: 'settings' },
} as const satisfies Record<Section, { title: string; icon: IconName }>;

const isSection = (name: string | undefined): name is Section =>
  name !== undefined && name in sections;

export const sectionOrder: readonly Section[] =
  Object.keys(sections).filter(isSection);

// The section a path or drawer route is in, by its first segment; any other, such as `/` before it redirects, counts as Sessions.
export function sectionOf(path: string | undefined): Section {
  const name = path?.split('/').find(Boolean);

  return isSection(name) ? name : 'sessions';
}

// A page is any path below its section's list, such as `/settings/accounts` under `/settings`.
export const isPage = (path: string): boolean =>
  path.split('/').filter(Boolean).length > 1;
