import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import type {
  RunConfigurationRow,
  RunConfigurationStatus,
  RunLogsResult,
  RunStartResult,
  RunStopResult,
} from '@repo/contracts';
import type { Database } from '@repo/db';
import {
  writeDatabaseJobAndWaitForCommit,
  type WriterActorRef,
} from '../storage';
import { LiveRun } from './live-run';
import { RunBlocks, starterName } from './run-blocks';
import type { RunConfiguration } from './run-configurations';
import { readRunFile, requireRunConfiguration } from './run-file';
import { RunLifecycle } from './run-lifecycle';
import {
  readRunOutputTail,
  removeRunOutput,
  runOutputPath,
  createRunOutput,
} from './run-output';
import { bindable, portListening, urlOf } from './run-ports';
import { awaitReady } from './run-ready';
import { latestRun, RunWriteJob, type RunRecord } from './run-store';
import { RunTerminals, type Standing } from './run-terminals';
import type { TerminalProcess, TerminalSpawner } from './terminal';

// The Checkout a Run belongs to: Sessions on the same one see the same Runs.
export type RunCheckout = { projectId: string; checkoutPath: string };

// The Session that asks, named in a refusal when its Run holds a port someone else wants.
export type RunStarter = { id: string; title: string };

// A Run Configuration's Checkout, and the Session that asks for its Run.
export type RunRequest = RunCheckout & { starter?: RunStarter };

export type RunsInput = {
  database: Database;
  writer: WriterActorRef;
  home: string;
  spawn: TerminalSpawner;
  now: () => number;
  createId: () => string;
  // Whether nothing listens on a port; tests do not replace it.
  portFree?: (port: number) => Promise<boolean>;
};

const defaultStartMs = 60_000;

const defaultTailCharacters = 4000;

const readyPollMs = 100;

const keyOf = (
  { projectId, checkoutPath }: RunCheckout,
  name: string,
): string => JSON.stringify([projectId, checkoutPath, name]);

const statusOf = (record: RunRecord | undefined): RunConfigurationStatus =>
  record?.status ?? 'stopped';

// A Run Configuration with no `ready` is ready once its port listens.
const readyPattern = ({ ready }: RunConfiguration): RegExp | undefined =>
  ready && 'pattern' in ready ? new RegExp(ready.pattern, 'u') : undefined;

/*
 * The Runs of every Checkout on this Server (ADR-0063): each is a terminal the Server owns, recorded to a file of its own and
 * in its own table, apart from Background Tasks. Callers reach it only through the `run.*` Operations.
 */
export class Runs {
  private readonly live = new Map<string, LiveRun>();
  // The latest Run of each Run Configuration this Server has started, so a read never waits on the database.
  private readonly latest = new Map<string, RunRecord>();
  private readonly lifecycle = new RunLifecycle(this.live);
  public readonly terminals = new RunTerminals(this);
  private readonly blocks: RunBlocks;
  public constructor(private readonly input: RunsInput) {
    this.blocks = new RunBlocks(
      () => this.live.values(),
      input.portFree ?? bindable,
    );
  }

  public async start(
    checkout: RunRequest,
    name: string,
    timeoutMs = defaultStartMs,
  ): Promise<RunStartResult> {
    const configuration = await this.configuration(checkout, name);

    return awaitReady(await this.running(checkout, configuration), timeoutMs);
  }

  public async stop(
    checkout: RunCheckout,
    name: string,
  ): Promise<RunStopResult> {
    await this.configuration(checkout, name);
    await this.lifecycle.stop(keyOf(checkout, name));

    return { name, status: statusOf(this.record(checkout, name)) };
  }

  public async restart(
    checkout: RunRequest,
    name: string,
    timeoutMs = defaultStartMs,
  ): Promise<RunStartResult> {
    const configuration = await this.configuration(checkout, name);
    await this.lifecycle.stop(keyOf(checkout, name));

    return awaitReady(await this.running(checkout, configuration), timeoutMs);
  }

  public async status(
    checkout: RunCheckout,
  ): Promise<{ configurations: RunConfigurationRow[] }> {
    const { configurations } = await readRunFile(checkout.checkoutPath);

    return {
      configurations: configurations.map(({ name, command }) => ({
        name,
        command,
        ...this.row(this.record(checkout, name)),
      })),
    };
  }

