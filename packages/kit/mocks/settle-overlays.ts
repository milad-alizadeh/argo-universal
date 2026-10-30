import { nextFrames } from '#mocks/next-frames';

const overlaySelector = '[role="menu"], [role="dialog"], [role="listbox"]';

/*
 * The story-test driver for an overlay's entrance, to await before a real browser pointer presses a row in one.
 * A menu, a popover and a drill zoom in from 95%, so their rows keep moving for the length of that entrance and a
 * nested menu moves with the row it hangs off. The pointer is aimed at the box the runner measured, and a press
 * that lands beside a row of a nested menu focuses a row of the menu above, which closes the nested menu for good:
 * the press is then lost rather than late, and no waiting afterwards can recover it (#1466).
 */
export async function settleOverlays(): Promise<void> {
  const animations = [...document.querySelectorAll(overlaySelector)]
    .flatMap((overlay) => overlay.getAnimations({ subtree: true }))
    .filter(endsByClock);

  await Promise.all(
    // An animation that is cancelled has stopped moving too, so its end is taken for what it is.
    animations.map((animation) => animation.finished.catch(ignore)),
  );

  await nextFrames();
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
