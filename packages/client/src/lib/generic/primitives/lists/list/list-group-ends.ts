import { createContext, useCallback, useSyncExternalStore } from 'react';
import { listenerSet } from '../../../listener-set';

type Registration = { ends: boolean };

// Registration ownership prevents a recycled row's cleanup from clearing its replacement.
export class ListGroupEnds {
  private readonly rows = new Map<number, Registration>();
  private readonly listeners = listenerSet();
  readonly subscribe = this.listeners.subscribe;

  ends(index: number): boolean {
    return this.rows.get(index)?.ends ?? false;
  }

  register(index: number, ends: boolean): () => void {
    const before = this.ends(index);
    const owner = { ends };
    this.rows.set(index, owner);
    this.changed(before, ends);

    return () => this.remove(index, owner);
  }

  private remove(index: number, owner: Registration): void {
    if (this.rows.get(index) !== owner) return;
    this.rows.delete(index);
    this.changed(owner.ends, false);
  }

  private changed(before: boolean, after: boolean): void {
    if (before !== after) this.listeners.notify();
  }
}

export const ListGroupEndsContext = createContext<ListGroupEnds | undefined>(
  undefined,
);

const noGroupEnds = new ListGroupEnds();

export function useOpensGroup(groupEnds = noGroupEnds, index = 0): boolean {
  const opens = useCallback(
    () => groupEnds.ends(index - 1),
    [groupEnds, index],
  );

  return useSyncExternalStore(groupEnds.subscribe, opens, opens);
}
