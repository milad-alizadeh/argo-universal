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
  forgetOnce,
  logFallback,
  type Fallback,
} from '../views/render-fallback';
import { answerPluginCall } from './calls';
import type { PluginLocation } from './plugin-location';
import { RuntimePlugins } from './runtime-plugins';
import { RuntimeResources } from './runtime-resources';
import { TestControl } from './test-control';

export class PluginRuntime {
  readonly hooks;
  // What a Plugin's test kit drives: the clock every deadline and worker realm share.
  readonly testControl: TestControl;
  readonly views: RuntimeResources['views'];
  readonly data: RuntimeResources['data'];
  readonly items: RuntimeResources['items'];
  readonly operations: RuntimeResources['operations'];
  readonly background: RuntimeResources['background'];
  private readonly plugins: RuntimePlugins;
  private readonly resources: RuntimeResources;
  private readonly host: HostConnection;
  private hostError: string | null = null;

  constructor(
    private readonly log: (line: string) => void,
    readonly services: PluginServices,
    clock: PluginClock = realClock,
  ) {
    this.host = new HostConnection(this.callbacks());
    this.connectAccounts();
    this.testControl = this.controlFor(clock);
    this.hooks = hostHooks(this.host, this.log, clock);
    this.resources = new RuntimeResources(this.resourceInput());
    ({ views: this.views, data: this.data } = this.resources);
    ({ items: this.items, background: this.background } = this.resources);
    this.operations = this.resources.operations;
    this.plugins = new RuntimePlugins(this.pluginInput());
  }

  private connectAccounts(): void {
    this.services.accountCalls.connect((pluginId, generation, invocation) =>
      this.host.tell({ ...invocation, pluginId, generation }),
    );
  }

  private controlFor(clock: PluginClock): TestControl {
    return new TestControl({
      clock,
      tell: (command): void => this.host.tell(command),
      running: (): string[] => this.plugins.runningIds(),
    });
  }

  private pluginInput(): ConstructorParameters<typeof RuntimePlugins>[0] {
    return {
      host: this.host,
      hooks: this.hooks,
      clockStart: () => this.testControl.workerStart(),
      resources: this.resources,
      log: this.log,
    };
  }

  private resourceInput(): QueryServices {
    return {
      services: this.services,
      clock: this.testControl.clock,
      log: this.log,
      send: (pluginId, event): void => this.host.event(pluginId, event),
      during: <T>(call: () => Promise<T>): Promise<T> =>
        this.testControl.during(call),
    };
  }

  refreshProjects(): Promise<void> {
    return this.resources.refreshProjects();
  }

  // While any Turn can be writing Plugin sources, workers keep their last complete build.
  turnsChanged(active: boolean): void {
    this.plugins.turnsChanged(active);
  }

  public renderFallback(fallback: Fallback): void {
    logFallback(this.log, 'runtime', fallback);
  }

  public contributionFailed(fallback: Fallback): void {
    logFallback(this.log, 'contribution', fallback);
  }

  private callbacks(): ConstructorParameters<typeof HostConnection>[0] {
    return {
      log: this.log,
      call: (message): Promise<PluginReply> =>
        this.testControl.during(() => this.answer(message)),
      status: (message): void => this.plugins.update(message),
      test: (message): void => this.testControl.settle(message),
      crash: (message): void => this.crashed(message),
    };
  }

  private answer(
    message: Extract<HostMessage, { type: 'call' }>,
  ): Promise<PluginReply> {
    const { hooks, services } = this;

    return answerPluginCall(this.resources.calls({ hooks, services }), message);
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
