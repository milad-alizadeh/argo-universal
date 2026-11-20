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
 * The Permission request the voice was told is waiting, and the last one it was told of, which a late spoken answer may
 * still name once it no longer waits. Whatever else the voice is told while one waits starts with the truth that nothing
 * was allowed or rejected; the voice never claims an outcome Argo did not apply.
 */
export class WaitingPermission {
  private waiting: AnnouncedRequest | null = null;
  private last: AnnouncedRequest | null = null;

  // Notes what happened to the Session's Permission request; returns what the voice is to be told, if anything.
  public heard(happening: PermissionHappening): string | null {
    if (happening.type === 'permission.settled') {
      this.settled(happening.requestId);

      return null;
    }

    const { requestId, agent, title, kind, target } = happening;
    this.waiting = { requestId, about: { agent, title, kind, target } };
    this.last = this.waiting;

    return relayWords.permissionWaiting(this.waiting.about);
  }

  // The request the voice was last told of, waiting or not, until the Turn that asked it ends.
  public get announced(): AnnouncedRequest | null {
    return this.last;
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
    if (this.isWaiting(requestId)) this.waiting = null;
  }
}
