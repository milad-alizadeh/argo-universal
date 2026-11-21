import { resolve } from 'node:path';
import type {
  RunStartResult,
  RunStopResult,
  ShellTerminal,
} from '@repo/contracts';
import { writeDatabaseJobAndWaitForCommit } from '../storage';
import { LiveRun } from './live-run';
import { RunBlocks, starterName, type RunPortHolding } from './run-blocks';
import type { RunConfiguration } from './run-configurations';
import { requireRunConfiguration } from './run-file';
import { RunGroups } from './run-groups';
import { RunLifecycle } from './run-lifecycle';
import { removeRunOutput, runOutputPath, createRunOutput } from './run-output';
import { bindable } from './run-ports';
import { awaitReady, watchReadiness } from './run-ready';
import { newRunRecord } from './run-record';
import { configurationFingerprint, RunSettingsStore } from './run-settings';
import { latestRun, RunWriteJob, type RunRecord } from './run-store';
import { RunTerminals } from './run-terminals';
import { RunView, statusOf } from './run-view';
import type { RunCheckout, RunRequest, RunsInput } from './runs-input';
import { ShellTerminals } from './shell-terminals';
import type { TerminalProcess } from './terminal';

export type {
  RunCheckout,
  RunRequest,
  RunStarter,
  RunsInput,
} from './runs-input';

const defaultStartMs = 60_000;

const keyOf = (
  { projectId, checkoutPath }: RunCheckout,
  name: string,
): string => JSON.stringify([projectId, checkoutPath, name]);

/*
 * The Runs of every Checkout on this Server (ADR-0063): each is a terminal the Server owns, recorded to a file of its own and
 * in its own table, apart from Background Tasks.
 */
export class Runs {
  private readonly live = new Map<string, LiveRun>();
  // The latest Run of each Run Configuration this Server has started, so a read never waits on the database.
  private readonly latest = new Map<string, RunRecord>();
  private readonly lifecycle = new RunLifecycle(this.live);
  public readonly groups: RunGroups;
  public readonly settings: RunSettingsStore;
  public readonly view: RunView;
  public readonly shells: ShellTerminals;
  public readonly terminals: RunTerminals;
  private readonly blocks: RunBlocks;
  public constructor(private readonly input: RunsInput) {
    this.view = new RunView({
      home: input.home,
      shells: (checkout): ShellTerminal[] => this.shells.rows(checkout),
      live: (checkout, name): LiveRun | undefined =>
        this.live.get(keyOf(checkout, name)),
      record: (checkout, name): RunRecord | undefined =>
        this.record(checkout, name),
    });
    this.terminals = new RunTerminals(this.view);
    this.settings = new RunSettingsStore(input.database, input.writer);
    this.groups = new RunGroups({
      start: (checkout, configuration, timeoutMs): Promise<RunStartResult> =>
        this.startConfiguration(checkout, configuration, timeoutMs),
      stop: (checkout, name): Promise<RunStopResult> =>
        this.stopOne(checkout, name),
    });
    this.blocks = new RunBlocks(
      (): RunPortHolding[] => [
        ...this.live.values(),
        ...this.shells.holdings(),
      ],
      input.portFree ?? bindable,
    );
    this.shells = new ShellTerminals(input, {
      lifecycle: this.lifecycle,
      blocks: this.blocks,
      changed: (checkout): void => this.view.checkoutChanged(checkout),
    });
  }

  public async start(
    checkout: RunRequest,
    name: string,
    timeoutMs?: number,
  ): Promise<RunStartResult> {
    const configuration = await requireRunConfiguration(
      checkout.checkoutPath,
      name,
    );

    return this.startConfiguration(checkout, configuration, timeoutMs);
  }

  public stop(checkout: RunCheckout, name: string): Promise<RunStopResult> {
    return this.groups.stopMember(checkout, name);
  }

  private async stopOne(
    checkout: RunCheckout,
    name: string,
  ): Promise<RunStopResult> {
    await this.lifecycle.stop(keyOf(checkout, name));

    return { name, status: statusOf(this.record(checkout, name)) };
  }

  public async restart(
    checkout: RunRequest,
    name: string,
    timeoutMs?: number,
  ): Promise<RunStartResult> {
    const configuration = await requireRunConfiguration(
      checkout.checkoutPath,
      name,
    );

    await this.lifecycle.stop(keyOf(checkout, name));

    return this.startConfiguration(checkout, configuration, timeoutMs);
  }

  public async autoStart(checkout: RunRequest): Promise<void> {
    const configurations = await this.settings.autoStarts(checkout);

    await Promise.all(
      configurations.map((configuration) =>
        this.running({ ...checkout, automatic: true }, configuration),
      ),
    );
  }

  // End this Checkout's Runs before Git removes it.
  public removeCheckout(
    checkout: RunCheckout,
    remove: () => Promise<void>,
  ): Promise<void> {
    return this.lifecycle.removeCheckout(checkout, async () => {
      await this.shells.closeCheckout(checkout);
      await remove();
    });
  }

