import { writeLog } from '@repo/machine-log';
import { watchTurnActivity } from '../sessions';
import { assemble, type Assembled, type PluginsOptions } from './assemble';
import type { HookPort } from './hooks/hook-port';
import type { PluginsRouterDeps } from './router';
import type { PluginRuntime } from './runtime/plugin-runtime';
import { startBackgroundPlugins } from './start-background';

// Engine owns the lifetime. This module owns Plugin assembly and the ordering of its finite operations.
export class Plugins {
  readonly hooks: HookPort['hooks'];
  readonly router: PluginsRouterDeps;
  private readonly parts: Assembled;
  private readonly unwatchTurns: () => void;
  private readonly home: string;
  private backgroundStarted?: Promise<void>;

  constructor(options: PluginsOptions) {
    this.home = options.home;
    this.parts = assemble(options);
    this.hooks = this.parts.hookPort.hooks;
    this.router = {
      plugins: this.parts.service,
      accounts: this.parts.accounts,
      listChanges: this.parts.listChanges,
    };
    this.attachHooks();

    this.unwatchTurns = watchTurnActivity(options.sessions, (active) => {
      this.parts.runtime.turnsChanged(active);
    });
  }

  readonly openAsset: PluginRuntime['openAsset'] = (reference) =>
    this.parts.runtime.openAsset(reference);

  // Called after HTTP binds. Background work cannot delay readiness or start twice.
  listening(): void {
    this.backgroundStarted ??= startBackgroundPlugins(
      this.parts.service,
      this.home,
    );
  }

  async close(): Promise<void> {
    await this.backgroundStarted;
    this.unwatchTurns();
    this.parts.hookPort.detach();
    this.parts.listChanges.close();
    await this.parts.runtime.close();
  }

  private attachHooks(): void {
    this.parts.hookPort.attach({
      run: (name, event) => this.parts.service.runHooks(name, event),
      log: (line) => writeLog({ home: this.home, label: 'plugins', line }),
    });
  }
}
