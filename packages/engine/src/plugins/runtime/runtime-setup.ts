// How Plugins are built: told whenever a dev build lands, and whether a build watches the Plugin's sources or runs once.
export type PluginBuilds = { rebuilt: () => void; watch: boolean };

// A build setting that is left out, or given as undefined, takes its default.
export const buildsWithDefaults = (
  builds: Partial<PluginBuilds>,
): PluginBuilds => ({
  rebuilt: builds.rebuilt ?? ((): null => null),
  watch: builds.watch ?? true,
});