  public async close(): Promise<void> {
    await Promise.all([this.lifecycle.close(), this.shells.closeAll()]);
  }

  private record(checkout: RunCheckout, name: string): RunRecord | undefined {
    return (
      this.latest.get(keyOf(checkout, name)) ??
      latestRun(this.input.database, checkout, name)
    );
  }

  private async startConfiguration(
    checkout: RunRequest,
    configuration: RunConfiguration,
    timeoutMs = defaultStartMs,
  ): Promise<RunStartResult> {
    const run = await this.running(checkout, configuration);

    if (
      checkout.manual &&
      run.fingerprint === configurationFingerprint(configuration)
    )
      await this.settings.recordManual(checkout.projectId, configuration);

    return awaitReady(run, timeoutMs);
  }

  // The Run of this Run Configuration that already lives, or a new one; two starts at once make one.
  private running(
    checkout: RunRequest,
    configuration: RunConfiguration,
  ): Promise<LiveRun> {
    return this.lifecycle.start(
      keyOf(checkout, configuration.name),
      checkout,
      () => this.launch(checkout, configuration),
    );
  }

  private async launch(
    checkout: RunRequest,
    checkedIn: RunConfiguration,
  ): Promise<LiveRun> {
    const configuration = this.settings.effective(
      checkout.projectId,
      checkedIn,
    );

    const previous = this.record(checkout, configuration.name);
    const ports = await this.blocks.reserve(checkout, configuration, previous);

    const record = newRunRecord(checkout, configuration, {
      id: this.input.createId(),
      port: ports.port,
      startedAt: this.input.now(),
    });

    const fingerprint = configurationFingerprint(checkedIn);

    const terminal = await this.spawn(checkout, configuration, {
      record,
      env: ports.env,
      fingerprint,
    });

    record.pid = terminal.pid ?? null;

    const run = new LiveRun({
      record,
      terminal,
      outputPath: runOutputPath(this.input.home, record.id),
      configuration,
      fingerprint,
      block: ports.block,
      starter: starterName(checkout.starter),
    });

    return this.attach(checkout, run, previous);
  }

  private async spawn(
    checkout: RunRequest,
    configuration: RunConfiguration,
    {
      record,
      env,
      fingerprint,
    }: { record: RunRecord; env: Record<string, string>; fingerprint: string },
  ): Promise<TerminalProcess> {
    const outputPath = runOutputPath(this.input.home, record.id);

    await createRunOutput(outputPath);

    try {
      if (checkout.automatic)
        this.settings.requireAutoStart(
          { projectId: checkout.projectId, name: configuration.name },
          fingerprint,
        );

      return await this.input.spawn({
        id: record.id,
        command: configuration.command,
        cwd: resolve(checkout.checkoutPath, configuration.cwd),
        env: { ...configuration.env, ...env },
        port: record.port,
      });
    } catch (error) {
      await removeRunOutput(outputPath);
      throw error;
    }
  }

  // Listens to the terminal before anything awaits, so no output or exit is missed.
  private async attach(
    checkout: RunCheckout,
    run: LiveRun,
    previous: RunRecord | undefined,
  ): Promise<LiveRun> {
    const key = keyOf(checkout, run.record.name);
    this.live.set(key, run);
    this.latest.set(key, run.record);
    const stored = this.store(run.record, previous ? [previous.id] : []);

    run.terminal.onData((data) => {
      run.append(data);
      void run.flushed().then(() => this.view.outputChanged(run.record));
    });
    run.terminal.onExit(({ exitCode }) => void this.exited(key, run, exitCode));
    void watchReadiness(
      run,
      () => this.live.get(key) === run,
      () => this.markReady(key, run),
    );
    await stored;

    if (previous)
      await removeRunOutput(runOutputPath(this.input.home, previous.id));

    return run;
  }

  private async exited(
    key: string,
    run: LiveRun,
    exitCode: number,
  ): Promise<void> {
    if (!run.stopping) this.live.delete(key);
    await run.flushed();
    await this.update(key, run, {
      status: run.stopping ? 'stopped' : 'crashed',
      exitCode,
      endedAt: this.input.now(),
    });
    run.ended.resolve();
  }

  private async markReady(key: string, run: LiveRun): Promise<void> {
    await this.update(key, run, {
      status: 'ready',
      readyAt: this.input.now(),
    });
    run.ready.resolve();
  }

  private async update(
    key: string,
    run: LiveRun,
    change: Partial<RunRecord>,
  ): Promise<void> {
    run.record = { ...run.record, ...change };

    if (this.latest.get(key)?.id === run.record.id)
      this.latest.set(key, run.record);
    await this.store(run.record);
  }

  private async store(
    record: RunRecord,
    replaced: string[] = [],
  ): Promise<void> {
    await writeDatabaseJobAndWaitForCommit(
      this.input.writer,
      new RunWriteJob(record, replaced),
    );
    this.view.changed(record);
  }
}
