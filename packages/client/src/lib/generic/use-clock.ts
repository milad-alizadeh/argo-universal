import { useEffect, useState } from 'react';
import { millisecondsPerSecond } from './format-elapsed';

// The current time, ticking each second while `running`; `now` fixes it for stories and tests.
export function useClock(running: boolean, now?: number): number {
  const [clock, setClock] = useState(Date.now);
  useEffect(() => {
    if (!running || now !== undefined) return;
    const timer = setInterval(
      () => setClock(Date.now()),
      millisecondsPerSecond,
    );
    return (): void => clearInterval(timer);
  }, [running, now]);
  return now ?? clock;
}
