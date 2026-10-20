import type { ChangesSummary, FeedSnapshot } from '@repo/contracts';
import type { FeedDeps } from './feed';

type StoredChangesSources = Pick<
  FeedDeps,
  'findFeed' | 'readStoredChangesSummary'
>;

type StoredChangesState =
  | { status: 'idle' }
  | { status: 'reading'; latest: FeedSnapshot }
  | { status: 'ready'; changes: ChangesSummary }
  | { status: 'failed' };

const withChanges = (
  event: FeedSnapshot,
  changes: ChangesSummary,
): FeedSnapshot => ({ ...event, snapshot: { ...event.snapshot, changes } });

// A stored Session's Checkout totals for one subscription: its snapshots go out at once, git is read once in the background, and the newest snapshot goes out again when the totals arrive.
export class StoredChanges {
  private state: StoredChangesState = { status: 'idle' };

  public constructor(
    private readonly sources: StoredChangesSources,
    private readonly sessionId: string,
    private readonly onSettled: (resent: FeedSnapshot[]) => void,
  ) {}

  public apply(event: FeedSnapshot): FeedSnapshot {
    if (this.isOpen()) return event;

    return this.applyStored(event);
  }

  public isReading(): boolean {
    return this.state.status === 'reading';
  }

  private isOpen(): boolean {
    return this.sources.findFeed(this.sessionId) !== undefined;
  }

  private applyStored(event: FeedSnapshot): FeedSnapshot {
    if (this.state.status === 'ready')
      return withChanges(event, this.state.changes);

    if (this.state.status !== 'failed') this.awaitChanges(event);

    return event;
  }

  private awaitChanges(latest: FeedSnapshot): void {
    const isIdle = this.state.status === 'idle';
    this.state = { status: 'reading', latest };

    if (isIdle) void this.read();
  }

  private async read(): Promise<void> {
    const changes = await this.readChanges();

    if (changes) this.arrive(changes);
    else this.fail();
  }

  private async readChanges(): Promise<ChangesSummary | undefined> {
    try {
      return await this.sources.readStoredChangesSummary(this.sessionId);
    } catch (error) {
      console.error(
        `Session ${this.sessionId}: stored Checkout totals unread`,
        error,
      );

      return undefined;
    }
  }

  private arrive(changes: ChangesSummary): void {
    const resent = this.resendable(changes);
    this.state = { status: 'ready', changes };
    this.onSettled(resent);
  }

  private resendable(changes: ChangesSummary): FeedSnapshot[] {
    if (this.state.status !== 'reading' || this.isOpen()) return [];

    return [withChanges(this.state.latest, changes)];
  }

  private fail(): void {
    this.state = { status: 'failed' };
    this.onSettled([]);
  }
}
