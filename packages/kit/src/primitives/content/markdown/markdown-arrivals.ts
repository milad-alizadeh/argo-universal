import { createContext, useEffect, useState } from 'react';

// Whether a Markdown was already on screen and streaming when a block of it is first drawn: such a block is new text, and fades in whole.
export interface Arrivals {
  began: () => boolean;
}

interface ArrivalsSwitch extends Arrivals {
  set: (streaming: boolean) => void;
}

// A message drawn outside a Markdown that streams has no arrivals.
const none: Arrivals = { began: () => false };

export const ArrivalsContext = createContext<Arrivals>(none);

function makeArrivals(): ArrivalsSwitch {
  let streamed = false;

  return {
    began: () => streamed,
    set: (streaming): void => {
      streamed = streaming;
    },
  };
}

/*
 * Says whether the Markdown had streamed by its last commit. It is read once, as a block mounts, so
 * it is kept outside React's state: a message that scrolls into view, or a Session that opens, draws
 * its blocks in the Markdown's first commit, and nothing in them fades.
 */
export function useArrivals(streaming: boolean): Arrivals {
  const [arrivals] = useState(makeArrivals);

  useEffect(() => arrivals.set(streaming), [arrivals, streaming]);

  return arrivals;
}
