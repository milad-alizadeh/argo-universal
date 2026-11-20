import type { PendingElicitation, PendingPermission } from '@repo/contracts';
import type { SessionHappening } from './session-link';

type Listener = (happening: SessionHappening) => void;

type Waiting = { requestId: string };

const idOf = (pending: Waiting | null): string | null =>
  pending === null ? null : pending.requestId;

type Reports<Request extends Waiting> = {
  waiting: (request: Request) => SessionHappening;
  settled?: (requestId: string) => SessionHappening;
};

/*
 * Reads one kind of a Session's pending Input request, as each snapshot reports it, as the voice hears it: once when it
 * starts to wait, however often the Session changes while it waits, and once when it stops waiting.
 */
class RequestWatch<Request extends Waiting> {
  private readonly reported = new Set<string>();
  private waiting: string | null = null;

  public constructor(
    private readonly listener: Listener,
    private readonly reports: Reports<Request>,
  ) {}

  public changed(pending: Request | null): void {
    if (idOf(pending) === this.waiting) return;
    this.settle();
    this.waiting = idOf(pending);

    if (pending) this.announce(pending);
  }

  private settle(): void {
    if (this.waiting !== null && this.reports.settled)
      this.listener(this.reports.settled(this.waiting));
  }

  private announce(pending: Request): void {
    if (this.reported.has(pending.requestId)) return;
    this.reported.add(pending.requestId);
    this.listener(this.reports.waiting(pending));
  }
}

type Pending = {
  pendingPermission: PendingPermission | null;
  pendingElicitation: PendingElicitation | null;
};

const permissionReports: Reports<PendingPermission> = {
  waiting: ({ requestId, title }): SessionHappening => ({
    type: 'permission.waiting',
    requestId,
    title,
  }),
  settled: (requestId): SessionHappening => ({
    type: 'permission.settled',
    requestId,
  }),
};

const elicitationReports: Reports<PendingElicitation> = {
  waiting: ({ requestId, message }): SessionHappening => ({
    type: 'elicitation.waiting',
    requestId,
    message,
  }),
};

// A Session's Permission requests and Elicitations as the voice hears them.
export class InputRequestWatch {
  private readonly permissions: RequestWatch<PendingPermission>;
  private readonly elicitations: RequestWatch<PendingElicitation>;

  public constructor(listener: Listener) {
    this.permissions = new RequestWatch(listener, permissionReports);
    this.elicitations = new RequestWatch(listener, elicitationReports);
  }

  public changed({ pendingPermission, pendingElicitation }: Pending): void {
    this.permissions.changed(pendingPermission);
    this.elicitations.changed(pendingElicitation);
  }
}
