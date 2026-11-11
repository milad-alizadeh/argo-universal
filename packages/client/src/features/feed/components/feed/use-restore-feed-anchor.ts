import type { LegendListRef } from '@legendapp/list/react-native';
import { type RefObject, useCallback, useEffect, useRef } from 'react';
import type { FeedAnchor } from './feed-scroll-memory';
import { type AnchoredList, restoreFeedAnchor } from './restore-feed-anchor';

export type RestorableList = AnchoredList &
  Pick<LegendListRef, 'scrollToEnd' | 'cancelScroll'>;

type ListRef = RefObject<RestorableList | null>;

interface Restoration {
  open: (anchor: FeedAnchor | null) => void;
  cancel: () => void;
}

const inputEvents = ['wheel', 'touchstart', 'pointerdown', 'keydown'] as const;

const canListen = (): boolean =>
  typeof window !== 'undefined' && !!window.addEventListener;

export function inputGuard(cancel: () => void): () => void {
  if (!canListen()) return () => {};

  for (const event of inputEvents)
    window.addEventListener(event, cancel, { passive: true });

  return (): void => {
    for (const event of inputEvents) window.removeEventListener(event, cancel);
  };
}

function restore(
  current: RestorableList,
  anchor: FeedAnchor,
  controller: AbortController,
): void {
  const removeGuard = inputGuard(() => {
    controller.abort();
    current.cancelScroll();
  });

  controller.signal.addEventListener('abort', removeGuard, { once: true });
  void restoreFeedAnchor(current, anchor, controller.signal).finally(() => {
    removeGuard();
    controller.abort();
  });
}

function openAt(
  list: ListRef,
  anchor: FeedAnchor | null,
  controller: AbortController,
): void {
  const current = list.current;

  if (!current) return;

  if (anchor) restore(current, anchor, controller);
  else
    void current
      .scrollToEnd({ animated: false })
      .finally(() => controller.abort());
}

const isActive = (
  controller: AbortController | null,
): controller is AbortController =>
  controller !== null && !controller.signal.aborted;

function cancelController(
  list: ListRef,
  controller: RefObject<AbortController | null>,
): void {
  const active = controller.current;

  if (!isActive(active)) return;

  active.abort();
  // Legend List's cancelScroll may flushSync, which React refuses inside the commit this effect cleanup runs in (#1977). A restoration opened meanwhile owns the scroll, so leave it alone.
  queueMicrotask(() => {
    if (controller.current === active) list.current?.cancelScroll();
  });
}

function useCancel(
  list: ListRef,
  controller: RefObject<AbortController | null>,
): () => void {
  return useCallback(
    () => cancelController(list, controller),
    [controller, list],
  );
}

function useRestoration(list: ListRef): Restoration {
  const controller = useRef<AbortController | null>(null);
  const cancel = useCancel(list, controller);

  const open = useCallback(
    (anchor: FeedAnchor | null) => {
      cancel();
      const next = new AbortController();
      controller.current = next;
      openAt(list, anchor, next);
    },
    [cancel, list],
  );

  return { open, cancel };
}

export function useRestoreFeedAnchor(
  list: ListRef,
  shown: boolean,
): Restoration {
  const restoration = useRestoration(list);
  const { cancel } = restoration;

  useEffect(() => {
    if (!shown) cancel();

    return cancel;
  }, [shown, cancel]);

  return restoration;
}
