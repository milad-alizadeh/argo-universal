import type { BuildContext } from 'esbuild';
import { watchPlugin } from './dev-bundle';
import type { HostConnection } from './host-connection';
import type { ActivatedPlugin } from './plugin-access';
import {
  notStarted,
  runtimeError,
  type PluginEntry,
  type PluginStatus,
} from './runtime-protocol';

type PluginInput = {
  entry: Omit<PluginEntry, 'generation'>;
  host: HostConnection;
  // Grants the Plugin its Capabilities as each worker loads; `release` takes them away again.
  grant: (plugin: ActivatedPlugin) => void;
  release: () => void;
  log: (line: string) => void;
  changed: (status: PluginStatus) => void;
};

export class RuntimePlugin {
  status = notStarted;
  private activation: Promise<PluginStatus> | null = null;
  private answer: ((status: PluginStatus) => void) | null = null;
  private build: Promise<BuildContext> | null = null;
  private closed = false;
  private source: string | undefined;
  private buildError: string | null = null;
  private generation = 0;
  // Nothing is granted until the first activation names the manifest's Capabilities.
  private granted: ActivatedPlugin;

  constructor(private readonly input: PluginInput) {
    this.granted = { grants: [], codeFolder: input.entry.directory };
  }

  // The latest manifest's Grants apply from the next worker that loads.
  activate(granted: ActivatedPlugin): Promise<PluginStatus> {
    this.granted = granted;

    if (this.activation) return this.activation;
    const pending = this.awaitActivation();

    // Only first-party Plugins load (the loader refuses the rest), and they run from source.
    this.bundle();

    return pending;
  }

  private awaitActivation(): Promise<PluginStatus> {
    const pending = Promise.withResolvers<PluginStatus>();
    this.activation = pending.promise;
    this.answer = pending.resolve;

    return pending.promise;
  }

  update(status: PluginStatus, generation: number): void {
    if (generation !== this.generation) return;

    if (status.state === 'crashed') this.input.release();
    this.received(status);
  }

  private received(status: PluginStatus): void {
    this.status = status;
    this.input.changed(status);
    this.answer?.(status);
    this.answer = null;
    this.activation = Promise.resolve(status);

    if (status.error)
      this.input.log(`Plugin ${this.input.entry.pluginId}: ${status.error}`);
  }

  hostCrashed(message: string): void {
    if (this.status.state !== 'running' && !this.answer) return;
    this.input.release();
    this.received({ state: 'crashed', hanging: false, error: message });
    this.activation = null;
  }

  async stop(): Promise<void> {
    this.generation += 1;
    this.input.host.stop(this.input.entry.pluginId);
    this.received(notStarted);
    await this.close();
  }

  async close(): Promise<void> {
    this.closed = true;
    this.input.release();
    this.answer?.({
      state: 'crashed',
      hanging: false,
      error: 'Plugin runtime closed',
    });
    await this.build?.then(
      (build) => build.dispose(),
      () => {},
    );
  }

  private bundle(): void {
    if (this.build) return this.loadBundled();
    this.build = watchPlugin(this.input.entry, {
      loaded: (source) => this.reloaded(source),
      failed: (error) => this.buildFailed(error),
    });
    void this.build.catch((cause: unknown) =>
      this.buildFailed(runtimeError(cause)),
    );
  }

  private loadBundled(): void {
    if (this.buildError) return this.fail(this.buildError);

    if (this.source !== undefined) this.load();
  }

  private reloaded(source: string): void {
    if (this.closed) return;
    this.source = source;
    this.buildError = null;
    this.status = notStarted;
    this.input.changed(notStarted);

    if (!this.answer) void this.awaitActivation();
    this.stopWorker();
    this.load();
  }

  private stopWorker(): void {
    this.input.host.stop(this.input.entry.pluginId);
    this.input.release();
  }

  private load(): void {
    if (this.closed) return;

    try {
      this.generation += 1;
      this.input.grant(this.granted);
      this.input.host.activate({
        ...this.input.entry,
        source: this.source,
        generation: this.generation,
      });
    } catch (error) {
      this.fail(runtimeError(error));
    }
  }

  private fail(error: string): void {
    if (this.closed) return;
    this.generation += 1;
    this.stopWorker();
    this.received({ state: 'crashed', hanging: false, error });
  }

  private buildFailed(error: string): void {
    this.buildError = error;
    this.fail(error);
  }
}
