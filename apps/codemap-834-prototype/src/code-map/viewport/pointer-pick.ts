import { useEffect, type RefObject } from 'react';
import type { ScreenPoint, Viewport } from './viewport';

/** A pointer that travels this far between press and release is a drag, which never selects. */
export const dragThreshold = 5;

interface PickTarget {
  element: HTMLElement;
  viewport: Viewport;
  onSelect: (id: string) => void;
}

export function isPress(down: ScreenPoint, up: ScreenPoint): boolean {
  return Math.hypot(up.x - down.x, up.y - down.y) < dragThreshold;
}

function local(event: PointerEvent, element: HTMLElement): ScreenPoint {
  const bounds = element.getBoundingClientRect();

  return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
}

function release(
  event: PointerEvent,
  down: ScreenPoint,
  target: PickTarget,
): void {
  if (!isPress(down, { x: event.clientX, y: event.clientY })) return;
  const id = target.viewport.pick(local(event, target.element));

  if (id !== undefined) target.onSelect(id);
}

type PointerType = 'pointerdown' | 'pointermove' | 'pointerup';

export type PointerListener = readonly [
  PointerType,
  (event: PointerEvent) => void,
];

/** Adds the listeners and returns their removal. */
export function listen(
  element: HTMLElement,
  listeners: PointerListener[],
): () => void {
  for (const [type, handler] of listeners)
    element.addEventListener(type, handler);

  return (): void => {
    for (const [type, handler] of listeners)
      element.removeEventListener(type, handler);
  };
}

const primaryButton = 0;

/** Only a primary press can select, as a click would. */
function primary(event: PointerEvent): ScreenPoint | null {
  return event.button === primaryButton
    ? { x: event.clientX, y: event.clientY }
    : null;
}

interface Press {
  target: PickTarget;
  down: ScreenPoint | null;
}

function up(press: Press, event: PointerEvent): void {
  if (press.down) release(event, press.down, press.target);
  press.down = null;
}

function attach(target: PickTarget): () => void {
  const press: Press = { target, down: null };

  return listen(target.element, [
    [
      'pointerdown',
      (event): void => {
        press.down = primary(event);
      },
    ],
    ['pointerup', (event): void => up(press, event)],
  ]);
}

/** Selects the file under a press on the element; drags never select. */
export function usePointerPick(
  element: RefObject<HTMLElement | null>,
  viewport: Viewport,
  onSelect: (id: string) => void,
): void {
  useEffect(() => {
    const target = element.current;

    return target ? attach({ element: target, viewport, onSelect }) : undefined;
  }, [element, viewport, onSelect]);
}
