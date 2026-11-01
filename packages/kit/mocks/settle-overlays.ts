import { nextFrames } from '#mocks/next-frames';
import { canPointAt } from '#mocks/point-hit';

const overlaySelector = '[role="menu"], [role="dialog"], [role="listbox"]';

/*
 * The story-test driver for an overlay's entrance, to await before a real browser pointer presses a row in one.
 * A menu, a popover and a drill zoom in from 95%, so their rows keep moving for the length of that entrance and a
 * nested menu moves with the row it hangs off. The pointer is aimed at the box the runner measured, and a press
 * that lands beside a row of a nested menu focuses a row of the menu above, which closes the nested menu for good:
 * the press is then lost rather than late, and no waiting afterwards can recover it (#1466).
 *
 * Name the row to be pressed and the wait follows that row as well: an overlay's animations end before a nested menu
 * has taken its place, and on a loaded shard the runner can measure a row that is still being positioned or that a
 * person could not yet point at, and aim the press at the page behind it (#1772).
 */
export async function settleOverlays(row?: Element): Promise<void> {
  const animations = [...document.querySelectorAll(overlaySelector)]
    .flatMap((overlay) => overlay.getAnimations({ subtree: true }))
    .filter(endsByClock);

  await Promise.all(
    // An animation that is cancelled has stopped moving too, so its end is taken for what it is.
    animations.map((animation) => animation.finished.catch(ignore)),
  );

  await nextFrames();

  if (row) await rowSettled(row);
}

const stillFrames = 3;

// Resolves once the row has kept one box for a few frames while a person could point at it there.
async function rowSettled(row: Element): Promise<void> {
  let still = 0;
  let box = boxOf(row);

  while (still < stillFrames) {
    await nextFrames();

    const now = boxOf(row);
    still = held(row, box, now) ? still + 1 : 0;
    box = now;
  }
}

const held = (row: Element, before: string, now: string): boolean =>
  before === now && canPointAt(row);

// The row's box as one comparable value.
function boxOf(row: Element): string {
  const { left, top, width, height } = row.getBoundingClientRect();

  return [left, top, width, height].join(' ');
}

function ignore(): void {}

// A spinner repeats for ever, and a scroll fade is driven by how far its list has moved rather than by time.
function endsByClock(animation: Animation): boolean {
  if (animation.timeline !== document.timeline) return false;

  return (
    animation.effect?.getComputedTiming().iterations !==
    Number.POSITIVE_INFINITY
  );
}
