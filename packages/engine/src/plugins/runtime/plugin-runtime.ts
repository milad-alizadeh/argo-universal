import type { PluginFailure } from '@repo/contracts/plugins/runtime';
import { realClock, type PluginClock } from '../clock';
import type { QueryServices } from '../data/query-types';
import { hostHooks } from '../hooks/host-hooks';
import { keepWaiting } from '../hooks/keep-waiting';
import { HostConnection } from '../host/connection';
import type {
  PluginReply,
  HostMessage,
  PluginStatus,
} from '../protocol/runtime';
import type { PluginServices } from '../services/plugin-services';
import {
  fallbackKey,
  forgetOnce,
  logOnce,
  renderFallbackLine,
} from '../views/render-fallback';
import { answerPluginCall } from './calls';
import type { PluginLocation } from './plugin-location';
import { PluginTurns } from './plugin-turns';
import { RuntimeClock } from './runtime-clock';
import { RuntimePlugins } from './runtime-plugins';
import { RuntimeResources } from './runtime-resources';

export class PluginRuntime {
  private readonly plugins;
  private readonly resources;
  private readonly host: HostConnection;
  readonly hooks;
  private hostError: string | null = null;
  private readonly clock;
  readonly turns = new PluginTurns(() => this.plugins.values());

  constructor(
    private readonly log: (line: string) => void,
    private readonly services: PluginServices,
    clock: PluginClock = realClock,
  ) {
    this.host = new HostConnection(this.callbacks());
    this.clock = new RuntimeClock(this.host.tests, clock);
    this.hooks = hostHooks(this.host, this.log, this.clock.source);
    this.resources = new RuntimeResources(this.resourceInput());
    this.plugins = new RuntimePlugins(this.pluginInput());
  }

  private pluginInput(): ConstructorParameters<typeof RuntimePlugins>[0] {
    return {
      host: this.host,
      hooks: this.hooks,
      clock: this.clock,
      resources: this.resources,
      log: this.log,
      turnsRunning: () => this.turns.running,
    };
  }

  private resourceInput(): QueryServices {
    return {
      services: this.services,
      clock: this.clock.source,
      log: this.log,
      send: (pluginId, event): void => this.host.event(pluginId, event),
      during: <T>(call: () => Promise<T>): Promise<T> =>
        this.clock.during(call),
    };
  }

  get views(): RuntimeResources['views'] {
    return this.resources.views;
  }
  get data(): RuntimeResources['data'] {
    return this.resources.data;
  }
  get background(): RuntimeResources['background'] {
    return this.resources.background;
  }

  refreshProjects(): Promise<void> {
    return this.resources.refreshProjects();
  }

  public advanceClock(_pluginId: string, ms: number): Promise<void> {
    return this.clock.advance(() => this.plugins.runningIds(), ms);
  }

  public renderFallback(
    pluginId: string,
    slotId: string,
    reason: string,
  ): void {
    logOnce(
      this.log,
      fallbackKey('runtime', pluginId, slotId),
      renderFallbackLine(pluginId, slotId, reason),
    );
  }

  private callbacks(): ConstructorParameters<typeof HostConnection>[0] {
    return {
      log: this.log,
      call: (message): Promise<PluginReply> =>
        this.clock.during(() => this.answer(message)),
      status: (message): void => this.plugins.update(message),
      crash: (message): void => this.crashed(message),
    };
  }

  private answer(
    message: Extract<HostMessage, { type: 'call' }>,
  ): Promise<PluginReply> {
    return answerPluginCall(
      {
        hooks: this.hooks,
        services: this.services,
        views: this.views,
        data: this.data,
      },
      message,
    );
  }

  waiting(pluginId: string, generation: number): () => void {
    return keepWaiting((command) => this.host.tell(command), {
      pluginId,
      generation,
    });
  }

  status(pluginId: string): PluginStatus {
    return this.plugins.status(pluginId);
  }

  public readonly openAsset: PluginServices['openAsset'] = (reference) =>
    this.services.openAsset(reference);

  error(): string | null {
    return this.hostError;
  }

  public watchFailures(signal: AbortSignal): AsyncGenerator<PluginFailure[]> {
    return this.resources.failures.watch(signal);
  }

  activate(location: PluginLocation): Promise<PluginStatus> {
    return this.plugins.activate(location);
  }
  async deactivate(pluginId: string): Promise<void> {
    await this.plugins.deactivate(pluginId);
    forgetOnce(this.log, pluginId);
  }

  async close(): Promise<void> {
    this.resources.close();
    await this.plugins.close();
    await this.host.close();
    this.services.close();
  }

  private crashed(message: string): void {
    this.hostError = message;
    this.plugins.crashed(message);
  }
}
