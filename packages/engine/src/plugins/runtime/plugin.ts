import type { BuildContext } from 'esbuild';
import { createActor, type Actor } from 'xstate';
import type { ActivatedPlugin } from '../access/plugin-access';
import { watchPlugin } from '../dev/bundle';
import { crashed, runtimeError } from '../protocol/runtime';
import type { PluginStatus } from '../protocol/runtime';
import type { RuntimePluginInput } from './plugin-events';
import { runtimePluginMachine } from './plugin.machine';

type Waiter = (status: PluginStatus) => void;

/*
 * One Plugin in the runtime: its lifecycle machine, the dev build it watches and the activations
 * waiting on it. Only first-party Plugins load (the loader refuses the rest), and they run from source.
 */
export class RuntimePlugin {
  private readonly actor: Actor<typeof runtimePluginMachine>;
  private readonly build: Promise<BuildContext>;
  private waiters: Waiter[] = [];

  constructor(input: Omit<RuntimePluginInput, 'answer'>) {
    this.actor = createActor(runtimePluginMachine, {
      input: { ...input, answer: (status) => this.answer(status) },
    }).start();
    this.build = watchPlugin(input.entry, {
      loaded: (source, version) =>
        this.actor.send({ type: 'build.loaded', source, version }),
      failed: (error) => this.actor.send({ type: 'build.failed', error }),
    });
    void this.build.catch((cause: unknown) =>
      this.actor.send({ type: 'build.failed', error: runtimeError(cause) }),
    );
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
