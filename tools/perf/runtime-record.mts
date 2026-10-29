import type { SessionUpdate, Turn } from '@repo/contracts';
import { initialTrial } from './runtime-initial.mts';
import { runtimeMeasurements } from './runtime-measurements.mts';
import { RuntimeOutput, toolOutput } from './runtime-output.mts';
import {
  agentText,
  finalReply,
  replyMatches,
  expectedStop,
  validateReply,
} from './runtime-reply.mts';
import type {
  RuntimeMilestone,
  RuntimeObservation,
  RuntimeTrial,
  RuntimeWorkload,
} from './runtime-types.mts';
import type { TimedRuntimeRow } from './runtime-watch.mts';

function rowIdentity(
  row: SessionUpdate,
): Pick<RuntimeObservation, 'rowId' | 'toolCallId'> {
  if (row.sessionUpdate === 'tool_call_update')
    return { rowId: row.id, toolCallId: row.toolCallId };

  return { rowId: row.id };
}

export class RuntimeRecord {
  public readonly result: RuntimeTrial;
  public readonly output: RuntimeOutput;
  public constructor(
    sessionId: string,
    private readonly workload: RuntimeWorkload,
  ) {
    this.result = initialTrial(sessionId, workload);
    this.output = new RuntimeOutput(workload, this.result, (name, atMs, row) =>
      this.mark(name, atMs, row),
    );
  }
  public mark(
    milestone: RuntimeMilestone,
    atMs = performance.now(),
    row?: SessionUpdate,
  ): void {
    if (this.result.milestones.some((event) => event.milestone === milestone))
      return;

    const event: RuntimeObservation = {
      milestone,
      atMs,
      sessionId: this.result.sessionId,
    };

    this.addIdentity(event, row);
    this.result.milestones.push(event);
  }
  private addIdentity(
    event: RuntimeObservation,
    row: SessionUpdate | undefined,
  ): void {
    if (this.result.turn) event.turnId = this.result.turn.id;

    if (row) Object.assign(event, rowIdentity(row));
  }
  public accepted(turn: Turn): void {
    this.result.turn = turn;
    this.mark('accepted');
  }
  private owns(row: SessionUpdate): boolean {
    return (
      row.sessionId === this.result.sessionId &&
      row.turnId === this.result.turn?.id
    );
  }
  public receive({ row, atMs }: TimedRuntimeRow): void {
    if (!this.owns(row)) return;
    this.result.wire.push({
      atMs,
      rowId: row.id,
      turnId: row.turnId,
      revision: row.revision,
      kind: row.sessionUpdate,
      text: agentText(row),
      output: toolOutput(row),
      ...toolState(row),
    });

    this.agentMilestones(row, atMs);
    this.output.receive({ row, atMs });
  }
  private agentMilestones(row: SessionUpdate, atMs: number): void {
    const text = agentText(row);

    if (text.trim()) this.mark('first-agent-content', atMs, row);

    if (text === this.workload.expectedReply)
      this.mark('sentinel-received', atMs, row);
  }
  public retain(turn: Turn, rows: SessionUpdate[]): void {
    this.result.turn = turn;
    this.result.reply = finalReply(rows);
    this.result.replyMatches = replyMatches(this.result.reply, this.workload);
    this.output.retain(rows);
  }
  public finish(
    turn: Turn,
    rows: SessionUpdate[],
    workload: RuntimeWorkload,
  ): void {
    this.retain(turn, rows);
    this.output.validate();

    if (turn.stopReason !== expectedStop(workload))
      throw new Error(`Turn ended with ${turn.stopReason}`);
    validateReply(this.result.reply, workload);
    this.result.status = 'completed';
  }
  public measurements(): void {
    this.result.measurements = runtimeMeasurements(this.result.milestones);
  }
}

function toolState(
  row: SessionUpdate,
): Pick<RuntimeTrial['wire'][number], 'tool'> {
  if (row.sessionUpdate !== 'tool_call_update') return {};

  return {
    tool: { toolCallId: row.toolCallId, status: row.status, kind: row.kind },
  };
}
