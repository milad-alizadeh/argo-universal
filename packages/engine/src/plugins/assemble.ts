import type { Database } from '@repo/db';
import type { OpenSessionsActorRef } from '../sessions';
import type { WriterActorRef } from '../storage';
import { PluginAccounts } from './accounts/plugin-accounts';
import type { OAuthOptions } from './accounts/plugin-oauth';
import type { PluginClock } from './clock';
import { discoverPlugins } from './discovery/loader';
import { HookPort } from './hooks/hook-port';
import { PluginListChanges } from './list-changes';
import { LocatedCache } from './located-cache';
import { pluginManifest } from './located-plugins';
import { runtimeFor } from './runtime-for';
import type { PluginRuntime } from './runtime/plugin-runtime';
import { PluginService } from './service';
import { HeldSecrets } from './services/held-secrets';
import type { PluginNetwork } from './services/plugin-fetch';
import { osSecretStore, type SecretStore } from './services/secret-store';
import type { SessionActs } from './session-acts';
import { PluginSettings } from './settings/plugin-settings';

export type PluginServerOptions = {
  firstPartyPluginsDirectory?: string;
  secretStore?: SecretStore;
  pluginNetwork?: PluginNetwork;
  pluginOAuth?: OAuthOptions;
  pluginClock?: PluginClock;
  // A dev Server watches Plugin sources and rebuilds on a change; any other builds each Plugin once.
  watchPlugins?: boolean;
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
  // What `argo.sessions.archive` reaches; the Engine attaches the App's archive to it.
  sessionActs?: SessionActs;
};

type Discovery = Pick<
  PluginsOptions,
  'home' | 'version' | 'firstPartyPluginsDirectory'
> & { located: LocatedCache };

export type Assembled = {
  service: PluginService;
  accounts: PluginAccounts;
  listChanges: PluginListChanges;
  runtime: PluginRuntime;
  hookPort: HookPort;
};

export type Foundations = {
  heldSecrets: HeldSecrets;
  secretStore: SecretStore;
  listChanges: PluginListChanges;
  discovery: Discovery;
  hookPort: HookPort;
  settings: PluginSettings;
  accounts: PluginAccounts;
};

function accountsFor(
  options: PluginsOptions,
  parts: Pick<Foundations, 'secretStore' | 'discovery'>,
): PluginAccounts {
  const { secretStore, discovery } = parts;

  return new PluginAccounts({
    ...options,
    secretStore,
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
  parts: Pick<Foundations, 'secretStore' | 'discovery' | 'listChanges'>,
): PluginSettings {
  const { secretStore, discovery, listChanges } = parts;

  return new PluginSettings({
    ...options,
    secretStore,
    listChanges,
    manifest: (pluginId) => pluginManifest(discovery, pluginId),
  });
}

// Every Secret the store reads or writes is held, so no log line or call answer carries it (ADR-0051).
function foundations(options: PluginsOptions): Foundations {
  const heldSecrets = new HeldSecrets();
  const secretStore = heldSecrets.keeping(options.secretStore ?? osSecretStore);
  const listChanges = new PluginListChanges();
  const { home, version, firstPartyPluginsDirectory } = options;
  const located = new LocatedCache();
  const discovery = { home, version, firstPartyPluginsDirectory, located };
  const parts = { secretStore, heldSecrets, discovery, listChanges };

  return {
    ...parts,
    hookPort: options.hookPort ?? new HookPort(),
    settings: settingsFor(options, parts),
    accounts: accountsFor(options, { secretStore, discovery }),
  };
}

function serviceFor(
  options: PluginsOptions,
  parts: Foundations,
  runtime: PluginRuntime,
): PluginService {
  return new PluginService({
    ...(options.watchPlugins === true && { dev: true }),
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
  const service = serviceFor(options, parts, runtime);

  return {
    service,
    runtime,
    accounts: parts.accounts,
    listChanges: parts.listChanges,
    hookPort: parts.hookPort,
  };
}
