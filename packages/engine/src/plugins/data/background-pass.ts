import type { PluginManifest } from '@repo/contracts/plugins';
import type { PluginDraws } from '../pages';
import { runtimeError } from '../protocol/runtime';
import {
  backgroundBudgetMs,
  backgroundFloorMs,
  watchFloorMs,
} from './query-intervals';
import type { QueryServices } from './query-types';

export type BackgroundEntry = {
  pluginId: string;
  declaration: NonNullable<
    PluginManifest['contributes']['background' | 'watch']
  >;
  activate: () => Promise<void>;
};

/*
 * Which entry the passes run: a Background pass runs a Loader that only reads, and a Watch (ADR-0055) runs the
 * function `argo.watch.define` gave its path, which may act. Both share one interval and budget machinery.
 */
export type PassKind = 'background pass' | 'watch';

// What each kind is called in an interval's log line, and the least interval it runs on.
export const passTerms: Record<PassKind, { name: string; floorMs: number }> = {
  'background pass': { name: 'background', floorMs: backgroundFloorMs },
  watch: { name: 'watch', floorMs: watchFloorMs },
};

export type BackgroundServices = Pick<QueryServices, 'clock' | 'log'> & {
  kind: PassKind;
  draws: Pick<PluginDraws, 'load'>;
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
    const gate = await this.services.enter();
    let left = false;

    // An overrunning pass leaves the shared gate at its budget, and once more when it ends, so it never leaves twice.
    const leave = (): void => {
      if (left) return;
      left = true;
      gate();
    };

    try {
      await this.activateAndPass(leave);
    } catch (cause) {
      this.line(`failed: ${runtimeError(cause)}`);
    } finally {
      leave();
    }

    this.schedule();
  }

  // Closing while the pass waited its turn at the gate, or while the Plugin started, ends it here.
  private async activateAndPass(leave: () => void): Promise<void> {
    if (this.closed) return;
    await this.entry.activate();

    if (this.closed) return;
    await this.pass(leave);
  }

  private schedule(): void {
    if (this.closed) return;
    this.cancel = this.services.clock.schedule(
      () => this.start(),
      this.entry.declaration.interval,
    );
  }

  /*
   * The load has no limit of its own, so it ends when the Plugin's code does or its worker ends, and this Project's
   * next pass waits for that. At the budget the pass says so and leaves the gate, so other Plugins' and Projects'
   * passes run; each interval after, it says it is still running. Nothing here ends the worker.
   */
  private async pass(leave: () => void): Promise<void> {
    const closed = Promise.withResolvers<string>();
    let cancel: (() => void) | undefined;

    const remind = (afterMs: number, message: string): void => {
      cancel = this.services.clock.schedule((): void => {
        this.line(message);
        leave();
        remind(this.entry.declaration.interval, 'still running');
      }, afterMs);
    };

    remind(backgroundBudgetMs, `reached ${backgroundBudgetMs} ms`);

    this.finish = (): void => {
      closed.resolve('closed');
    };

    try {
      this.line(await Promise.race([this.load(), closed.promise]));
    } finally {
      cancel?.();
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
        ...(this.services.kind === 'watch' && { watch: true }),
      },
      null,
    );

    return loaded.ok ? 'completed' : `failed: ${loaded.error}`;
  }

  private line(message: string): void {
    this.services.log(
      `Plugin ${this.entry.pluginId}: ${this.services.kind} ${message} (Project ${this.projectId})`,
      message === 'completed' || message === 'closed' ? 'trace' : undefined,
    );
  }
}
