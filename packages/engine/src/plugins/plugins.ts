import type { Database } from '@repo/db';
import { writeLog } from '@repo/machine-log';
import type { OpenSessionsActorRef } from '../sessions';
import { watchTurnActivity } from '../sessions';
import type { WriterActorRef } from '../storage';
import { PluginAccounts } from './accounts/plugin-accounts';
import type { OAuthOptions } from './accounts/plugin-oauth';
import type { PluginClock } from './clock';
import { discoverPlugins } from './discovery/loader';
import { HookPort } from './hooks/hook-port';
import { pluginManifest } from './located-plugins';
import { projectPorts } from './project-ports';
import type { PluginsRouterDeps } from './router';
import { createPluginRuntime } from './runtime/create-runtime';
import type { PluginRuntime } from './runtime/plugin-runtime';
import { PluginService } from './service';
import { macKeychain, type Keychain } from './services/keychain';
import type { PluginNetwork } from './services/plugin-fetch';
import { PluginSettings } from './settings/plugin-settings';
import { startBackgroundPlugins } from './start-background';

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

// Engine owns the lifetime. This module owns Plugin assembly and the ordering of its finite operations.
export class Plugins {
  readonly hooks: HookPort['hooks'];
  readonly router: PluginsRouterDeps;
  private readonly hookPort: HookPort;
  private readonly service: PluginService;
  private readonly runtime: PluginRuntime;
  private readonly unwatchTurns: () => void;
  private readonly home: string;
  private backgroundStarted?: Promise<void>;

  constructor(options: PluginsOptions) {
    const { home, version, firstPartyPluginsDirectory } = options;
    const keychain = options.keychain ?? macKeychain;
    const discovery = { home, version, firstPartyPluginsDirectory };
    // The runtime wakes an account provider through the service that wraps it, so it reaches the service late.
    let service: PluginService | undefined;

    const settings = new PluginSettings({
      ...options,
      keychain,
      manifest: (pluginId) => pluginManifest(discovery, pluginId),
    });

    const accounts = new PluginAccounts({
      ...options,
      keychain,
      manifest: (pluginId) => pluginManifest(discovery, pluginId),
      firstParty: async (pluginId) =>
        (await discoverPlugins(discovery)).plugins.some(
          (plugin) => plugin.manifest.id === pluginId && plugin.firstParty,
        ),
    });

    const hookPort = options.hookPort ?? new HookPort();

    const runtime = createPluginRuntime(home, {
      accounts,
      keychain,
      network: options.pluginNetwork,
      oauth: options.pluginOAuth,
      clock: options.pluginClock,
      ...projectPorts(options),
      hooks: hookPort.hooks,
      settings: async (pluginId, key) => settings.read(pluginId, key),
      wakePlugin: async (pluginId) => {
        const status = await service?.activate(pluginId);

        if (status?.state !== 'running')
          throw new Error('Account provider is unavailable');
      },
    });

    const plugins = new PluginService({
      ...discovery,
      pluginAccounts: accounts,
      pluginRuntime: runtime,
      pluginSettings: settings,
    });

    service = plugins;

    hookPort.attach({
      run: (name, event) => plugins.runHooks(name, event),
      log: (line) => writeLog({ home, label: 'plugins', line }),
    });

    this.home = home;
    this.hookPort = hookPort;
    this.hooks = hookPort.hooks;
    this.service = plugins;
    this.runtime = runtime;
    this.router = { plugins, accounts };
    this.unwatchTurns = watchTurnActivity(options.sessions, (active) => {
      runtime.turns.changed(active);
    });
  }

  readonly openAsset: PluginRuntime['openAsset'] = (reference) =>
    this.runtime.openAsset(reference);

  // Called after HTTP binds. Background work cannot delay readiness or start twice.
  listening(): void {
    this.backgroundStarted ??= startBackgroundPlugins(this.service, this.home);
  }

  async close(): Promise<void> {
    await this.backgroundStarted;
    this.unwatchTurns();
    this.hookPort.detach();
    await this.runtime.close();
  }
}
