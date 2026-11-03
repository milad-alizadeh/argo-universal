/*
 * What a Plugin page draws from where it sits in its section's stack. `distance` is how far below the shown page it
 * sits, 0 for the shown page itself; past 2 every page is alike, so a reader may cap it there.
 */
export interface StackPage {
  // The page keeps its view open: it is on screen, or directly below the page that is, which Back returns to.
  live: boolean;
  shown: boolean;
}

export const stackPageOf = (
  sectionShown: boolean,
  distance: number,
): StackPage => ({
  live: sectionShown && distance <= 1,
  shown: sectionShown && distance === 0,
});

/*
 * A nav item's root page is a rail section's root, a destination that draws no Back; any other page draws one when it
 * was pushed, which is when its section's stack holds a page below it. A sidebar tap replaces the stack, so the page it
 * opens has none.
 */
export const showsBack = (root: boolean, pushed: boolean): boolean =>
  !root && pushed;
