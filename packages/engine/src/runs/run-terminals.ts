import type {
  RunOutput,
  TerminalReadResult,
  TerminalSendResult,
} from '@repo/contracts';
import { TRPCError } from '@trpc/server';
import { drawRecording } from './run-screen';
import { statusOf, type RunView } from './run-view';
import type { RunCheckout } from './runs';
import type { TerminalReplay } from './terminal';

const defaultScrollbackLines = 100;

// A Run's Terminal can replay its recording after the process exits (ADR-0063).
export class RunTerminals {
  public constructor(private readonly runs: RunView) {}
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
      status: statusOf(record),
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

    return { name, status: statusOf(record) };
  }
  public async resize(
    checkout: RunCheckout,
    name: string,
    { columns, rows }: { columns: number; rows: number },
  ): Promise<void> {
    const { live } = await this.runs.standing(checkout, name);

    if (!live) return;

    live.screen.resize(columns, rows);
    live.terminal.resize(columns, rows);
  }

  public watchOutput(
    checkout: RunCheckout,
    { id: name, cursor }: TerminalReplay,
    signal: AbortSignal,
  ): AsyncIterable<RunOutput> {
    return this.runs.watchOutput(checkout, { name, cursor }, signal);
  }
}
