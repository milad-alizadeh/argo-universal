import type { LegendListRef } from '@legendapp/list/react-native';
import { type RefObject, useEffect } from 'react';

function listNode(list: LegendListRef | null): Node | undefined {
  const node: unknown = list?.getScrollableNode();

  return node instanceof Node ? node : undefined;
}

// An animation on the list itself or on an element around it, not on one of its rows.
function animatesAround(
  event: AnimationEvent,
  node: Node | undefined,
): boolean {
  return (
    node !== undefined &&
    event.target instanceof Node &&
    event.target.contains(node)
  );
}

/*
 * Legend List's web build measures rows with getBoundingClientRect, which includes an ancestor's transform. A
 * popover, menu or dialog opens with a zoom-in from 95%, so rows measured mid-animation keep 95% of their height,
 * and a short list that fits clips its last row and scrolls. When an animation around the list ends, measure again.
 */
export function useRemeasureAfterEntrance(
  list: RefObject<LegendListRef | null>,
): void {
  useEffect(() => {
    const remeasure = (event: AnimationEvent): void => {
      if (animatesAround(event, listNode(list.current)))
        list.current?.clearCaches();
    };

    document.addEventListener('animationend', remeasure, true);

    return (): void =>
      document.removeEventListener('animationend', remeasure, true);
  }, [list]);
}
