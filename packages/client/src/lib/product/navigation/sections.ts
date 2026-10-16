import type { IconName } from '#lib/generic/symbols/icon-names';

// Each section's title and icon, top to bottom in the rail and the drawer. A section's key is also its route: `/sessions` and the drawer screen `sessions`.
export const sections = {
  sessions: { title: 'Sessions', icon: 'sessions' },
  settings: { title: 'Settings', icon: 'settings' },
} as const satisfies Record<string, { title: string; icon: IconName }>;

export type CoreSection = keyof typeof sections;

export type Section = CoreSection | `plugins/${string}/${string}`;

export interface NavigationSection {
  id: Section;
  title: string;
  icon: IconName;
}

export const isCoreSection = (name: string | undefined): name is CoreSection =>
  name !== undefined && Object.hasOwn(sections, name);

export const sectionOrder: readonly CoreSection[] =
  Object.keys(sections).filter(isCoreSection);

// The section a path or drawer route is in, by its first segment; any other, such as `/` before it redirects, counts as Sessions.
export function sectionOf(path = ''): Section {
  const segments = path.split('/').filter(Boolean);

  return pluginSectionOf(segments) ?? coreSectionOf(segments[0]);
}

const coreSectionOf = (name: string | undefined): CoreSection =>
  isCoreSection(name) ? name : 'sessions';

// A page is any path below its section's list, such as `/settings/accounts` under `/settings`.
export const isPage = (path: string): boolean =>
  path.split('/').filter(Boolean).length > 1;

export const coreNavigationSections: readonly NavigationSection[] =
  sectionOrder.map((id) => ({ id, ...sections[id] }));

function pluginSectionOf(segments: string[]): Section | undefined {
  if (segments[0] !== 'plugins') return undefined;
  const [, plugin, nav] = segments;

  if (!nav) return undefined;

  return `plugins/${plugin}/${nav}`;
}
