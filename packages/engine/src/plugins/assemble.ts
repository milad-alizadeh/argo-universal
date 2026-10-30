import type { Database } from '@repo/db';
import type { OpenSessionsActorRef } from '../sessions';
import type { WriterActorRef } from '../storage';
import { PluginAccounts } from './accounts/plugin-accounts';
import type { OAuthOptions } from './accounts/plugin-oauth';
import type { PluginClock } from './clock';
import { discoverPlugins } from './discovery/loader';
import { HookPort } from './hooks/hook-port';
import { PluginListChanges } from './list-changes';
import { pluginLocation, pluginManifest } from './located-plugins';
import { projectPorts } from './project-ports';
import { createPluginRuntime } from './runtime/create-runtime';
import type { PluginLocation } from './runtime/plugin-location';
import type { PluginRuntime } from './runtime/plugin-runtime';
import { PluginService } from './service';
import { macKeychain, type Keychain } from './services/keychain';
import type { PluginNetwork } from './services/plugin-fetch';
import { PluginSettings } from './settings/plugin-settings';

export type PluginServerOptions = {
  firstPartyPluginsDirectory?: string;
  keychain?: Keychain;
  pluginNetwork?: PluginNetwork;
  pluginOAuth?: OAuthOptions;
  pluginClock?: PluginClock;
};

// What the Engine hands over; the Plugin module builds everything else.
export type PluginsOptions = PluginServerOptions & {
  home: string;
  version: string;
  database: Database;
  databaseWriter: WriterActorRef;
  sessions: OpenSessionsActorRef;
  // Where Sessions reach Plugin Hooks; the runtime attaches to it while the server runs.
  hookPort?: HookPort;
};

type Discovery = Pick<
  PluginsOptions,
  'home' | 'version' | 'firstPartyPluginsDirectory'
>;

export type Assembled = {
  service: PluginService;
  accounts: PluginAccounts;
  listChanges: PluginListChanges;
  runtime: PluginRuntime;
  hookPort: HookPort;
};

type Foundations = {
  keychain: Keychain;
  listChanges: PluginListChanges;
  discovery: Discovery;
  hookPort: HookPort;
  settings: PluginSettings;
  accounts: PluginAccounts;
};

function accountsFor(
  options: PluginsOptions,
  parts: Pick<Foundations, 'keychain' | 'discovery'>,
): PluginAccounts {
  const { keychain, discovery } = parts;

  return new PluginAccounts({
    ...options,
    keychain,
    manifest: (pluginId) => pluginManifest(discovery, pluginId),
    firstParty: async (pluginId) =>
      (await discoverPlugins(discovery)).plugins.some(
        (plugin) => plugin.manifest.id === pluginId && plugin.firstParty,
      ),
  });
}

// A Plugin's settings, with the Apps that watch the list told whenever one is turned on or off.
function settingsFor(
  options: PluginsOptions,
  parts: Pick<Foundations, 'keychain' | 'discovery' | 'listChanges'>,
): PluginSettings {
  const { keychain, discovery, listChanges } = parts;

  return new PluginSettings({
    ...options,
    keychain,
    listChanges,
    manifest: (pluginId) => pluginManifest(discovery, pluginId),
  });
}

function foundations(options: PluginsOptions): Foundations {
  const keychain = options.keychain ?? macKeychain;
  const listChanges = new PluginListChanges();
  const { home, version, firstPartyPluginsDirectory } = options;
  const discovery = { home, version, firstPartyPluginsDirectory };
  const parts = { keychain, discovery, listChanges };

  return {
    ...parts,
    hookPort: options.hookPort ?? new HookPort(),
    settings: settingsFor(options, parts),
    accounts: accountsFor(options, { keychain, discovery }),
  };
}

function runtimePorts(
  options: PluginsOptions,
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

function runtimeFor(
  options: PluginsOptions,
  parts: Foundations,
): PluginRuntime {
  const { accounts, keychain, settings } = parts;

  return createPluginRuntime(options.home, {
    accounts,
    keychain,
    ...runtimePorts(options),
    ...projectPorts(options),
    hooks: parts.hookPort.hooks,
    settings: async (pluginId, key) => settings.read(pluginId, key),
    locate: locator(parts),
  });
}

// A sign-in wakes its account provider the way the service activates any Plugin.
function locator({
  discovery,
  settings,
}: Foundations): (pluginId: string) => Promise<PluginLocation> {
  return (pluginId) =>
    pluginLocation({ ...discovery, pluginSettings: settings }, pluginId);
}

function serviceFor(parts: Foundations, runtime: PluginRuntime): PluginService {
  return new PluginService({
    ...parts.discovery,
    pluginAccounts: parts.accounts,
    pluginRuntime: runtime,
    pluginSettings: parts.settings,
  });
}

// The one place PluginService is built, with every dependency in hand.
export function assemble(options: PluginsOptions): Assembled {
  const parts = foundations(options);
  const runtime = runtimeFor(options, parts);
  const service = serviceFor(parts, runtime);

  return {
    service,
    runtime,
    accounts: parts.accounts,
    listChanges: parts.listChanges,
    hookPort: parts.hookPort,
  };
}
