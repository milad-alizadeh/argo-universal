import type { Token } from 'marked';
import { useContext, useEffect, useState } from 'react';
import { motionDuration } from '#kit/motion';
import {
  arrivingTrail,
  fadeMilliseconds,
  followText,
  settledTrail,
  type Trail,
} from './arriving-text';
import { drawnText } from './drawn-text';
import type { Arriving } from './inline-tokens';
import { ArrivalsContext } from './markdown-arrivals';

// Past the fade's end, so a run is never made plain while it is still fading.
const settleMilliseconds = fadeMilliseconds + motionDuration.exit;

type SetTrail = (trail: Trail | null) => void;

// Once the newest run has faded the text is drawn plain again.
function useSettledAfterFade(trail: Trail | null, setTrail: SetTrail): void {
  useEffect(() => {
    if (!trail?.marks.length) return;

    const timer = setTimeout(
      () => setTrail(settledTrail(trail.text)),
      settleMilliseconds,
    );

    return (): void => clearTimeout(timer);
  }, [setTrail, trail]);
}

// A block that starts in a Markdown already streaming is new from its first letter; one drawn with its Markdown was there to read.
function useFirstTrail(text: string, growing: boolean): Trail | null {
  const { began } = useContext(ArrivalsContext);

  if (!growing) return null;

  return began() ? arrivingTrail(text) : settledTrail(text);
}

/*
 * Where each run of newly arrived text begins in a block's drawn text, counted from its start, while
 * the block is being written or its last runs fade; `undefined` for a block at rest, which then does no work here.
 * The trail is state the block derives from its text as it renders, so a chunk costs no effect.
 */
export function useArrivingMarks(
  tokens: readonly Token[] | undefined,
  growing: boolean,
): Arriving | undefined {
  const text = drawnText(tokens);
  const first = useFirstTrail(text, growing);
  const [trail, setTrail] = useState(first);
  const next = followText(trail, text, growing);

  if (next !== trail) setTrail(next);

  useSettledAfterFade(next, setTrail);

  return next ? { marks: next.marks, start: 0 } : undefined;
}
