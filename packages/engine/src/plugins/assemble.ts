import type { Database } from '@repo/db';
import type { OpenSessionsActorRef } from '../sessions';
import type { WriterActorRef } from '../storage';
import { PluginAccounts } from './accounts/plugin-accounts';
import type { OAuthOptions } from './accounts/plugin-oauth';
import type { PluginClock } from './clock';
import { discoverPlugins } from './discovery/loader';
import { HookPort } from './hooks/hook-port';
import { pluginManifest } from './located-plugins';
import { projectPorts } from './project-ports';
import { createPluginRuntime } from './runtime/create-runtime';
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
  runtime: PluginRuntime;
  hookPort: HookPort;
};

// The runtime wakes an account provider through the service that wraps it, so it reaches the service late.
class LateService {
  service?: PluginService;

  activate(pluginId: string): ReturnType<PluginService['activate']> {
    if (!this.service) throw new Error('Plugins are not assembled yet');

    return this.service.activate(pluginId);
  }
}

type Foundations = {
  keychain: Keychain;
  discovery: Discovery;
  hookPort: HookPort;
  settings: PluginSettings;
  accounts: PluginAccounts;
};

async function wake(late: LateService, pluginId: string): Promise<void> {
  const status = await late.activate(pluginId);

  if (status.state !== 'running')
    throw new Error('Account provider is unavailable');
}

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

function foundations(options: PluginsOptions): Foundations {
  const keychain = options.keychain ?? macKeychain;
  const { home, version, firstPartyPluginsDirectory } = options;
  const discovery = { home, version, firstPartyPluginsDirectory };

  const manifest = (pluginId: string): ReturnType<typeof pluginManifest> =>
    pluginManifest(discovery, pluginId);

  return {
    keychain,
    discovery,
    hookPort: options.hookPort ?? new HookPort(),
    settings: new PluginSettings({ ...options, keychain, manifest }),
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
  parts: Foundations & { late: LateService },
): PluginRuntime {
  const { accounts, keychain, settings, late } = parts;

  return createPluginRuntime(options.home, {
    accounts,
    keychain,
    ...runtimePorts(options),
    ...projectPorts(options),
    hooks: parts.hookPort.hooks,
    settings: async (pluginId, key) => settings.read(pluginId, key),
    wakePlugin: (pluginId) => wake(late, pluginId),
  });
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
  const late = new LateService();
  const runtime = runtimeFor(options, { ...parts, late });
  const service = serviceFor(parts, runtime);
  late.service = service;

  return {
    service,
    runtime,
    accounts: parts.accounts,
    hookPort: parts.hookPort,
  };
}
