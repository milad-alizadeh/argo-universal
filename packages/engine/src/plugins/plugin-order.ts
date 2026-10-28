import type { PluginList } from '@repo/contracts/plugins';
import {
  startSortedPlugins,
  type LocatedPlugin,
  type PluginServiceDeps,
  type StartedPlugins,
} from './located-plugins';

type PluginDescriptor = PluginList['plugins'][number];

const declaredOrder = (plugin: PluginDescriptor): number =>
  plugin.manifest.contributes.order ?? 0;

// A Slot's contributors and a Replaceable Slot's `ui.render` chain: first-party Plugins first, then lower declared `order`, then by Plugin id (ADR-0035).
export const slotOrder = (a: PluginDescriptor, b: PluginDescriptor): number =>
  Number(b.firstParty) - Number(a.firstParty) ||
  declaredOrder(a) - declaredOrder(b) ||
  a.manifest.id.localeCompare(b.manifest.id, 'en');

const pluginOrder = (a: LocatedPlugin, b: LocatedPlugin): number =>
  slotOrder(a.plugin, b.plugin);

export const startOrderedPlugins = (
  deps: PluginServiceDeps,
  declares: (located: LocatedPlugin) => boolean,
): Promise<StartedPlugins> => startSortedPlugins(deps, declares, pluginOrder);
