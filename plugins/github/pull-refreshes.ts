import type { PullInfo } from './pull-info';
import { pullRecordKey } from './pull-records';
import type { PullKey } from './pull-store';

export type ValidatedPull = { link: PullKey; data: PullInfo };

export type Refresh =
  | { kind: 'slot'; validated?: never }
  | { kind: 'sync'; validated?: ValidatedPull };

type Save = (link: PullKey, validated?: PullInfo) => Promise<boolean>;

// A Slot can receive a kept Query answer while it refreshes. A Watch or Operation waits for the current answer.
export class PullRefreshes {
  private readonly inFlight = new Map<string, Promise<boolean>>();
  private readonly trailing = new Map<string, Promise<boolean>>();

  constructor(
    private readonly save: Save,
    private readonly changed: () => void,
  ) {}

  async run(links: readonly PullKey[], refresh: Refresh): Promise<void> {
    const outcomes = await Promise.allSettled(
      links.map((link) => this.schedule(link, refresh)),
    );

    if (
      outcomes.some(
        (outcome) => outcome.status === 'fulfilled' && outcome.value,
      )
    )
      this.changed();

    const failed = outcomes.find((outcome) => outcome.status === 'rejected');

    if (failed) throw failed.reason;
  }

  private schedule(link: PullKey, refresh: Refresh): Promise<boolean> {
    const recordKey = pullRecordKey(link);
    const key = `${refresh.kind}:${recordKey}`;
    const validated = validatedFor(refresh, recordKey);
    const pending = this.inFlight.get(key);

    if (pending && !validated) return this.behindInFlight(key, link, pending);

    const save = (): Promise<boolean> => this.save(link, validated);
    const saved = Promise.resolve(pending).then(save, save);
    this.inFlight.set(key, saved);

    return saved.finally(() => this.release(key, saved));
  }

  /*
   * An ask that arrives while a read is in flight cannot share it: that read left before the ask, so it may not hold
   * what GitHub says now, and nothing asks again when it finds nothing changed. A sync still shares the read in flight;
   * a Slot's ask waits for it and reads once more, which every Slot ask in between shares.
   */
  private behindInFlight(
    key: string,
    link: PullKey,
    pending: Promise<boolean>,
  ): Promise<boolean> {
    if (key.startsWith('sync:')) return pending.then(() => false);

    const queued = this.trailing.get(key);

    if (queued) return queued.then(() => false);

    const again = (): Promise<boolean> => this.again(key, link);
    const next = pending.then(again, again);

    this.trailing.set(key, next);
    this.inFlight.set(key, next);

    return next.finally(() => this.release(key, next));
  }

  private again(key: string, link: PullKey): Promise<boolean> {
    this.trailing.delete(key);

    return this.save(link);
  }

  private release(key: string, saved: Promise<boolean>): void {
    if (this.inFlight.get(key) === saved) this.inFlight.delete(key);
  }
}

function validatedFor(
  { validated }: Refresh,
  key: string,
): PullInfo | undefined {
  if (!validated) return undefined;

  return pullRecordKey(validated.link) === key ? validated.data : undefined;
}
