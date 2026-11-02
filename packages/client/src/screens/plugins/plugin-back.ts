/*
 * A nav item's root page is a rail section's root, a destination that draws no Back; any other page draws one when it
 * was pushed, which is when its section's stack holds a page below it. A sidebar tap replaces the stack, so the page it
 * opens has none.
 */
export const showsBack = (root: boolean, pushed: boolean): boolean =>
  !root && pushed;
