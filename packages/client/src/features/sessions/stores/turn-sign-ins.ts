import type { Connection } from '#features/connection';
import { StoreListeners } from '../../../lib/store-listeners';
import type { TurnSignIn } from '../types/turn-sign-in';

const none: TurnSignIn = { authenticating: undefined, answered: undefined };

const sameSignIn = (a: TurnSignIn, b: TurnSignIn): boolean =>
  a.authenticating === b.authenticating && a.answered === b.answered;

/*
 * Each Session's Turn sign-in on one Server, so a Session page that mounts again keeps a
 * cleared card cleared and still follows a sign-in Authenticate started.
 */
export class TurnSignIns {
  private readonly sessions = new Map<string, TurnSignIn>();
  private readonly listeners = new StoreListeners();

  public readonly subscribe = this.listeners.subscribe;

  public of(sessionId: string): TurnSignIn {
    return this.sessions.get(sessionId) ?? none;
  }

  public authenticate(sessionId: string, turnEnd: string): void {
    this.set(sessionId, { ...this.of(sessionId), authenticating: turnEnd });
  }

  // The sign-in finished: an answered Turn's card stays cleared.
  public finish(sessionId: string, answered?: string): void {
    const current = this.of(sessionId);

    this.set(sessionId, {
      authenticating: undefined,
      answered: answered ?? current.answered,
    });
  }

  // Readers hear only of a change.
  private set(sessionId: string, next: TurnSignIn): void {
    if (sameSignIn(next, this.of(sessionId))) return;
    this.sessions.set(sessionId, next);

    this.listeners.notify();
  }
}

// One record per Connection, as the App opens one Connection per Server, so Storybook's and tests' separate Apps never share one.
const records = new WeakMap<Connection, TurnSignIns>();

export const turnSignInsOf = (connection: Connection): TurnSignIns => {
  const record = records.get(connection) ?? new TurnSignIns();
  records.set(connection, record);

  return record;
};
