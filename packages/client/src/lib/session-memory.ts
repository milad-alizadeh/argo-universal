import { type SetStateAction, useCallback, useSyncExternalStore } from 'react';
import { StoreListeners } from './store-listeners';

// Sessions remembered at once: the one shown, and the ones the person switched away from most recently.
export const rememberedSessions = 20;

// What a Session's page holds about how it is laid out, kept while the person is in another Session, for this run of the App.
export class SessionMemory<State> {
  private readonly kept = new Map<string, State>();
  private readonly listeners = new StoreListeners();

  public constructor(private readonly initial: State) {}

  public readonly subscribe = this.listeners.subscribe;

  public read(sessionId: string): State {
    return this.kept.get(sessionId) ?? this.initial;
  }

  public write(sessionId: string, action: SetStateAction<State>): void {
    const current = this.read(sessionId);
    const next = isUpdate(action) ? action(current) : action;

    if (Object.is(next, current)) return;

    this.remember(sessionId, next);
    this.listeners.notify();
  }

  // The longest-unused Session is forgotten first; a Session left as it opened is not kept at all.
  private remember(sessionId: string, state: State): void {
    this.kept.delete(sessionId);

    if (state !== this.initial) this.kept.set(sessionId, state);

    this.forgetOldest();
  }

  private forgetOldest(): void {
    const [oldest] = this.kept.keys();

    if (this.kept.size <= rememberedSessions || oldest === undefined) return;

    this.kept.delete(oldest);
  }
}

const isUpdate = <State>(
  action: SetStateAction<State>,
): action is (state: State) => State => typeof action === 'function';

// A Session's remembered state, read and set like useState; it survives the page unmounting when the person opens another Session.
export function useSessionMemory<State>(
  memory: SessionMemory<State>,
  sessionId: string,
): [State, (action: SetStateAction<State>) => void] {
  const state = useSyncExternalStore(
    memory.subscribe,
    () => memory.read(sessionId),
    () => memory.read(sessionId),
  );

  const set = useCallback(
    (action: SetStateAction<State>) => memory.write(sessionId, action),
    [memory, sessionId],
  );

  return [state, set];
}
