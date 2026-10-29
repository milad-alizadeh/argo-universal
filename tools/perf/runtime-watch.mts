import {
  FeedSubscribeOutput,
  type FeedPageOutput,
  type SessionUpdate,
} from '@repo/contracts';
import { readRuntimePage, type RuntimeClient } from './runtime-client.mts';
import { runtimeError } from './runtime-error.mts';
import { applyRuntimeRow } from './runtime-row.mts';
import { subscribeRuntime } from './runtime-subscription.mts';

export interface TimedRuntimeRow {
  row: SessionUpdate;
  atMs: number;
}

export class RuntimeWatch {
  public readonly received: TimedRuntimeRow[] = [];
  private readonly rows: Map<string, SessionUpdate>;
  private readonly ready = Promise.withResolvers<void>();
  private changed = Promise.withResolvers<void>();
  private failure: Error | undefined;
  private rowObserver: ((timed: TimedRuntimeRow) => void) | undefined;
  private readonly aborted: Promise<never>;

  public constructor(
    private readonly baseline: FeedPageOutput,
    private readonly signal: AbortSignal,
  ) {
    this.rows = new Map(baseline.rows.map((row) => [row.id, row]));
    this.aborted = new Promise((_, reject) => {
      signal.addEventListener('abort', () => reject(signal.reason), {
        once: true,
      });
    });
    void this.aborted.catch(() => {});
  }

  public fail(error: Error): void {
    this.failure = error;
    this.ready.resolve();
    this.changed.resolve();
  }

  public receive(event: FeedSubscribeOutput): void {
    try {
      this.accept(event, performance.now());
    } catch (error) {
      this.fail(runtimeError(error));
    }
  }

  private accept(event: FeedSubscribeOutput, atMs: number): void {
    if (event.type === 'snapshot') {
      this.ready.resolve();

      return;
    }

    this.acceptRow(event, atMs);
  }

  private acceptRow(
    event: Exclude<FeedSubscribeOutput, { type: 'snapshot' }>,
    atMs: number,
  ): void {
    const rowEvent = requireRowEvent(event);

    this.publishEvent(rowEvent, atMs);
  }

  private publishEvent(
    event: Parameters<typeof applyRuntimeRow>[1],
    atMs: number,
  ): void {
    if (event.rev <= this.baseline.maxRevision) return;
    const row = applyRuntimeRow(this.rows, event);

    if (row) this.publish({ row, atMs });
  }

  private publish(timed: TimedRuntimeRow): void {
    this.received.push(timed);
    this.rowObserver?.(timed);
    this.changed.resolve();
    this.changed = Promise.withResolvers<void>();
  }

  public async started(): Promise<void> {
    await Promise.race([this.ready.promise, this.aborted]);
    this.check();
  }

  public observe(observer: (timed: TimedRuntimeRow) => void): void {
    this.rowObserver = observer;

    for (const timed of this.received) observer(timed);
  }

  public async drain(rows: SessionUpdate[]): Promise<void> {
    while (
      !rows.every(
        (row) => (this.rows.get(row.id)?.revision ?? -1) >= row.revision,
      )
    ) {
      this.check();
      await Promise.race([this.changed.promise, this.aborted]);
    }

    this.check();
  }

  private check(): void {
    this.signal.throwIfAborted();

    if (this.failure) throw this.failure;
  }
}

export async function watchRuntime(
  client: RuntimeClient,
  sessionId: string,
  signal: AbortSignal,
): Promise<{
  watch: RuntimeWatch;
  stop: () => void;
}> {
  const page = await readRuntimePage(client, sessionId);
  const watch = new RuntimeWatch(page, signal);

  return subscribeRuntime(client, { page, watch, sessionId });
}

function requireRowEvent(
  event: Exclude<FeedSubscribeOutput, { type: 'snapshot' }>,
): Parameters<typeof applyRuntimeRow>[1] {
  if (event.type === 'closed' || event.type === 'reset')
    throw new Error(`Feed ${event.type} during runtime observation`);

  return event;
}
