import type {
  LiveHeader,
  SessionStatus,
  TextContent,
  Turn,
} from '@repo/contracts';
import { latestTurnOf } from './latest-turn';
import { toLiveHeader, type LiveHeaderInput } from './live-header';
import type { SessionInfoInput } from './session-info';
import { deriveSessionStatus } from './session-status';

export class SessionInfoActivity {
  private readonly latest: Turn | undefined;
  public constructor(private readonly input: SessionInfoInput) {
    this.latest = latestTurnOf(input.turns, input.row.id);
  }

  public running(): boolean {
    return this.input.live
      ? this.input.live.activeTurnId !== null
      : this.latest?.status === 'running';
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
    if (this.needsInput()) return this.permissionTitle();

    if (this.running()) return this.runningText();

    return messagePreview(this.input);
  }

  private permissionTitle(): string {
    const permission = this.input.live && this.input.live.permissionQueue[0];

    return permission ? permission.title : 'Waiting for your answer';
  }

  private needsInput(): boolean {
    if (!this.input.live) return false;

    return Boolean(
      this.input.live.permissionQueue[0] || this.input.live.elicitationQueue[0],
    );
  }

  private header(): LiveHeader | null {
    return toLiveHeader(this.headerInput(), this.input.liveHeaderRows);
  }

  private headerInput(): LiveHeaderInput {
    return {
      activeTurnId: this.activeTurnId(),
      activeTurnStartedAt: this.activeTurnStartedAt(),
      ...this.queues(),
    };
  }

  private activeTurnId(): string | null {
    return this.input.live?.activeTurnId ?? this.storedTurnId();
  }

  private storedTurnId(): string | null {
    if (!this.running()) return null;

    return this.latest ? this.latest.id : null;
  }

  private activeTurnStartedAt(): number | null {
    return this.input.live?.activeTurnStartedAt ?? this.storedTurnStartedAt();
  }

  private storedTurnStartedAt(): number | null {
    if (!this.running()) return null;

    return this.latest ? this.latest.startedAt : null;
  }
  private failure(): string | null {
    return this.input.live?.failure ?? this.input.row.failure;
  }
  private feedRevision(): number {
    return this.input.feed?.maxRevision ?? 0;
  }
  private runningText(): string {
    return this.header()?.text ?? 'Working';
  }
  private queues(): Pick<
    LiveHeaderInput,
    'permissionQueue' | 'elicitationQueue'
  > {
    return this.input.live ?? { permissionQueue: [], elicitationQueue: [] };
  }
}

function interrupted(turn: Turn | undefined): boolean {
  return turn?.error?.code === 'interrupted';
}

function messagePreview(input: SessionInfoInput): string {
  return (
    input.message?.content
      .filter((block): block is TextContent => block.type === 'text')
      .map((block): string => block.text)
      .join('\n')
      .split('\n')[0] ?? ''
  );
}
