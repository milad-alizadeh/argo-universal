import type { ConversationPartial } from '@repo/contracts';
import { useEffect, useState } from 'react';
import {
  drawnPartials,
  type HeldPartials,
  holdPartials,
  noHeldPartials,
} from '../utils/held-partials';

/*
 * Long enough for the Feed to commit the stored row of a partial the call has cleared; the Feed then draws
 * that row in the partial's place. A partial that never became final, as when the call ends mid-sentence,
 * leaves once this has passed.
 */
const holdMilliseconds = 1000;

const released = (state: HeldPartials): HeldPartials => ({
  live: state.live,
  held: [],
});

// The words being said on the call, with those it has just made final held until their row is drawn.
export function useHeldPartials(
  live: readonly ConversationPartial[],
): ConversationPartial[] {
  const [state, setState] = useState(() => holdPartials(noHeldPartials, live));
  const current = state.live === live ? state : holdPartials(state, live);

  if (current !== state) setState(current);

  const { held } = current;

  useEffect(() => {
    if (held.length === 0) return;

    const timer = setTimeout(() => setState(released), holdMilliseconds);

    return (): void => clearTimeout(timer);
  }, [held]);

  return drawnPartials(current);
}
