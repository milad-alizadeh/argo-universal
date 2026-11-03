import type { WireNode } from './wire';

// What the Engine sends for a page that draws nothing, such as one that returns `null`.
export const emptyPage = (): WireNode => ({
  type: 'Stack',
  key: '0',
  props: { direction: 'column' },
  children: [],
  slots: {},
});

const holdsNothing = ({ children, slots }: WireNode): boolean =>
  children.length === 0 && Object.values(slots).every((nodes) => !nodes.length);

/*
 * A page drew nothing: no tree yet, or an empty column. A page whose root is one component, such as a `Text`, has no
 * children either, and it still draws, so only a `Stack` holding nothing counts.
 */
export const drawsNothing = (root: WireNode | null): boolean =>
  !root || (root.type === 'Stack' && holdsNothing(root));
