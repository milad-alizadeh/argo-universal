import type {
  PluginManifest,
  PluginProjectInfo,
  PluginSettingField,
  PluginSettingValue,
} from '@repo/contracts/plugins';
import { discoverPlugins } from '@repo/engine/plugins';
import type { PluginTestOptions } from './test-types';

export type ConfiguredTest = PluginTestOptions & {
  projects: PluginProjectInfo[];
  projectPaths: Record<string, string>;
  settingsByPlugin: Map<string, Map<string, PluginSettingValue>>;
  // The keys of each Plugin's secret Settings, which live in the secret store.
  secretSettings: Map<string, Set<string>>;
};

export async function configureTest(
  options: PluginTestOptions,
): Promise<ConfiguredTest> {
  const manifests = await discover(options);

  if (!manifests.some(({ id }) => id === options.pluginId))
    throw new Error(`Unknown Plugin: ${options.pluginId}`);

  return {
    ...options,
    ...projectRegistry(options),
    ...settingsRegistry(options, manifests),
    secretSettings: new Map(manifests.map(secretKeys)),
  };
}

// Whether a Plugin's Setting is a secret one, which lives in the secret store.
export const isSecretSetting = (
  { secretSettings }: ConfiguredTest,
  pluginId: string,
  key: string,
): boolean => secretSettings.get(pluginId)?.has(key) === true;

const secretKeys = (manifest: PluginManifest): [string, Set<string>] => [
  manifest.id,
  new Set(
    (manifest.contributes.settings ?? [])
      .filter(({ type }) => type === 'secret')
      .map(({ key }) => key),
  ),
];

function settingsRegistry(
  options: PluginTestOptions,
  manifests: PluginManifest[],
): Pick<ConfiguredTest, 'settings' | 'settingsByPlugin'> {
  const settingsByPlugin = new Map(
    manifests.map((manifest) => [manifest.id, defaultSettings(manifest)]),
  );

  const settings = settingsFor(options, settingsByPlugin);
  settingsByPlugin.set(options.pluginId, settings);

  return { settings, settingsByPlugin };
}

async function discover(options: PluginTestOptions): Promise<PluginManifest[]> {
  const found = await discoverPlugins({
    version: options.version,
    firstPartyPluginsDirectory: options.directory,
  });

  if (found.errors.length)
    throw new Error(found.errors.map(({ message }) => message).join('\n'));

  return found.plugins.map(({ manifest }) => manifest);
}

function settingsFor(
  options: PluginTestOptions,
  defaults: ConfiguredTest['settingsByPlugin'],
): Map<string, PluginSettingValue> {
  return options.settings ?? defaults.get(options.pluginId) ?? new Map();
}

function projectRegistry(
  options: PluginTestOptions,
): Pick<ConfiguredTest, 'projects' | 'projectPaths'> {
  const projectPaths = options.projectPaths ?? {};

  return {
    projectPaths,
    projects:
      options.projects ??
      Object.keys(projectPaths).map((id) => ({
        id,
        name: id,
        originUrl: null,
      })),
  };
}

function defaultSettings(
  manifest: PluginManifest,
): Map<string, PluginSettingValue> {
  return new Map((manifest.contributes.settings ?? []).flatMap(settingDefault));
}

function settingDefault(
  field: PluginSettingField,
): [string, PluginSettingValue][] {
  if (!('default' in field)) return [];

  return field.default === undefined ? [] : [[field.key, field.default]];
}
