import type { OperationWorkTarget } from '@repo/contracts/operations';
import { toolCallEvent } from '../../feed';
import { confirmOperation, type OperationCard } from './permission';
import {
  cancelledRow,
  openRow,
  settledRow,
  startedRow,
  type CalledOperation,
  type CallResult,
  type OperationRow,
} from './rows';
import { canConfirmCall, canSettleCall, type CallSite } from './turn';

// One Operation a Session called, shown as its Tool call until it settles.
export type SessionOperationCall = {
  readonly toolCallId: string;
  // Whether a Permission request could still ask the user in the calling Turn.
  readonly canConfirm: boolean;
  confirm: (card: OperationCard) => Promise<void>;
  started: (work: OperationWorkTarget) => void;
  finish: (result: CallResult) => void;
};

type OpenSite = Omit<CallSite, 'turnId'>;

export class OperationCall implements SessionOperationCall {
  public readonly toolCallId: string;
  private readonly site: CallSite;
  private row: OperationRow;
  private finished = false;
  private readonly closing: AbortSignal;
  public constructor(
    { session, feed }: OpenSite,
    private readonly operation: CalledOperation,
  ) {
    const context = session.getSnapshot().context;
    this.toolCallId = context.input.createId();
    this.site = { session, feed, turnId: context.activeTurnId };
    this.row = openRow(this.toolCallId, operation);
    this.closing = context.acpLifetime.signal;
    this.closing.addEventListener('abort', this.cancel, { once: true });
    this.publish(this.row);
  }
  private publish(row: OperationRow): void {
    this.site.feed.send(toolCallEvent(row, this.site.turnId));
  }
  private readonly cancel = (): void => this.settle(cancelledRow(this.row));
  public get canConfirm(): boolean {
    return canConfirmCall(this.site);
  }
  public confirm(card: OperationCard): Promise<void> {
    return confirmOperation(
      { ...this.site, toolCallId: this.toolCallId },
      {
        name: this.operation.name,
        input: JSON.stringify(this.operation.input),
        card,
      },
    );
  }
  public finish(result: CallResult): void {
    this.settle(settledRow(this.row, result));
  }
  public started(work: OperationWorkTarget): void {
    if (this.finished) return;

    if (!canSettleCall(this.site)) return;
    this.row = startedRow(this.row, work);
    this.publish(this.row);
  }
  private settle(row: OperationRow): void {
    if (this.finished) return;
    this.finished = true;
    this.closing.removeEventListener('abort', this.cancel);

    if (!canSettleCall(this.site)) return;
    this.publish(row);
  }
}
