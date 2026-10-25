import {
  startSortedPlugins,
  type LocatedPlugin,
  type PluginServiceDeps,
  type StartedPlugins,
} from './located-plugins';

type PluginOrder = (a: LocatedPlugin, b: LocatedPlugin) => number;

type Declares = (located: LocatedPlugin) => boolean;

// A Slot's contributors: first-party Plugins first, then by Plugin id (ADR-0035).
const slotOrder: PluginOrder = ({ plugin: a }, { plugin: b }) =>
  Number(b.firstParty) - Number(a.firstParty) ||
  (a.manifest.id < b.manifest.id ? -1 : 1);

const declaredOrder = ({ plugin }: LocatedPlugin): number =>
  plugin.manifest.contributes.renderOrder ?? 0;

// A Replaceable Slot's `ui.render` chain: first-party Plugins first, then by declared `renderOrder`, then by Plugin id.
const renderOrder: PluginOrder = (a, b) =>
  Number(b.plugin.firstParty) - Number(a.plugin.firstParty) ||
  declaredOrder(a) - declaredOrder(b) ||
  slotOrder(a, b);

export const startSlotPlugins = (
  deps: PluginServiceDeps,
  declares: Declares,
): Promise<StartedPlugins> => startSortedPlugins(deps, declares, slotOrder);

export const startRenderPlugins = (
  deps: PluginServiceDeps,
  declares: Declares,
): Promise<StartedPlugins> => startSortedPlugins(deps, declares, renderOrder);
