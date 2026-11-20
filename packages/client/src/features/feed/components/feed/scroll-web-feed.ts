import { useCallback, type RefCallback } from 'react';
import { Platform, type ViewInstance } from 'react-native';
import type { ListRef } from './keep-place';

const modifiers = ['Alt', 'Control', 'Meta', 'Shift'];

function plainVerticalWheel(event: WheelEvent): boolean {
  if (
    event.deltaMode !== WheelEvent.DOM_DELTA_PIXEL ||
    Math.abs(event.deltaX) >= Math.abs(event.deltaY)
  )
    return false;

  return !modifiers.some((key) => event.getModifierState(key));
}

const scrollable = /^(auto|scroll|overlay)$/;

const scrollsVertically = (node: HTMLElement): boolean =>
  node.scrollHeight > node.clientHeight &&
  scrollable.test(getComputedStyle(node).overflowY);

const scrollsHorizontally = (node: HTMLElement): boolean =>
  node.scrollWidth > node.clientWidth &&
  scrollable.test(getComputedStyle(node).overflowX);

function nestedScroller(node: HTMLElement, deltaX: number): boolean {
  return scrollsVertically(node) || (deltaX !== 0 && scrollsHorizontally(node));
}

function ownsWheel(target: EventTarget, deltaX: number): boolean {
  if (!(target instanceof HTMLElement)) return false;

  return (
    target.matches('input, select, textarea, [contenteditable]') ||
    nestedScroller(target, deltaX)
  );
}

function targetsFeed(event: WheelEvent, feed: HTMLElement): boolean {
  const path = event.composedPath();

  const boundary = path.indexOf(feed);

  return (
    boundary >= 0 &&
    !path.slice(0, boundary).some((target) => ownsWheel(target, event.deltaX))
  );
}

function canScroll(feed: HTMLElement, delta: number): boolean {
  return delta > 0
    ? Math.ceil(feed.scrollTop) < feed.scrollHeight - feed.clientHeight
    : delta < 0 && Math.floor(feed.scrollTop) > 0;
}

const availableWheel = (event: WheelEvent): boolean =>
  event.cancelable && !event.defaultPrevented && plainVerticalWheel(event);

const movesFeed = (feed: HTMLElement, event: WheelEvent): boolean =>
  canScroll(feed, event.deltaY) && targetsFeed(event, feed);

/*
 * Apply vertical pixel deltas on the thread that updates the virtualized rows.
 * Chrome can otherwise present the new offset before it has painted the row text.
 */
function scrollFeed(
  feed: HTMLElement,
  event: WheelEvent,
  fraction: number,
): number {
  if (!availableWheel(event) || !movesFeed(feed, event)) return 0;

  event.preventDefault();
  // Keep fractional trackpad movement across events even when the browser rounds each scroll.
  const delta = event.deltaY + fraction;
  const pixels = Math.round(delta);
  feed.scrollBy({ left: event.deltaX, top: pixels, behavior: 'instant' });

  return delta - pixels;
}

// Listen on the wrapper so LegendList can interrupt navigation before the Feed consumes a wheel event.
function watchFeedWheel(wrapper: HTMLElement, list: ListRef): () => void {
  let fraction = 0;

  const wheel = (event: WheelEvent): void => {
    const feed: unknown = list.current?.getScrollableNode();

    if (feed instanceof HTMLElement)
      fraction = scrollFeed(feed, event, fraction);
  };

  wrapper.addEventListener('wheel', wheel, { passive: false });

  return () => wrapper.removeEventListener('wheel', wheel);
}

export function useFeedWheel(list: ListRef): RefCallback<ViewInstance> {
  return useCallback(
    (wrapper) =>
      Platform.OS === 'web' && wrapper instanceof HTMLElement
        ? watchFeedWheel(wrapper, list)
        : undefined,
    [list],
  );
}
