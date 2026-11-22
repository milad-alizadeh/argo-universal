import type { BuildContext } from 'esbuild';
import { createActor, type Actor } from 'xstate';
import type { ActivatedPlugin } from '../access/plugin-access';
import { watchPlugin, type BundleCallbacks } from '../dev/bundle';
import { crashed, runtimeError } from '../protocol/runtime';
import type { PluginStatus } from '../protocol/runtime';
import type { BuildEvent, Loaded, RuntimePluginInput } from './plugin-events';
import { runtimePluginMachine } from './plugin.machine';

type Waiter = (status: PluginStatus) => void;

/*
 * One Plugin in the runtime: its lifecycle machine, the dev build it watches and the activations
 * waiting on it. The loader admits shipped Plugins and explicit links in an isolated watch Server (ADR-0030).
 */
export class RuntimePlugin {
  private readonly actor: Actor<typeof runtimePluginMachine>;
  private readonly build: Promise<BuildContext>;
  private waiters: Waiter[] = [];
  // The newest build's outcome, which a Draft shown on request applies.
  private latest: BuildEvent | null = null;

  constructor(private readonly input: Omit<RuntimePluginInput, 'answer'>) {
    this.actor = createActor(runtimePluginMachine, {
      input: { ...input, answer: (status) => this.answer(status) },
    }).start();
    this.build = watchPlugin(input.entry, this.buildEvents(input), input.watch);
    void this.build.catch((cause: unknown) =>
      this.actor.send({ type: 'build.failed', error: runtimeError(cause) }),
    );
  }

  // A build that lands or fails is the machine's to hear; a landing also tells what was read from the folder.
  private buildEvents(
    input: Pick<RuntimePluginInput, 'rebuilt'>,
  ): BundleCallbacks {
    return {
      loaded: (source, version) => {
        input.rebuilt?.();
        const landed: Loaded = { type: 'build.loaded', source, version };
        this.latest = landed;
        this.actor.send(landed);
      },
      failed: (error) => {
        const failed: BuildEvent = { type: 'build.failed', error };
        this.latest = failed;
        this.actor.send(failed);
      },
    };
  }

  get status(): PluginStatus {
    return this.actor.getSnapshot().context.status;
  }

  // The latest manifest's Grants apply from the next worker that loads.
  activate(granted: ActivatedPlugin): Promise<PluginStatus> {
    const pending = Promise.withResolvers<PluginStatus>();
    this.waiters.push(pending.resolve);
    this.actor.send({ type: 'plugin.activate', granted });

    return pending.promise;
  }

  update(status: PluginStatus, generation: number): void {
    this.actor.send({ type: 'worker.status', status, generation });
  }

  /*
   * Rebuilds at once, even while a Turn runs, and swaps the worker only when the build passes.
   * A broken build keeps the current worker and answers with its error.
   */
  async showDraft(): Promise<string | null> {
    if (this.input.watch === false)
      return 'Drafts need a Server running with --watch; this one builds Plugins once.';

    try {
      await (await this.build).rebuild();
    } catch (cause) {
      return this.latest && 'error' in this.latest
        ? this.latest.error
        : runtimeError(cause);
    }

    // The build this waited on may be the watcher's, which the machine deferred; the Draft applies it now.
    if (this.latest && 'source' in this.latest)
      this.actor.send({ ...this.latest, immediate: true });

    return null;
  }

  // A crash answers every activation until a background pass lets the next one try again.
  restartAfterCrash(): void {
    this.actor.send({ type: 'plugin.restart' });
  }

  hostCrashed(message: string): void {
    this.actor.send({ type: 'host.crashed', message });
  }

  // Turns ended: a dev build deferred while they ran applies now.
  flushReload(): void {
    this.actor.send({ type: 'turns.ended' });
  }

  async stop(): Promise<void> {
    this.actor.send({ type: 'plugin.stop' });
    await this.dispose();
  }

  async close(): Promise<void> {
    this.actor.send({ type: 'plugin.close' });
    this.answer(crashed('Plugin runtime closed'));
    await this.dispose();
  }

  private answer(status: PluginStatus): void {
    const waiters = this.waiters;
    this.waiters = [];

    for (const resolve of waiters) resolve(status);
  }

  private async dispose(): Promise<void> {
    await this.build.then(
      (build) => build.dispose(),
      () => {},
    );
  }
}
