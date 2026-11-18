import type { Token } from 'marked';
import { useContext, useEffect, useState } from 'react';
import { motionDuration } from '#kit/motion';
import {
  fadeMilliseconds,
  firstTrail,
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

type Tokens = readonly Token[] | undefined;

function useFirstTrail(tokens: Tokens, growing: boolean): Trail | null {
  const { began } = useContext(ArrivalsContext);

  return useState(() =>
    firstTrail(drawnText(tokens), { began: began(), growing }),
  )[0];
}

// A block at rest has no text to follow, so its text is not read.
const textToFollow = (tokens: Tokens, followed: boolean): string =>
  followed ? drawnText(tokens) : '';

// The trail is state the block derives from its text as it renders, so a chunk costs no effect.
function useTrail(tokens: Tokens, growing: boolean): Trail | null {
  const [trail, setTrail] = useState(useFirstTrail(tokens, growing));
  const text = textToFollow(tokens, growing || trail !== null);
  const next = followText(trail, text, growing);

  if (next !== trail) setTrail(next);

  useSettledAfterFade(next, setTrail);

  return next;
}

/*
 * Where each run of newly arrived text begins in a block's drawn text, counted from its start, while
 * the block is being written or its last runs fade; `undefined` for a block at rest, which then does
 * no work here.
 */
export function useArrivingMarks(
  tokens: Tokens,
  growing: boolean,
): Arriving | undefined {
  const trail = useTrail(tokens, growing);

  return trail ? { marks: trail.marks, start: 0 } : undefined;
}
