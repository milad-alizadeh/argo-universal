import {
  startSortedPlugins,
  type LocatedPlugin,
  type PluginServiceDeps,
  type StartedPlugins,
} from './located-plugins';

const declaredOrder = ({ plugin }: LocatedPlugin): number =>
  plugin.manifest.contributes.order ?? 0;

// A Slot's contributors and a Replaceable Slot's `ui.render` chain: first-party Plugins first, then lower declared `order`, then by Plugin id (ADR-0035).
const pluginOrder = (a: LocatedPlugin, b: LocatedPlugin): number =>
  Number(b.plugin.firstParty) - Number(a.plugin.firstParty) ||
  declaredOrder(a) - declaredOrder(b) ||
  a.plugin.manifest.id.localeCompare(b.plugin.manifest.id, 'en');

export const startOrderedPlugins = (
  deps: PluginServiceDeps,
  declares: (located: LocatedPlugin) => boolean,
): Promise<StartedPlugins> => startSortedPlugins(deps, declares, pluginOrder);
