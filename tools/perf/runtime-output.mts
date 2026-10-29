import type { SessionUpdate, ToolCallUpdate } from '@repo/contracts';
import type {
  RuntimeMilestone,
  RuntimeTrial,
  RuntimeWorkload,
} from './runtime-types.mts';
import type { TimedRuntimeRow } from './runtime-watch.mts';

export function toolOutput(row: SessionUpdate): string {
  if (row.sessionUpdate !== 'tool_call_update') return '';
  const terminals = row.content.filter((part) => part.type === 'terminal');

  if (terminals.length) return terminals.map((part) => part.output).join('');

  return row.content
    .flatMap((part) =>
      part.type === 'content' && part.content.type === 'text'
        ? [part.content.text]
        : [],
    )
    .join('');
}

type Mark = (
  milestone: RuntimeMilestone,
  atMs: number,
  row: SessionUpdate,
) => void;

function identityText(row: ToolCallUpdate): string {
  return [
    row.title,
    JSON.stringify(row.rawInput),
    ...row.content.flatMap((part) =>
      part.type === 'terminal' ? [part.command] : [],
    ),
  ].join('\n');
}

export class RuntimeOutput {
  private readonly history: TimedRuntimeRow[] = [];
  private selected: string | undefined;
  private readonly ready = Promise.withResolvers<void>();
  public readonly cancellationReady = this.ready.promise;
  public constructor(
    private readonly workload: RuntimeWorkload,
    private readonly result: RuntimeTrial,
    private readonly mark: Mark,
  ) {}

  public receive(timed: TimedRuntimeRow): void {
    if (timed.row.sessionUpdate !== 'tool_call_update') return;
    this.history.push(timed);

    if (this.matches(timed.row)) this.select(timed.row.toolCallId);
    this.observe(timed);
  }

  private matches(row: ToolCallUpdate): boolean {
    if (row.kind !== 'execute') return false;

    return this.matchesMarker(row);
  }

  private matchesMarker(row: ToolCallUpdate): boolean {
    if (!this.workload.toolMarker) return false;

    return (
      identityText(row).includes(this.workload.toolMarker) ||
      toolOutput(row).includes(this.workload.toolMarker)
    );
  }

  private select(toolCallId: string): void {
    this.requireSingleTool(toolCallId);

    if (this.selected) return;
    this.selected = toolCallId;

    for (const timed of this.history) this.observe(timed);
  }

  private requireSingleTool(toolCallId: string): void {
    if (!this.selected) return;

    if (this.selected !== toolCallId)
      throw new Error(
        'The workload executed more than one matching command Tool',
      );
  }

  private observe({ row, atMs }: TimedRuntimeRow): void {
    if (
      row.sessionUpdate !== 'tool_call_update' ||
      row.toolCallId !== this.selected
    )
      return;
    this.mark('tool-received', atMs, row);
    const output = toolOutput(row);
    this.result.stdout.observed = output;

    this.outputMilestones(row, atMs);

    this.cancellationOutput(output);
  }

  private outputMilestones(row: ToolCallUpdate, atMs: number): void {
    if (toolOutput(row).length) this.mark('first-tool-output', atMs, row);

    if (['completed', 'failed', 'cancelled'].includes(row.status))
      this.mark('tool-completed', atMs, row);
  }

  private cancellationOutput(output: string): void {
    if (!this.workload.cancelAfterStdout) return;

    if (output.includes(this.workload.cancelAfterStdout)) this.ready.resolve();
  }

  public retain(rows: SessionUpdate[]): void {
    const row = rows.findLast(
      (candidate) =>
        candidate.sessionUpdate === 'tool_call_update' &&
        candidate.toolCallId === this.selected,
    );

    this.result.stdout.final = row ? toolOutput(row) : '';
    this.result.stdout.matches = this.outputMatches();
  }

  private outputMatches(): boolean | null {
    if (this.workload.expectedStdout === undefined) return null;

    return this.result.stdout.final === this.workload.expectedStdout;
  }

  public validate(): void {
    if (this.workload.expectedStdout === undefined) return;

    if (this.result.stdout.final !== this.workload.expectedStdout)
      throw new Error(
        'Final public Tool output did not exactly match the complete expected stdout',
      );
  }
}
