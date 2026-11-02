import {
  pairingTicketAttempts,
  pairingTicketLifetimeMs,
} from '@repo/contracts';

const firstBackoffMs = 30_000;

const longestBackoffMs = 600_000;

// Far more sources than a local network has, so a flood of made-up addresses cannot grow the table without end.
const mostSources = 1024;

interface Tally {
  refusals: number;
  lockouts: number;
  blockedUntil: number;
  lastAt: number;
  // Runs for a key that have not ended yet, which count against the source as if each were refused, so many at once cannot outrun the count.
  pending: number;
}

/*
 * Wrong Pairing Tickets counted per source (ADR-0045). One source that has been refused as many times as a Ticket allows is turned away for a while, and for longer each time it comes back and does it again.
 * Counting by source is what stops one Device on the local network from using up the owner's attempts: the refusals it earns are its own.
 */
export class TicketAttempts {
  private readonly sources = new Map<string, Tally>();

  public constructor(private readonly now: () => number) {}

  public blocked(source: string): boolean {
    const record = this.sources.get(source);

    return record !== undefined && this.turnedAway(record);
  }

  public started(source: string): void {
    this.forgetStale();
    const record = this.tally(source);

    record.pending += 1;
    record.lastAt = this.now();
  }

  public ended(source: string): void {
    const record = this.sources.get(source);

    if (record) record.pending = Math.max(0, record.pending - 1);
  }

  public refused(source: string): void {
    this.forgetStale();
    const record = this.tally(source);

    record.refusals += 1;
    record.lastAt = this.now();

    if (record.refusals >= pairingTicketAttempts) this.lockOut(record);
  }

  private lockOut(record: Tally): void {
    record.lockouts += 1;
    record.refusals = 0;

    record.blockedUntil =
      this.now() +
      Math.min(firstBackoffMs * 2 ** (record.lockouts - 1), longestBackoffMs);
  }

  private turnedAway(record: Tally): boolean {
    return (
      record.blockedUntil > this.now() ||
      record.refusals + record.pending >= pairingTicketAttempts
    );
  }

  private tally(source: string): Tally {
    const known = this.sources.get(source);

    if (known) return known;

    const record = {
      refusals: 0,
      lockouts: 0,
      blockedUntil: 0,
      lastAt: 0,
      pending: 0,
    };

    this.sources.set(source, record);

    return record;
  }

  // A source that has been quiet for a Ticket's whole lifetime since its last refusal or block starts over.
  private forgetStale(): void {
    this.forgetQuiet();
    this.forgetOldest();
  }

  private forgetQuiet(): void {
    for (const [source, record] of this.sources)
      if (this.quiet(record)) this.sources.delete(source);
  }

  private forgetOldest(): void {
    for (const oldest of this.sources.keys()) {
      if (this.sources.size < mostSources) break;
      this.sources.delete(oldest);
    }
  }

  private quiet(record: Tally): boolean {
    const last = Math.max(record.blockedUntil, record.lastAt);

    return record.pending === 0 && last + pairingTicketLifetimeMs <= this.now();
  }
}
