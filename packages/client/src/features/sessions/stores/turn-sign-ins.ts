// A Session's sign-in for an `auth_required` Turn: the Turn end whose Authenticate was pressed, and the one a sign-in answered.
export interface TurnSignIn {
  // Authenticate was pressed on this Turn end's card; its sign-in has not finished.
  authenticating?: string;
  // A finished sign-in answered this Turn end, so its card stays cleared.
  answered?: string;
}

const none: TurnSignIn = {};

const sameSignIn = (a: TurnSignIn, b: TurnSignIn): boolean =>
  a.authenticating === b.authenticating && a.answered === b.answered;

/*
 * Each Session's Turn sign-in, for the App's life, so a Session page that mounts again keeps
 * a cleared card cleared and still follows a sign-in Authenticate started.
 */
export class TurnSignIns {
  private readonly sessions = new Map<string, TurnSignIn>();
  private readonly listeners = new Set<() => void>();

  public readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);

    return () => void this.listeners.delete(listener);
  };

  public of(sessionId: string): TurnSignIn {
    return this.sessions.get(sessionId) ?? none;
  }

  public authenticate(sessionId: string, turnEnd: string): void {
    this.set(sessionId, { ...this.of(sessionId), authenticating: turnEnd });
  }

  // The sign-in finished: an answered Turn's card stays cleared.
  public finish(sessionId: string, answered?: string): void {
    const next: TurnSignIn = {
      ...this.of(sessionId),
      authenticating: undefined,
    };

    if (answered !== undefined) next.answered = answered;
    this.set(sessionId, next);
  }

  // Readers hear only of a change.
  private set(sessionId: string, next: TurnSignIn): void {
    if (sameSignIn(next, this.of(sessionId))) return;
    this.sessions.set(sessionId, next);

    for (const listener of this.listeners) listener();
  }
}

// The App's one record: a Session page reads it on every mount.
export const turnSignIns = new TurnSignIns();
