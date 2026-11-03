import type { WireNode } from './wire';

/*
 * The root of a page that draws nothing: one that returns `null`, or whose whole tree the Server could not draw. It is
 * no kit component, so an App draws nothing for it.
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
