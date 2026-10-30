import type { Section } from '../../lib/product/navigation/sections';
import type { PluginSection } from './use-plugin-sections';

// Who is opening a page: the Plugin whose tree fired the event, and the section the App is showing.
export interface PluginPageOrigin {
  pluginId: string;
  current: Section;
}

// A path's non-empty segments.
export const segmentsOf = (path: string): string[] =>
  path.split('/').filter(Boolean);

// A Plugin page's route is `<Plugin id>/<nav id>/<the page's own path>`; the own path is what the Plugin registers. This is the one place the shape is built and read.
export interface PluginRoute {
  pluginId: string;
  navId: string;
  page: readonly string[];
}

export const pluginRoute = ({
  pluginId,
  navId,
  page,
}: PluginRoute): string[] => [pluginId, navId, ...page];

function parsePluginRoute(route: readonly string[]): PluginRoute {
  const [pluginId = '', navId = '', ...page] = route;

  return { pluginId, navId, page };
}

export const pluginPagePath = (route: readonly string[]): string =>
  `/${parsePluginRoute(route).page.join('/')}`;

const sits = (section: PluginSection, page: readonly string[]): boolean =>
  section.navPath.every((segment, at) => page[at] === segment);

const deepestFirst = (a: PluginSection, b: PluginSection): number =>
  b.navPath.length - a.navPath.length;

// The route that opens a Plugin's page, by the path the Plugin registered it at. The page opens under the nav item the App is showing when it sits below that item's path; otherwise under the Plugin's deepest nav item whose path it sits below. A page no nav item holds has no route.
export function pluginPageRoute(
  sections: readonly PluginSection[],
  origin: PluginPageOrigin,
  path: string,
): string[] | undefined {
  const page = segmentsOf(path);
  const holder = holderOf(sections, origin, page);

  return (
    holder &&
    pluginRoute({ pluginId: holder.pluginId, navId: holder.navId, page })
  );
}

function holderOf(
  sections: readonly PluginSection[],
  { pluginId, current }: PluginPageOrigin,
  page: readonly string[],
): PluginSection | undefined {
  const holders = sections.filter(
    (section) => section.pluginId === pluginId && sits(section, page),
  );

  return (
    holders.find((section) => section.id === current) ??
    holders.sort(deepestFirst)[0]
  );
}
