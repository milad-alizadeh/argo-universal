import type { PluginManifest } from '@repo/contracts/plugins';
import type { PluginViewId } from '@repo/contracts/plugins/wire';
import { runtimeError } from '../protocol/runtime';
import type { PluginViews } from '../views/plugin-views';
import type { PluginData } from './plugin-data';
import { backgroundBudgetMs } from './query-intervals';
import type { QueryServices } from './query-types';

export type BackgroundEntry = {
  pluginId: string;
  declaration: NonNullable<PluginManifest['contributes']['background']>;
  activate: () => Promise<void>;
};

type RunningPass = {
  viewId: PluginViewId;
  close: () => void;
  finish: () => void;
};

export type BackgroundServices = Pick<QueryServices, 'clock' | 'log'> & {
  views: PluginViews;
  data: PluginData;
};

// `enter` holds the pass back while too many others are running, and answers with its release.
type PassServices = BackgroundServices & { enter: () => Promise<() => void> };

export class BackgroundPass {
  private running: RunningPass | undefined;
  private closed = false;
  private cancel: () => void = () => {};

  constructor(
    readonly entry: BackgroundEntry,
    readonly projectId: string,
    private readonly services: PassServices,
  ) {}

  start(): void {
    void this.run();
  }

  rendered(viewId: PluginViewId): void {
    const pass = this.running;

    if (!pass) return;

    if (pass.viewId === viewId) this.settle(pass);
  }

  // Every render is asked again: a Plugin that chains Queries declares the next one on a later render.
  private settle(pass: RunningPass): void {
    if (this.services.data.queriesSettled(pass.viewId)) pass.finish();
  }

  released(viewId: PluginViewId): void {
    if (this.running?.viewId === viewId) this.running.finish();
  }

  close(): void {
    this.closed = true;
    this.cancel();
    this.running?.finish();
  }

  private stopped(): boolean {
    return this.closed;
  }

  private async run(): Promise<void> {
    const leave = await this.services.enter();

    try {
      await this.activateAndPass();
    } catch (cause) {
      this.line(`failed: ${runtimeError(cause)}`);
    } finally {
      leave();
    }

    this.schedule();
  }

  // Closing while the pass waited its turn at the gate, or while the Plugin started, ends it here.
  private async activateAndPass(): Promise<void> {
    if (this.stopped()) return;
    await this.entry.activate();

    if (this.stopped()) return;
    await this.pass();
  }

  private schedule(): void {
    if (this.stopped()) return;
    this.cancel = this.services.clock.schedule(
      () => this.start(),
      this.entry.declaration.interval,
    );
  }

  private async pass(): Promise<void> {
    const done = Promise.withResolvers<void>();
    const mounted = this.mount();
    const deadline = this.deadline(done.resolve);

    this.running = { ...mounted, finish: done.resolve };

    try {
      await done.promise;
    } finally {
      this.running = undefined;
      deadline();
      mounted.close();
      this.line('completed');
    }
  }

  private mount(): ReturnType<PluginViews['headless']> {
    const { pluginId, declaration } = this.entry;

    return this.services.views.headless(
      pluginId,
      { path: declaration.path, projectId: this.projectId },
      declaration.interval,
    );
  }

  private deadline(finish: () => void): () => void {
    return this.services.clock.schedule(() => {
      this.line(`reached ${backgroundBudgetMs} ms`);
      finish();
    }, backgroundBudgetMs);
  }

  private line(message: string): void {
    this.services.log(
      `Plugin ${this.entry.pluginId}: background pass ${message} (Project ${this.projectId})`,
    );
  }
}
