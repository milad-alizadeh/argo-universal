import { relayWords } from './relay-words';
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

type Waiting = { requestId: string; title: string };

/*
 * The Permission request the voice was told is waiting. Speech never answers one, so whatever the voice is told while it
 * waits starts with the truth that nothing was allowed or rejected; the voice never claims an outcome Argo did not apply.
 */
export class WaitingPermission {
  private waiting: Waiting | null = null;

  // Notes what happened to the Session's Permission request; returns what the voice is to be told, if anything.
  public heard(happening: PermissionHappening): string | null {
    if (happening.type === 'permission.settled') {
      this.settled(happening.requestId);

      return null;
    }

    const { requestId, title } = happening;
    this.waiting = { requestId, title };

    return relayWords.permissionWaiting(title);
  }

  // The answer to a request for work, led by the request that still waits.
  public answering(answer: string): string {
    return this.waiting
      ? `${relayWords.permissionStillWaiting(this.waiting.title)} ${answer}`
      : answer;
  }

  private settled(requestId: string): void {
    if (this.waiting?.requestId === requestId) this.waiting = null;
  }
}
