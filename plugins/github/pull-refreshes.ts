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

    if (pending && !validated) return pending.then(() => false);

    const save = (): Promise<boolean> => this.save(link, validated);
    const saved = Promise.resolve(pending).then(save, save);
    this.inFlight.set(key, saved);

    return saved.finally(() => this.release(key, saved));
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
