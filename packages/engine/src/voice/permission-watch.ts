import type { PendingPermission } from '@repo/contracts';
import type { SessionHappening } from './session-link';

type Listener = (happening: SessionHappening) => void;

const idOf = (pending: PendingPermission | null): string | null =>
  pending === null ? null : pending.requestId;

/*
 * Reads a Session's pending Permission request, as each snapshot reports it, as the voice hears it: once when it starts
 * to wait, however often the Session changes while it waits, and once when it stops waiting.
 */
export class PermissionWatch {
  private readonly reported = new Set<string>();
  private waiting: string | null = null;

  public constructor(private readonly listener: Listener) {}

  public changed(pending: PendingPermission | null): void {
    if (idOf(pending) === this.waiting) return;
    this.settle();
    this.waiting = idOf(pending);

    if (pending) this.announce(pending);
  }

  private settle(): void {
    if (this.waiting !== null)
      this.listener({ type: 'permission.settled', requestId: this.waiting });
  }

  private announce({ requestId, title }: PendingPermission): void {
    if (this.reported.has(requestId)) return;
    this.reported.add(requestId);
    this.listener({ type: 'permission.waiting', requestId, title });
  }
}
