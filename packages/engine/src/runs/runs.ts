import { randomUUID } from 'node:crypto';
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
import type { RunConfiguration } from './run-configurations';
import { readRunFile, requireRunConfiguration } from './run-file';
import {
  readRunOutputTail,
  removeRunOutput,
  runOutputPath,
  createRunOutput,
} from './run-output';
import {
  allocateBlock,
  allocatePort,
  bindable,
  blockPorts,
  blockSize,
  portListening,
  urlOf,
} from './run-ports';
import { awaitReady } from './run-ready';
import { latestRun, RunWriteJob, type RunRecord } from './run-store';
import type { TerminalProcess, TerminalSpawner } from './terminal';

// The Checkout a Run belongs to: Sessions on the same one see the same Runs.
export type RunCheckout = { projectId: string; checkoutPath: string };

// The Session that asks, named in a refusal when its Run holds a port someone else wants.
export type RunStarter = { id: string; title: string };

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

const checkoutKeyOf = ({ projectId, checkoutPath }: RunCheckout): string =>
  JSON.stringify([projectId, checkoutPath]);

const starterName = ({ id, title }: RunStarter): string =>
  title ? `Session "${title}"` : `Session ${id}`;

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
  private readonly launching = new Map<string, Promise<LiveRun>>();
  // The block each Checkout last had, so it gets the same ports back once its Runs end and start again.
  private readonly lastBlocks = new Map<string, number>();
  // Launches queue, so two Runs of one Checkout never each reserve a block.
  private queue: Promise<unknown> = Promise.resolve();
  public constructor(private readonly input: RunsInput) {}

  public async start(
    checkout: RunCheckout,
    name: string,
    timeoutMs = defaultStartMs,
    starter: RunStarter = { id: 'unknown', title: '' },
  ): Promise<RunStartResult> {
    const configuration = await this.configuration(checkout, name);

    return awaitReady(
      await this.running(checkout, configuration, starter),
      timeoutMs,
    );
  }

  public async stop(
    checkout: RunCheckout,
    name: string,
  ): Promise<RunStopResult> {
    await this.configuration(checkout, name);
    await this.end(this.live.get(keyOf(checkout, name)));

    return { name, status: statusOf(this.record(checkout, name)) };
  }

  public async restart(
    checkout: RunCheckout,
    name: string,
    timeoutMs = defaultStartMs,
    starter: RunStarter = { id: 'unknown', title: '' },
  ): Promise<RunStartResult> {
    const configuration = await this.configuration(checkout, name);
    await this.end(this.live.get(keyOf(checkout, name)));

    return awaitReady(
      await this.running(checkout, configuration, starter),
      timeoutMs,
    );
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

  // Ends every Run: the Server never leaves one behind.
  public async close(): Promise<void> {
    await Promise.all([...this.live.values()].map((run) => this.end(run)));
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
    checkout: RunCheckout,
    configuration: RunConfiguration,
    starter: RunStarter,
  ): Promise<LiveRun> {
    const key = keyOf(checkout, configuration.name);
    const existing = this.live.get(key);

    if (existing) return Promise.resolve(existing);

    const launching =
      this.launching.get(key) ??
      this.queued(() => this.launch(checkout, configuration, starter)).finally(
        () => this.launching.delete(key),
      );

    this.launching.set(key, launching);

    return launching;
  }

  private queued<Result>(task: () => Promise<Result>): Promise<Result> {
    const result = this.queue.then(task);
    this.queue = result.catch((): void => undefined);

    return result;
  }

  private async launch(
    checkout: RunCheckout,
    configuration: RunConfiguration,
    starter: RunStarter,
  ): Promise<LiveRun> {
    const previous = this.record(checkout, configuration.name);
    const block = await this.blockOf(checkout);
    const record = await this.newRecord(
      checkout,
      configuration,
      previous,
      block,
    );
    const outputPath = runOutputPath(this.input.home, record.id);
    await createRunOutput(outputPath);
    const terminal = await this.spawn(checkout, configuration, record, block);
    record.pid = terminal.pid ?? null;
    const run = new LiveRun({
      record,
      terminal,
      outputPath,
      configuration,
      block,
      starter: starterName(starter),
    });

    return this.attach(checkout, run, previous);
  }

  private async newRecord(
    checkout: RunCheckout,
    configuration: RunConfiguration,
    previous: RunRecord | undefined,
    block: number,
  ): Promise<RunRecord> {
    const checkoutKey = checkoutKeyOf(checkout);

    const own = [...this.live.values()].filter(
      (run) => checkoutKeyOf(run.record) === checkoutKey,
    );

    const port = await allocatePort({
      configuration,
      previous: previous?.port,
      block: blockPorts(block),
      taken: new Set(own.map((run) => run.record.port)),
      holder: (candidate) => this.holder(candidate, checkoutKey),
      free: this.input.portFree ?? bindable,
    });

    return {
      id: this.input.createId(),
      ...checkout,
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

  // The Checkout's block while any of its Runs live, else the one it had last time if free, else the lowest free block.
  private async blockOf(checkout: RunCheckout): Promise<number> {
    const checkoutKey = checkoutKeyOf(checkout);

    const live = [...this.live.values()].find(
      (run) => checkoutKeyOf(run.record) === checkoutKey,
    );

    if (live) return live.block;

    const block = await allocateBlock({
      preferred: this.lastBlocks.get(checkoutKey),
      holder: (port) => this.holder(port, checkoutKey, true),
      free: this.input.portFree ?? bindable,
    });

    this.lastBlocks.set(checkoutKey, block);

    return block;
  }

  // Who holds a port: a live Run using it, or the Run of another Checkout that reserved it in its block (or all blocks when `reserved`).
  private holder(
    port: number,
    checkoutKey: string,
    reserved = false,
  ): string | undefined {
    for (const run of this.live.values()) {
      const own = checkoutKeyOf(run.record) === checkoutKey;

      if (run.record.port === port)
        return own
          ? `Run Configuration "${run.record.name}" of this Checkout`
          : run.starter;

      if (
        (reserved || !own) &&
        run.block <= port &&
        port < run.block + blockSize
      )
        return run.starter;
    }

    return undefined;
  }

  private async spawn(
    checkout: RunCheckout,
    configuration: RunConfiguration,
    record: RunRecord,
    block: number,
  ): Promise<TerminalProcess> {
    const ports = Object.fromEntries(
      blockPorts(block).map((port, index) => [
        `ARGO_PORT_${index}`,
        String(port),
      ]),
    );

    try {
      return await this.input.spawn({
        id: record.id,
        command: configuration.command,
        cwd: resolve(checkout.checkoutPath, configuration.cwd),
        env: {
          ...configuration.env,
          ...ports,
          PORT: String(record.port),
        },
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
    this.live.delete(key);
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

    while (this.live.get(key) === run) {
      const ready = pattern
        ? run.matches(pattern)
        : await portListening(run.record.port);

      if (ready) return this.markReady(key, run);
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

  private async end(run: LiveRun | undefined): Promise<void> {
    if (!run) return;
    run.stopping = true;
    await run.terminal.stop();
    await run.ended.promise;
  }
}

export const createRuns = (
  input: Omit<RunsInput, 'createId'> & Partial<Pick<RunsInput, 'createId'>>,
): Runs => new Runs({ createId: randomUUID, ...input });
