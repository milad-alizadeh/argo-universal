import type {
  RunConfigurationStatus,
  TerminalReadResult,
  TerminalSendResult,
} from '@repo/contracts';
import { TRPCError } from '@trpc/server';
import type { LiveRun } from './live-run';
import { drawRecording } from './run-screen';
import type { RunRecord } from './run-store';
import type { RunCheckout, Runs } from './runs';

// The Run of a Run Configuration as it stands now: its terminal while it lives, its latest record and where that recorded its output.
export type Standing = {
  live: LiveRun | undefined;
  record: RunRecord | undefined;
  output: string | undefined;
};

const defaultScrollbackLines = 100;

// How Agents and people read and type into the Terminals of a Checkout: a Run today, shell Terminals once they exist (ADR-0063).
export class RunTerminals {
  public constructor(private readonly runs: Runs) {}
  // What the Terminal shows now; an ended Run's screen is drawn again from its recording.
  public async read(
    checkout: RunCheckout,
    name: string,
    scrollback = defaultScrollbackLines,
  ): Promise<TerminalReadResult> {
    const { live, record, output } = await this.runs.standing(checkout, name);

    await live?.flushed();

    const shown = live
      ? await live.screen.read(scrollback)
      : await drawRecording(output, scrollback);

    return {
      name,
      status: statusOf(record?.status),
      exitCode: record?.exitCode ?? null,
      ...shown,
    };
  }
  // Types into the Terminal, which must be running.
  public async send(
    checkout: RunCheckout,
    name: string,
    input: string,
  ): Promise<TerminalSendResult> {
    const { live, record } = await this.runs.standing(checkout, name);

    if (!live)
      throw new TRPCError({
        code: 'PRECONDITION_FAILED',
        message: `The Run "${name}" is not running. Start it with run.start first.`,
      });

    live.terminal.write(input);

    return { name, status: statusOf(record?.status) };
  }
  // Whether the person opened this Terminal. Every Terminal is a Run until shell Terminals arrive.
  public openedByPerson(_checkout: RunCheckout, _name: string): boolean {
    return false;
  }
}

const statusOf = (
  status: RunConfigurationStatus | undefined,
): RunConfigurationStatus => status ?? 'stopped';
