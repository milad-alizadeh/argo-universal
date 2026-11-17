/*
 * A nav item's root page is a rail section's root, a destination that draws no Back; any page pushed above it does,
 * when the stack can go back.
 */
export const showsBack = (root: boolean, canGoBack: boolean): boolean =>
  !root && canGoBack;
