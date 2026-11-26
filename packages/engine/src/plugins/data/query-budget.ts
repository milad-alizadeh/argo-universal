import type { QueryRead } from './query-types';

// Below this share of a rate limit left, a background pass and a Watch are served what was kept.
const backgroundFloor = 0.25;

// Below this share, only what a page on screen, a Slot and an Operation run ask for is read.
const onScreenFloor = 0.1;

// A draw no page holds is a background pass or a Watch, which nobody waits on.
const isBackground = ({ draw, holder }: QueryRead): boolean =>
  draw !== undefined && holder === undefined;

// What a person is looking at or asked for: a page on screen, a Slot an App shows, an Operation run.
const isWaitedOn = ({ holder, slot, asked }: QueryRead): boolean =>
  holder !== undefined || slot === true || asked === true;

/*
 * Whether Argo holds a read back to keep what is left of a rate limit for what a person waits on, and for the other
 * tools the person shares the limit with: under a quarter, background reads wait; under a tenth, everything but what
 * is on screen or asked for waits. A Query with nothing kept is always read.
 */
export function heldBack(read: QueryRead, left: number | undefined): boolean {
  if (left === undefined || left >= backgroundFloor || isWaitedOn(read))
    return false;

  return isBackground(read) || left < onScreenFloor;
}