  public async logs(
    checkout: RunCheckout,
    name: string,
    tail = defaultTailCharacters,
  ): Promise<RunLogsResult> {
    await this.configuration(checkout, name);
    await this.live.get(keyOf(checkout, name))?.flushed();
    const record = this.record(checkout, name);

    return {
      name,
      status: statusOf(record),
      exitCode: record?.exitCode ?? null,
      output: record
        ? await readRunOutputTail(
            runOutputPath(this.input.home, record.id),
            tail,
          )
        : '',
    };
  }

  // The current Terminal, or its recording if it has exited or is being stopped.
  public async standing(
    checkout: RunCheckout,
    name: string,
  ): Promise<Standing> {
    await this.configuration(checkout, name);
    const current = this.live.get(keyOf(checkout, name));

    if (current?.stopping) await current.flushed();

    const record = this.record(checkout, name);

    return {
      live: current?.stopping ? undefined : current,
      record,
      output: record && runOutputPath(this.input.home, record.id),
    };
  }

  // End this Checkout's Runs before Git removes it.
  public removeCheckout(
    checkout: RunCheckout,
    remove: () => Promise<void>,
  ): Promise<void> {
    return this.lifecycle.removeCheckout(checkout, remove);
  }

  public close(): Promise<void> {
    return this.lifecycle.close();
  }

  private row(
    record: RunRecord | undefined,
  ): Omit<RunConfigurationRow, 'name' | 'command'> {
    return {
      status: statusOf(record),
      port: record?.port ?? null,
      url: record?.url ?? null,
      exitCode: record?.exitCode ?? null,
      startedAt: record?.startedAt ?? null,
    };
  }

  private record(checkout: RunCheckout, name: string): RunRecord | undefined {
    return (
      this.latest.get(keyOf(checkout, name)) ??
      latestRun(this.input.database, checkout, name)
    );
  }

  private configuration(
    checkout: RunCheckout,
    name: string,
  ): Promise<RunConfiguration> {
    return requireRunConfiguration(checkout.checkoutPath, name);
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
    configuration: RunConfiguration,
  ): Promise<LiveRun> {
    const previous = this.record(checkout, configuration.name);
    const ports = await this.blocks.reserve(checkout, configuration, previous);
    const record = this.newRecord(checkout, configuration, ports.port);
    const outputPath = runOutputPath(this.input.home, record.id);
    await createRunOutput(outputPath);

    const terminal = await this.spawn(checkout, configuration, {
      record,
      env: ports.env,
    });

    record.pid = terminal.pid ?? null;

    const run = new LiveRun({
      record,
      terminal,
      outputPath,
      configuration,
      block: ports.block,
      starter: starterName(checkout.starter),
    });

    return this.attach(checkout, run, previous);
  }

  private newRecord(
    { projectId, checkoutPath }: RunCheckout,
    configuration: RunConfiguration,
    port: number,
  ): RunRecord {
    return {
      id: this.input.createId(),
      projectId,
      checkoutPath,
      pid: null,
      name: configuration.name,
      command: configuration.command,
      cwd: configuration.cwd,
      port,
      url: urlOf(configuration, port),
      status: 'starting',
      exitCode: null,
      startedAt: this.input.now(),
      readyAt: null,
      endedAt: null,
    };
  }

  private async spawn(
    checkout: RunCheckout,
    configuration: RunConfiguration,
    { record, env }: { record: RunRecord; env: Record<string, string> },
  ): Promise<TerminalProcess> {
    try {
      return await this.input.spawn({
        id: record.id,
        command: configuration.command,
        cwd: resolve(checkout.checkoutPath, configuration.cwd),
        env: { ...configuration.env, ...env },
        port: record.port,
      });
    } catch (error) {
      await removeRunOutput(runOutputPath(this.input.home, record.id));
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

    run.terminal.onData((data) => run.append(data));
    run.terminal.onExit(({ exitCode }) => void this.exited(key, run, exitCode));
    void this.becomeReady(key, run);
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

  private async becomeReady(key: string, run: LiveRun): Promise<void> {
    const pattern = readyPattern(run.configuration);

    while (this.live.get(key) === run && !run.stopping) {
      const ready = pattern
        ? run.matches(pattern)
        : await portListening(run.record.port);

      if (ready && this.live.get(key) === run && !run.stopping)
        return this.markReady(key, run);
      await delay(readyPollMs);
    }
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

  private store(record: RunRecord, replaced: string[] = []): Promise<void> {
    return writeDatabaseJobAndWaitForCommit(
      this.input.writer,
      new RunWriteJob(record, replaced),
    );
  }
}
