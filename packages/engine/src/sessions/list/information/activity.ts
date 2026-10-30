import type { SessionStatus, TextContent, Turn } from '@repo/contracts';
import {
  type PendingInputRequest,
  pendingInputRequest,
} from '../../pending-input';
import { latestTurnOf } from '../../stored-turn';
import { activityText } from './activity-text';
import type { SessionInfoInput } from './information';
import { deriveSessionStatus } from './status';

export class SessionInfoActivity {
  private readonly latest: Turn | undefined;
  public constructor(private readonly input: SessionInfoInput) {
    this.latest = latestTurnOf(input.turns, input.row.id);
  }

  public running(): boolean {
    return this.input.activeTurnId !== null;
  }

  public status(): SessionStatus {
    return deriveSessionStatus({
      needsInput: this.needsInput(),
      running: this.running(),
      failure: this.failure(),
      latestTurnFailed: this.latest?.stopReason === 'error',
      latestTurnInterrupted: interrupted(this.latest),
      maxRevision: Math.max(this.input.row.maxRevision, this.feedRevision()),
      seenRevision: this.input.row.seenRevision,
    });
  }

  public activity(): string {
    const pending = this.pending();

    if (pending) return requestText(pending);

    if (this.running()) return this.runningText();

    return messagePreview(this.input);
  }

  private pending(): PendingInputRequest | null {
    return this.input.live ? pendingInputRequest(this.input.live) : null;
  }

  private needsInput(): boolean {
    return this.pending() !== null;
  }

  private failure(): string | null {
    return this.input.live?.failure ?? this.input.row.failure;
  }
  private feedRevision(): number {
    return this.input.feed?.maxRevision ?? 0;
  }
  private runningText(): string {
    return this.input.liveHeader?.text ?? 'Working';
  }
}

function requestText(pending: PendingInputRequest): string {
  return pending.kind === 'permission'
    ? pending.request.title
    : 'Waiting for your answer';
}

function interrupted(turn: Turn | undefined): boolean {
  return turn?.error?.code === 'interrupted';
}

function messagePreview(input: SessionInfoInput): string {
  return activityText(
    input.message?.content
      .filter((block): block is TextContent => block.type === 'text')
      .map((block): string => block.text)
      .join('\n') ?? '',
  );
}
