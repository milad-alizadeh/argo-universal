import type { LegendListRef } from '@legendapp/list/react-native';
import { type RefObject, useCallback, useEffect, useRef } from 'react';
import type { FeedAnchor } from './feed-scroll-memory';
import { restoreFeedAnchor } from './restore-feed-anchor';

type ListRef = RefObject<LegendListRef | null>;

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
  current: LegendListRef,
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
  if (!isActive(controller.current)) return;

  controller.current.abort();
  list.current?.cancelScroll();
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
