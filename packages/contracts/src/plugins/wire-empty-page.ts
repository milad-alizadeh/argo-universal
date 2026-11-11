import type { WireNode } from './wire';

/*
 * The root of a page that draws nothing: one whose Render returns `null`, or whose whole tree the Server could not
 * draw. It is no kit component, so an App draws nothing for it, and a Workbench card whose page answers it is not
 * drawn (ADR-0035, ADR-0050).
 */
export const emptyPage = (key = '0'): WireNode => ({
  type: '#empty',
  key,
  props: {},
  children: [],
  slots: {},
});

// A page drew nothing: no tree yet, or the empty root. A tree the Plugin drew, even an empty `Stack`, draws.
export const drawsNothing = (root: WireNode | null): boolean =>
  !root || root.type === '#empty';
