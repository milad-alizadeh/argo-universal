import { relayWords, type SpokenRequest } from './relay-words';
import type { SessionHappening } from './session-link';

export type PermissionHappening = Extract<
  SessionHappening,
  { type: 'permission.waiting' | 'permission.settled' }
>;

export const isPermissionHappening = (
  happening: SessionHappening,
): happening is PermissionHappening =>
  happening.type === 'permission.waiting' ||
  happening.type === 'permission.settled';

// A Permission request the voice was told of.
export type AnnouncedRequest = { requestId: string; about: SpokenRequest };

/*
 * The Permission request the voice was told is waiting, and the last one it was told of, which a spoken answer said as
 * the person clicked may still name for a moment after it settles. Whatever else the voice is told while one waits starts with the truth that nothing
 * was allowed or rejected; the voice never claims an outcome Argo did not apply.
 */
// How long a settled request can still be named by a spoken answer, one said as the person clicked; after it, "yes" is a request for work again.
const settledGraceMs = 5000;

export class WaitingPermission {
  private waiting: AnnouncedRequest | null = null;
  private last: AnnouncedRequest | null = null;
  // When the last request settled; null while it waits.
  private settledAt: number | null = null;

  public constructor(private readonly now: () => number = Date.now) {}

  // Notes what happened to the Session's Permission request; returns what the voice is to be told, if anything.
  public heard(happening: PermissionHappening): string | null {
    if (happening.type === 'permission.settled') {
      this.settled(happening.requestId);

      return null;
    }

    const { requestId, agent, title, kind, target } = happening;
    this.waiting = { requestId, about: { agent, title, kind, target } };
    this.last = this.waiting;
    this.settledAt = null;

    return relayWords.permissionWaiting(this.waiting.about);
  }

  // The request the voice was last told of: while it waits, and for a moment after it settles.
  public get announced(): AnnouncedRequest | null {
    return this.recentlyAsked() ? this.last : null;
  }

  private recentlyAsked(): boolean {
    return (
      this.settledAt === null || this.now() - this.settledAt < settledGraceMs
    );
  }

  public isWaiting(requestId: string): boolean {
    return this.waiting?.requestId === requestId;
  }

  // The Turn ended: no spoken answer can name its request any more.
  public turnEnded(): void {
    this.waiting = null;
    this.last = null;
  }

  // The answer to a request for work, led by the request that still waits.
  public answering(answer: string): string {
    return this.waiting
      ? `${relayWords.permissionStillWaiting(this.waiting.about.title)} ${answer}`
      : answer;
  }

  private settled(requestId: string): void {
    if (!this.isWaiting(requestId)) return;
    this.waiting = null;
    this.settledAt = this.now();
  }
}
