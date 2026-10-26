import type { PluginList } from '@repo/contracts/plugins';
import { useQuery } from '@tanstack/react-query';
import { useTRPC } from '#features/connection';
import {
  type NavigationSection,
  type PluginSectionId,
  pluginSectionId,
  sectionOf,
} from '../../lib/product/navigation/sections';
import { segmentsOf } from './plugin-page-route';
import { pluginSymbol } from './plugin-symbol';

export interface PluginSection extends NavigationSection {
  id: PluginSectionId;
  pluginId: string;
  name: string;
  navId: string;
  // The manifest's nav path, as segments: the Plugin's own path to this nav item's root page.
  navPath: string[];
  // The nav item's root page in the App, as `/plugins/<Plugin id>/<nav id>/<nav path>`.
  rootPath: PluginPath;
}

// The Plugin section a path is in, and whether the path is its root page. A path whose Plugin is unknown, still loading or gone, counts as a root so the narrow header keeps ☰ to leave it.
export interface PluginLocation {
  section: PluginSection | undefined;
  root: boolean;
}

const noPlugins: PluginList['plugins'] = [];

interface PluginListState {
  sections: PluginSection[];
  // The connected Server's list has arrived.
  loaded: boolean;
}

// Manifest contributions retain their order; the connected Server owns this list.
function usePluginList(): PluginListState {
  const trpc = useTRPC();
  const { data, isSuccess } = useQuery(trpc.plugins.list.queryOptions());

  const sections = (data?.plugins ?? noPlugins)
    .filter((plugin) => plugin.enabled)
    .flatMap(({ manifest }) => pluginSections(manifest));

  return { sections, loaded: isSuccess };
}

export const usePluginSections = (): PluginSection[] =>
  usePluginList().sections;

export function pluginAt(
  plugins: readonly PluginSection[],
  path: string,
): PluginLocation {
  const shown = sectionOf(path);
  const section = plugins.find((plugin) => plugin.id === shown);

  return { section, root: section ? path === section.rootPath : true };
}

// Where `path` sits among the connected Server's Plugins, and whether that list has arrived.
export function usePluginAt(
  path: string,
): PluginLocation & { loaded: boolean } {
  const { sections, loaded } = usePluginList();

  return { ...pluginAt(sections, path), loaded };
}

// A Plugin page's path, typed so Expo Router's typed routes accept it.
export type PluginPath = `/plugins/${string}`;

// A catch-all route's segments as the path they name.
export const pluginPath = (segments: readonly string[]): PluginPath =>
  `/plugins/${segments.join('/')}`;

type Manifest = PluginList['plugins'][number]['manifest'];

type NavItem = Manifest['contributes']['nav'][number];

const pluginSections = (manifest: Manifest): PluginSection[] =>
  manifest.contributes.nav.map((nav) => pluginSection(manifest, nav));

function pluginSection(manifest: Manifest, nav: NavItem): PluginSection {
  const navPath = segmentsOf(nav.path);

  return {
    id: pluginSectionId(manifest.id, nav.id),
    pluginId: manifest.id,
    name: manifest.name,
    title: nav.title,
    icon: pluginSymbol(manifest.icon),
    navId: nav.id,
    navPath,
    rootPath: pluginPath([manifest.id, nav.id, ...navPath]),
  };
}
