// What a settle helper says when it gives up, naming the one condition that failed so a reader looks at the right thing.

// A top that has not been read twice yet has not held still, so a first poll reads as moving.
const stoppedMoving = (top: number, lastTop: number | undefined): boolean =>
  top === lastTop;

const stableFor = (top: number, lastTop: number | undefined): string =>
  stoppedMoving(top, lastTop)
    ? `its top is stable at ${top}`
    : `its top moved from ${lastTop ?? 'no reading'} to ${top}`;

// No point on the element can be hit, which is clipping or covering and has nothing to do with motion.
const unpointableMessage = (top: number, lastTop: number | undefined): string =>
  `No point on the element can be hit: it is clipped or covered, and ${stableFor(top, lastTop)}`;

// The element's reading, such as its top or its bottom, has not held for two frames.
export const movingMessage = (
  reading: string,
  value: number,
  last: number | undefined,
): string =>
  `The element is still moving: its ${reading} went from ${last ?? 'no reading'} to ${value}`;

// The message for whichever of the two settle conditions failed, the unpointable one first because it explains a stable top too.
export function settleFailure(
  pointable: boolean,
  top: number,
  lastTop: number | undefined,
): string {
  return pointable
    ? movingMessage('top', top, lastTop)
    : unpointableMessage(top, lastTop);
}

// Remembers the last reading a poll saw, and gives back the one before it: the poll compares against it, and a failure names it.
export function rememberReadings(): (reading: number) => number | undefined {
  let last: number | undefined;

  return (reading) => {
    const previous = last;

    last = reading;

    return previous;
  };
}
