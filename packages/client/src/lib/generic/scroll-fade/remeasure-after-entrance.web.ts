import type { LegendListRef } from '@legendapp/list/react-native';
import { type RefObject, useEffect } from 'react';

function listNode(list: LegendListRef | null): Node | null {
  const node: unknown = list?.getScrollableNode();

  return node instanceof Node ? node : null;
}

// Popovers, menus and dialogs zoom in; other animations, such as a Feed group opening, keep their own scroll anchoring.
const overlay = '[role="dialog"], [role="menu"]';

// An overlay around the list finished an animation; one of the list's own rows does not count.
function animatedOverlay(event: AnimationEvent): Element | undefined {
  const { target } = event;

  return target instanceof Element && target.matches(overlay)
    ? target
    : undefined;
}

function overlayAround(event: AnimationEvent, node: Node | null): boolean {
  return animatedOverlay(event)?.contains(node) === true;
}

/*
 * Legend List's web build measures rows with getBoundingClientRect, which includes an ancestor's transform. A
 * popover, menu or dialog opens with a zoom-in from 95%, so rows measured mid-animation keep 95% of their height,
 * and a short list that fits clips its last row and scrolls. When an overlay around the list finishes animating,
 * measure again.
 */
export function useRemeasureAfterEntrance(
  list: RefObject<LegendListRef | null>,
): void {
  useEffect(() => {
    const remeasure = (event: AnimationEvent): void => {
      if (overlayAround(event, listNode(list.current)))
        list.current?.clearCaches();
    };

    document.addEventListener('animationend', remeasure, true);

    return (): void =>
      document.removeEventListener('animationend', remeasure, true);
  }, [list]);
}
