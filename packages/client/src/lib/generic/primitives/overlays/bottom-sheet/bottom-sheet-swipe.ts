import { useEffect, type RefObject } from 'react';
import type { View } from 'react-native';

const dragDistance = 80;

const settleTransition = 'transform 150ms ease-out';

const fieldSelector = 'input, textarea, select, [contenteditable="true"]';

type SheetDragOptions = {
  sheet: RefObject<View | null>;
  onClose: () => void;
  onResize?: (expanded: boolean) => void;
};

export function useSwipeToClose(
  sheet: RefObject<View | null>,
  onClose: () => void,
  onResize?: (expanded: boolean) => void,
): void {
  useEffect(
    () => listenForDrag({ sheet, onClose, onResize }),
    [sheet, onClose, onResize],
  );
}

function listenForDrag(options: SheetDragOptions): () => void {
  let stopDrag: (() => void) | undefined;

  const start = (event: PointerEvent): void => {
    const sheet = options.sheet.current;

    if (!(sheet instanceof HTMLElement)) return;

    if (!startsDrag(event, sheet, !!options.onResize)) return;
    stopPreviousDrag(stopDrag);
    stopDrag = followPointer({ ...options, sheet, startY: event.clientY });
  };

  document.addEventListener('pointerdown', start);

  return () => {
    stopDrag?.();
    document.removeEventListener('pointerdown', start);
  };
}

function startsDrag(
  event: PointerEvent,
  sheet: HTMLElement,
  expandable: boolean,
): boolean {
  if (!isMainPointer(event)) return false;

  return landsOnSheet(event.target, sheet, expandable);
}

function isMainPointer(event: PointerEvent): boolean {
  return event.button === 0 && event.target instanceof Element;
}

function landsOnSheet(
  target: EventTarget | null,
  sheet: HTMLElement,
  expandable: boolean,
): boolean {
  if (!(target instanceof Element)) return false;

  if (!canDragFrom(target, sheet)) return false;

  return isGripDrag(target, expandable);
}

function canDragFrom(target: Element, sheet: HTMLElement): boolean {
  return sheet.contains(target) && !target.closest(fieldSelector);
}

function isGripDrag(target: Element, expandable: boolean): boolean {
  return !expandable || target.closest('[role="slider"]') !== null;
}

function stopPreviousDrag(stop: (() => void) | undefined): void {
  stop?.();
}

type Drag = Omit<SheetDragOptions, 'sheet'> & {
  sheet: HTMLElement;
  startY: number;
};

function followPointer(drag: Drag): () => void {
  const move = (event: PointerEvent): void => moveSheet(drag, event);

  const release = (event: PointerEvent): void => {
    stop();
    releaseDrag(drag, event);
  };

  drag.sheet.style.transition = '';
  const unlisten = listenToPointer(move, release);

  const stop = (): void => {
    unlisten();
    settleBack(drag.sheet);
  };

  return stop;
}

function moveSheet(drag: Drag, event: PointerEvent): void {
  drag.sheet.style.transform = `translateY(${Math.max(0, event.clientY - drag.startY)}px)`;
}

function listenToPointer(
  move: (event: PointerEvent) => void,
  release: (event: PointerEvent) => void,
): () => void {
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', release);
  window.addEventListener('pointercancel', release);

  return () => {
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', release);
    window.removeEventListener('pointercancel', release);
  };
}

function releaseDrag(drag: Drag, event: PointerEvent): void {
  if (event.type !== 'pointerup') return;
  const distance = event.clientY - drag.startY;

  if (Math.abs(distance) < dragDistance) return;
  resizeOrClose(drag, distance);
}

function settleBack(sheet: HTMLElement): void {
  sheet.style.transition = settleTransition;
  sheet.style.transform = '';
}

function resizeOrClose(drag: Drag, distance: number): void {
  if (drag.onResize) {
    drag.onResize(distance < 0);

    return;
  }

  if (distance > 0) drag.onClose();
}
