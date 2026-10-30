import type { IconName } from '@repo/kit/symbols/icon-names';
import type { IconSymbol } from '@repo/kit/symbols/icon-symbol';

// Each section's title and icon, top to bottom in the rail and the drawer. A section's key is also its route: `/sessions` and the drawer screen `sessions`.
export const sections = {
  sessions: { title: 'Sessions', icon: 'sessions' },
  settings: { title: 'Settings', icon: 'settings' },
} as const satisfies Record<string, { title: string; icon: IconName }>;

export type CoreSection = keyof typeof sections;

// A Plugin nav item's section: its route segment, the Plugin id and the nav item id, as in `/plugins/example/example`.
export type PluginSectionId = `plugins/${string}/${string}`;

export type Section = CoreSection | PluginSectionId;

export const pluginSectionId = (
  pluginId: string,
  navId: string,
): PluginSectionId => `plugins/${pluginId}/${navId}`;

export interface NavigationSection {
  id: Section;
  title: string;
  icon: IconSymbol;
}

export const isCoreSection = (name: string | undefined): name is CoreSection =>
  name !== undefined && Object.hasOwn(sections, name);

export const isPluginSection = (section: Section): section is PluginSectionId =>
  !isCoreSection(section);

export const sectionOrder: readonly CoreSection[] =
  Object.keys(sections).filter(isCoreSection);

// The section a path or drawer route is in, by its first segment; any other, such as `/` before it redirects, counts as Sessions.
export function sectionOf(path = ''): Section {
  const segments = path.split('/').filter(Boolean);

  return pluginSectionOf(segments) ?? coreSectionOf(segments[0]);
}

const coreSectionOf = (name: string | undefined): CoreSection =>
  isCoreSection(name) ? name : 'sessions';

// A page is any path below its section's root, such as `/settings/accounts` under `/settings` or `/plugins/tracker/issues/1` under `/plugins/tracker/issues`.
export function isPage(path: string): boolean {
  const segments = path.split('/').filter(Boolean);

  return segments.length > rootDepth(segments);
}

// A core section's root is one segment deep; a Plugin's is three: `plugins`, the Plugin id and the nav id.
const coreRootDepth = 1;

const pluginRootDepth = 3;

const rootDepth = (segments: string[]): number =>
  pluginSectionOf(segments) ? pluginRootDepth : coreRootDepth;

export const coreNavigationSections: readonly NavigationSection[] =
  sectionOrder.map((id) => ({ id, ...sections[id] }));

function pluginSectionOf(segments: string[]): PluginSectionId | undefined {
  const root = segments.slice(0, pluginRootDepth).join('/');

  return isPluginRoot(root) ? root : undefined;
}

// Segments arrive without empty ones, so `plugins/<Plugin id>/<nav id>` is the whole root.
const isPluginRoot = (root: string): root is PluginSectionId =>
  /^plugins\/[^/]+\/[^/]+$/u.test(root);
