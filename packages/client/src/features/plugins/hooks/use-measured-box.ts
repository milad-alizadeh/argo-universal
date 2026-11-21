import { useEffect, useState } from 'react';
import type { Box } from '../../../lib/product/plugin-registry/draft-commenting';

const same = (a: Box | null, b: Box): boolean =>
  a !== null &&
  a.x === b.x &&
  a.y === b.y &&
  a.width === b.width &&
  a.height === b.height;

/*
 * Where a node is in the window while `active`, followed frame by frame, since a node that draws no box of its own has
 * nothing to hold what the App draws over it. Idle while nothing is drawn over it.
 */
export function useMeasuredBox(
  measure: (done: (box: Box) => void) => void,
  active: boolean,
): Box | null {
  const [box, setBox] = useState<Box | null>(null);

  useEffect(() => {
    if (!active) return undefined;

    let frame = 0;

    const follow = (): void => {
      measure((next) => setBox((last) => (same(last, next) ? last : next)));
      frame = requestAnimationFrame(follow);
    };

    follow();

    return (): void => cancelAnimationFrame(frame);
    // The measure reads a ref, so it does not change what is followed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  return active ? box : null;
}
