import type { PluginManifest } from '@repo/contracts/plugins';
import type { PluginDraws } from '../pages';
import { runtimeError } from '../protocol/runtime';
import { backgroundBudgetMs } from './query-intervals';
import type { QueryServices } from './query-types';

export type BackgroundEntry = {
  pluginId: string;
  declaration: NonNullable<PluginManifest['contributes']['background']>;
  activate: () => Promise<void>;
};

export type BackgroundServices = Pick<QueryServices, 'clock' | 'log'> & {
  draws: PluginDraws;
  // A removed Project's kept answers end with its passes.
  projectRemoved: (projectId: string) => void;
};

// `enter` holds the pass back while too many others are running, and answers with its release.
type PassServices = BackgroundServices & { enter: () => Promise<() => void> };

// One Project's pass (ADR-0050): on its interval the page's `load` runs alone, with no render and no tree.
export class BackgroundPass {
  private closed = false;
  private cancel: () => void = () => {};
  private finish: () => void = () => {};

  constructor(
    readonly entry: BackgroundEntry,
    readonly projectId: string,
    private readonly services: PassServices,
  ) {}

  start(): void {
    void this.run();
  }

  close(): void {
    this.closed = true;
    this.cancel();
    this.finish();
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
    if (this.closed) return;
    await this.entry.activate();

    if (this.closed) return;
    await this.pass();
  }

  private schedule(): void {
    if (this.closed) return;
    this.cancel = this.services.clock.schedule(
      () => this.start(),
      this.entry.declaration.interval,
    );
  }

  // The budget is scheduled before the load's own limit of the same length, so on that clock it ends first.
  private async pass(): Promise<void> {
    const ended = Promise.withResolvers<string>();

    const deadline = this.services.clock.schedule((): void => {
      ended.resolve(`reached ${backgroundBudgetMs} ms`);
    }, backgroundBudgetMs);

    this.finish = (): void => {
      ended.resolve('closed');
    };

    try {
      this.line(await Promise.race([this.load(), ended.promise]));
    } finally {
      deadline();
      this.finish = (): void => {};
    }
  }

  private async load(): Promise<string> {
    const { pluginId, declaration } = this.entry;

    const loaded = await this.services.draws.load(
      pluginId,
      {
        path: declaration.path,
        projectId: this.projectId,
      },
      backgroundBudgetMs,
    );

    return loaded.ok ? 'completed' : `failed: ${loaded.error}`;
  }

  private line(message: string): void {
    this.services.log(
      `Plugin ${this.entry.pluginId}: background pass ${message} (Project ${this.projectId})`,
    );
  }
}
