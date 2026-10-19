import { useLayoutEffect, useRef, useSyncExternalStore } from 'react';
import { listenerSet } from './listener-set';

/*
 * A place in the App that a part elsewhere in the tree fills, such as the Frame's sidebar or its Inspector column:
 * the newest claim shows, and a claim gives the place back only while it still holds it.
 */
export interface ClaimStore<Value> {
  // Holds the place, showing `empty` until the claim shows its own value.
  claim: () => Claim<Value>;
  subscribe: (listener: () => void) => () => void;
  // The holding claim's value; undefined while nothing holds the place.
  current: () => Value | undefined;
}

export interface Claim<Value> {
  // Shows the value as it is now, while this claim holds the place.
  show: (value: Value) => void;
  release: () => void;
}

interface Held<Value> {
  value: Value;
}

interface Place<Value> {
  held: Held<Value> | undefined;
  notify: () => void;
}

// One claim on the place: it shows and releases only while it still holds it.
function claimOf<Value>(place: Place<Value>, own: Held<Value>): Claim<Value> {
  return {
    show: (value) => {
      own.value = value;

      if (place.held === own) place.notify();
    },
    release: () => {
      if (place.held !== own) return;

      place.held = undefined;
      place.notify();
    },
  };
}

export function createClaimStore<Value>(empty: Value): ClaimStore<Value> {
  const listeners = listenerSet();
  const place: Place<Value> = { held: undefined, notify: listeners.notify };

  const claim = (): Claim<Value> => {
    const own: Held<Value> = { value: empty };
    place.held = own;
    place.notify();

    return claimOf(place, own);
  };

  return {
    claim,
    subscribe: listeners.subscribe,
    current: () => place.held?.value,
  };
}

// Holds the place while mounted, and shows the value as each render has it.
export function useClaim<Value>(store: ClaimStore<Value>, value: Value): void {
  const claim = useRef<Claim<Value>>(null);

  useLayoutEffect(() => {
    const held = store.claim();
    claim.current = held;

    return held.release;
  }, [store]);

  // Runs after the claim above, in the same commit.
  useLayoutEffect(() => claim.current?.show(value), [store, value]);
}

// The holding claim's value, for the place to draw.
export function useClaimed<Value>(store: ClaimStore<Value>): Value | undefined {
  return useSyncExternalStore(store.subscribe, store.current);
}
