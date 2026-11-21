import type {
  RunConfigurationRow,
  RunConfigurationStatus,
  RunDefaultGroup,
  RunLogsResult,
  RunOutput,
  RunOutputCursor,
  RunStatusResult,
  ShellTerminal,
} from '@repo/contracts';
import type { LiveRun } from './live-run';
import type { RunConfigurations } from './run-configurations';
import { readRunFile, requireRunConfiguration } from './run-file';
import { distinctMembers } from './run-groups';
import { readRunOutputTail, runOutputPath } from './run-output';
import { watchRunOutput, type RunRecording } from './run-replay';
import type { RunRecord } from './run-store';
import { RunUpdates } from './run-updates';
import type { RunCheckout } from './runs';

type ReadRuns = {
  home: string;
  shells: (checkout: RunCheckout) => ShellTerminal[];
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

function defaultGroupOf(
  { default: name, groups }: RunConfigurations,
  rows: RunConfigurationRow[],
): RunDefaultGroup | undefined {
  const group = name === undefined ? undefined : groups[name];

  if (name === undefined || !group) return undefined;
  const members = distinctMembers(group);
  const statuses = new Map(rows.map((row) => [row.name, row]));

  const ready = members
    .map((member) => statuses.get(member))
    .filter((row): row is RunConfigurationRow => row?.status === 'ready');

  return {
    name,
    members,
    readyCount: ready.length,
    url: ready.find((row) => row.url !== null)?.url ?? null,
  };
}

export class RunView {
  private readonly updates = new RunUpdates();

  public constructor(private readonly runs: ReadRuns) {}

  public async status(checkout: RunCheckout): Promise<RunStatusResult> {
    const file = await readRunFile(checkout.checkoutPath);

    const configurations = file.configurations.map(({ name, command }) => ({
      name,
      command,
      ...rowOf(this.runs.record(checkout, name)),
    }));

    const defaultGroup = defaultGroupOf(file, configurations);

    const shells = this.runs.shells(checkout);

    return {
      configurations,
      ...(defaultGroup && { defaultGroup }),
      ...(shells.length > 0 && { shells }),
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

    if (current?.whenReleased()) await current.flushed();

    const record = this.runs.record(checkout, name);

    return {
      live: current?.whenReleased() ? undefined : current,
      record,
      output: record && runOutputPath(this.runs.home, record.id),
    };
  }

  public checkoutChanged(checkout: RunCheckout): void {
    this.updates.changed(checkout);
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
