import type { PluginClock } from '../clock';

// How Plugins are built: told whenever a dev build lands, and whether a build watches the Plugin's sources or runs once.
export type PluginBuilds = { rebuilt: () => void; watch: boolean };

// The clock every deadline shares, and how Plugins are built.
export type RuntimeSetup = {
  clock?: PluginClock;
  builds?: Partial<PluginBuilds>;
};

// A build setting that is left out, or given as undefined, takes its default.
export const buildsWithDefaults = (
  builds: Partial<PluginBuilds>,
): PluginBuilds => ({
  rebuilt: builds.rebuilt ?? ((): null => null),
  watch: builds.watch ?? true,
});

// A dev build landing may come with a changed `plugin.json`; only a dev Server watches sources, any other builds once.
export const runtimeBuilds = (
  watchPlugins: boolean | undefined,
  located: { clear: () => void },
): PluginBuilds => ({
  rebuilt: () => located.clear(),
  watch: watchPlugins ?? true,
});
