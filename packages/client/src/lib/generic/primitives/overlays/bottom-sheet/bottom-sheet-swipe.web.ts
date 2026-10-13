import { useEffect, type RefObject } from 'react';
import type { View } from 'react-native';

// How far the sheet must travel down before letting go closes it, as on a phone's native sheet.
const closeDistance = 80;
const settleTransition = 'transform 150ms ease-out';
const fieldSelector = 'input, textarea, select, [contenteditable="true"]';

// The sheet follows a downward drag that starts on it, and closes when let go far enough down.
export function useSwipeToClose(
  sheet: RefObject<View | null>,
  onClose: () => void,
): void {
  useEffect(() => {
    const startDrag = (press: PointerEvent): void => {
      const element = sheet.current;
      if (!(element instanceof HTMLElement) || !startsDrag(press, element))
        return;
      followPointer({ sheet: element, startY: press.clientY, onClose });
    };
    document.addEventListener('pointerdown', startDrag);
    return (): void => document.removeEventListener('pointerdown', startDrag);
  }, [sheet, onClose]);
}

// The press must be the main button, on the sheet, and not in a field, where a drag selects text.
function startsDrag(press: PointerEvent, sheet: HTMLElement): boolean {
  return press.button === 0 && landsOnSheet(press.target, sheet);
}

function landsOnSheet(target: EventTarget | null, sheet: HTMLElement): boolean {
  if (!(target instanceof Node)) return false;
  return sheet.contains(target) && !startsInField(target);
}

function startsInField(target: Node): boolean {
  return target instanceof Element && target.closest(fieldSelector) !== null;
}

type Drag = { sheet: HTMLElement; startY: number; onClose: () => void };

function followPointer({ sheet, startY, onClose }: Drag): void {
  const travel = (event: PointerEvent): number =>
    Math.max(0, event.clientY - startY);
  const move = (event: PointerEvent): void => {
    sheet.style.transform = `translateY(${travel(event)}px)`;
  };
  const release = (event: PointerEvent): void => {
    stopFollowing(move, release);
    if (event.type === 'pointerup' && travel(event) >= closeDistance) onClose();
    else settleBack(sheet);
  };
  sheet.style.transition = '';
  startFollowing(move, release);
}

function startFollowing(
  move: (event: PointerEvent) => void,
  release: (event: PointerEvent) => void,
): void {
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', release);
  window.addEventListener('pointercancel', release);
}

function stopFollowing(
  move: (event: PointerEvent) => void,
  release: (event: PointerEvent) => void,
): void {
  window.removeEventListener('pointermove', move);
  window.removeEventListener('pointerup', release);
  window.removeEventListener('pointercancel', release);
}

function settleBack(sheet: HTMLElement): void {
  sheet.style.transition = settleTransition;
  sheet.style.transform = '';
}
