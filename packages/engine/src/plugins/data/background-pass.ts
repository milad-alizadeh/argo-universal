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
  settled?: () => boolean;
};

export type BackgroundServices = Pick<QueryServices, 'clock' | 'log'> & {
  views: PluginViews;
  data: PluginData;
};

export class BackgroundPass {
  private running: RunningPass | undefined;
  private closed = false;
  private paused = false;
  private cancel: () => void = () => {};

  constructor(
    readonly entry: BackgroundEntry,
    readonly projectId: string,
    private readonly services: BackgroundServices,
  ) {}

  start(): void {
    void this.run();
  }

  rendered(viewId: PluginViewId): void {
    const pass = this.running;

    if (!pass) return;

    if (pass.viewId === viewId) this.settle(pass);
  }

  private settle(pass: RunningPass): void {
    pass.settled ??= this.services.data.firstQueries(pass.viewId);

    if (pass.settled()) pass.finish();
  }

  released(viewId: PluginViewId): void {
    if (this.running?.viewId === viewId) this.running.finish();
  }

  pause(): void {
    this.paused = true;
    this.cancel();
    this.finish();
  }

  resume(): void {
    if (!this.paused) return;
    this.paused = false;
    this.start();
  }

  close(): void {
    this.closed = true;
    this.pause();
  }

  private finish(): void {
    this.running?.finish();
  }

  private stopped(): boolean {
    return this.closed || this.paused;
  }

  private async run(): Promise<void> {
    try {
      await this.entry.activate();

      if (this.stopped()) return;
      await this.pass();
    } catch (cause) {
      this.line(`failed: ${runtimeError(cause)}`);
    }

    this.schedule();
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
