import type {
  PluginManifest,
  PluginSettingValue,
} from '@repo/contracts/plugins';
import {
  createPluginRuntime,
  macKeychain,
  pluginManifest,
  PluginService,
  PluginSettings,
  PluginAccounts,
  type HookPort,
  type Keychain,
  type PluginRuntime,
} from '../plugins';
import type { HttpServerOptions } from './http-server';
import { projectOptions } from './plugin-project-options';

type Parts = {
  pluginSettings: PluginSettings;
  pluginAccounts: PluginAccounts;
  keychain: Keychain;
  hookPort: HookPort;
};

type PluginParts = Omit<Parts, 'keychain' | 'hookPort'> & {
  pluginRuntime: PluginRuntime;
};

export function createPluginParts(
  options: HttpServerOptions,
  hookPort: HookPort,
): PluginParts {
  const keychain = options.keychain ?? macKeychain;
  const parts = stateParts(options, keychain, hookPort);

  return {
    pluginSettings: parts.pluginSettings,
    pluginAccounts: parts.pluginAccounts,
    pluginRuntime: runtimeFor(options, parts),
  };
}

function stateParts(
  options: HttpServerOptions,
  keychain: Keychain,
  hookPort: HookPort,
): Parts {
  return {
    keychain,
    hookPort,
    pluginSettings: settingsFor(options, keychain),
    pluginAccounts: accountsFor(options, keychain),
  };
}

function runtimeFor(options: HttpServerOptions, parts: Parts): PluginRuntime {
  const pluginRuntime = createPluginRuntime(options.home, {
    ...runtimeOptions(options, parts),
    wakePlugin: (id) =>
      wakeProvider({ ...options, ...parts, pluginRuntime }, id),
  });

  return pluginRuntime;
}

function runtimeOptions(
  options: HttpServerOptions,
  parts: Parts,
): Parameters<typeof createPluginRuntime>[1] {
  return {
    accounts: parts.pluginAccounts,
    keychain: parts.keychain,
    ...runtimePorts(options),
    ...projectOptions(options),
    hooks: parts.hookPort.hooks,
    settings: async (pluginId, key): Promise<PluginSettingValue | null> =>
      parts.pluginSettings.read(pluginId, key),
  };
}

async function wakeProvider(
  options: ConstructorParameters<typeof PluginService>[0],
  pluginId: string,
): Promise<void> {
  const status = await new PluginService(options).activate(pluginId);

  if (status.state !== 'running')
    throw new Error('Account provider is unavailable');
}

function accountsFor(
  options: HttpServerOptions,
  keychain: Keychain,
): PluginAccounts {
  return new PluginAccounts({
    ...options,
    keychain,
    manifest: (id): Promise<PluginManifest> => pluginManifest(options, id),
    firstParty: (id): Promise<boolean> => isFirstParty(options, id),
  });
}

async function isFirstParty(
  options: HttpServerOptions,
  id: string,
): Promise<boolean> {
  return (await new PluginService(options).list()).plugins.some(
    (plugin) => plugin.manifest.id === id && plugin.firstParty,
  );
}

// The runtime and the settings it answers `argo.settings` from share one Keychain.
function settingsFor(
  options: HttpServerOptions,
  keychain: Keychain,
): PluginSettings {
  return new PluginSettings({
    ...options,
    keychain,
    manifest: async (pluginId) => pluginManifest(options, pluginId),
  });
}

function runtimePorts(
  options: HttpServerOptions,
): Pick<
  Parameters<typeof createPluginRuntime>[1],
  'network' | 'oauth' | 'clock'
> {
  return {
    network: options.pluginNetwork,
    oauth: options.pluginOAuth,
    clock: options.pluginClock,
  };
}
