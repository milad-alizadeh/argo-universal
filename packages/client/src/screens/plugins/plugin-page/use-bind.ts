import {
  PageStateValue,
  type PageStateChange,
  type WireJson,
} from '@repo/contracts/plugins/wire';
import { useEffect, useState } from 'react';

// How long a bound search or selection waits for the edits to pause before the page draws for it.
const bindPauseMs = 300;

type Timers = Map<string, ReturnType<typeof setTimeout>>;

export type Bind = (key: string, value: WireJson | undefined) => Promise<void>;

/*
 * A bound search or selection: the kit component already shows the edit; the page draws for it once the
 * edits pause, and an edit before then starts the wait again.
 */
export function useBind(
  change: (call: PageStateChange) => Promise<void>,
): Bind {
  const timers = useTimers();

  return (key, value) => {
    const parsed = PageStateValue.safeParse(value ?? '');

    if (parsed.success)
      waitThen(timers, key, () =>
        change({ pageState: { [key]: parsed.data } }),
      );

    return Promise.resolve();
  };
}

// The key's wait starts again; once it ends, the change is made.
function waitThen(
  timers: Timers,
  key: string,
  then: () => Promise<void>,
): void {
  clearTimeout(timers.get(key));
  timers.set(
    key,
    setTimeout(() => {
      timers.delete(key);
      void then();
    }, bindPauseMs),
  );
}

// The waits still running when the page goes away are dropped with it.
function useTimers(): Timers {
  const [timers] = useState<Timers>(() => new Map());

  useEffect(
    () => (): void => {
      for (const timer of timers.values()) clearTimeout(timer);
    },
    [timers],
  );

  return timers;
}
