import type {
  RunConfigurationRow,
  RunConfigurationStatus,
  RunLogsResult,
  RunOutput,
  RunOutputCursor,
  RunStatusResult,
} from '@repo/contracts';
import type { LiveRun } from './live-run';
import { readRunFile, requireRunConfiguration } from './run-file';
import { readRunOutputTail, runOutputPath } from './run-output';
import { watchRunOutput, type RunRecording } from './run-replay';
import type { RunRecord } from './run-store';
import { RunUpdates } from './run-updates';
import type { RunCheckout } from './runs';

type ReadRuns = {
  home: string;
  live: (checkout: RunCheckout, name: string) => LiveRun | undefined;
  record: (checkout: RunCheckout, name: string) => RunRecord | undefined;
};

export type Standing = {
  live: LiveRun | undefined;
  record: RunRecord | undefined;
  output: string | undefined;
};

type OutputRequest = {
  name: string;
  cursor?: RunOutputCursor;
};

const defaultTailCharacters = 4000;

export const statusOf = (
  record: RunRecord | undefined,
): RunConfigurationStatus => record?.status ?? 'stopped';

const rowOf = (
  record: RunRecord | undefined,
): Omit<RunConfigurationRow, 'name' | 'command'> => ({
  status: statusOf(record),
  port: record?.port ?? null,
  url: record?.url ?? null,
  exitCode: record?.exitCode ?? null,
  startedAt: record?.startedAt ?? null,
});

export class RunView {
  private readonly updates = new RunUpdates();

  public constructor(private readonly runs: ReadRuns) {}

  public async status(checkout: RunCheckout): Promise<RunStatusResult> {
    const { configurations } = await readRunFile(checkout.checkoutPath);

    return {
      configurations: configurations.map(({ name, command }) => ({
        name,
        command,
        ...rowOf(this.runs.record(checkout, name)),
      })),
    };
  }

  public watchStatus(
    checkout: RunCheckout,
    signal: AbortSignal,
  ): AsyncIterable<RunStatusResult> {
    return this.updates.watch(checkout, () => this.status(checkout), signal);
  }

  public async *watchOutput(
    checkout: RunCheckout,
    { name, cursor }: OutputRequest,
    signal: AbortSignal,
  ): AsyncGenerator<RunOutput> {
    if (signal.aborted) return;

    await requireRunConfiguration(checkout.checkoutPath, name);

    yield* watchRunOutput(
      {
        current: () => this.recording(checkout, name),
        listen: (changed) =>
          this.updates.listenToOutput(checkout, name, changed),
      },
      cursor,
      signal,
    );
  }

  public async logs(
    checkout: RunCheckout,
    name: string,
    tail = defaultTailCharacters,
  ): Promise<RunLogsResult> {
    await requireRunConfiguration(checkout.checkoutPath, name);
    await this.runs.live(checkout, name)?.flushed();
    const record = this.runs.record(checkout, name);

    return {
      name,
      status: statusOf(record),
      exitCode: record?.exitCode ?? null,
      output: record
        ? await readRunOutputTail(
            runOutputPath(this.runs.home, record.id),
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
    await requireRunConfiguration(checkout.checkoutPath, name);
    const current = this.runs.live(checkout, name);

    if (current?.stopping) await current.flushed();

    const record = this.runs.record(checkout, name);

    return {
      live: current?.stopping ? undefined : current,
      record,
      output: record && runOutputPath(this.runs.home, record.id),
    };
  }

  public changed(record: RunRecord): void {
    this.updates.changed(record);
    this.outputChanged(record);
  }

  public outputChanged(record: RunRecord): void {
    this.updates.outputChanged(record, record.name);
  }

  private recording(
    checkout: RunCheckout,
    name: string,
  ): RunRecording | undefined {
    const record = this.runs.record(checkout, name);

    return (
      record && {
        runId: record.id,
        path: runOutputPath(this.runs.home, record.id),
      }
    );
  }
}
