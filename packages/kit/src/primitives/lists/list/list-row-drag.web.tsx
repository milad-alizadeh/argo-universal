import { useEffect, useRef, type ReactNode } from 'react';
import { View, type PointerEvent } from 'react-native';
import { dragStart, type PressTrack } from './list-drag-rules';
import type { Point } from './list-drop-aim';
import type { RowDragProps } from './list-row-drag-props';

interface Press {
  pointerId: number;
  start: Point;
  at: number;
  pointer: PressTrack['pointer'];
  lifted: boolean;
}

const pointOf = (event: { clientX: number; clientY: number }): Point => ({
  x: event.clientX,
  y: event.clientY,
});

const prevent = (event: Event): void => event.preventDefault();

// The click a drag's release sends to the row it began on, swallowed so a dropped row is not also pressed.
function swallowReleaseClick(): void {
  const swallow = (event: MouseEvent): void => {
    event.stopPropagation();
    event.preventDefault();
  };

  window.addEventListener('click', swallow, { capture: true, once: true });
  // A release away from the row sends no click; the next real one goes through.
  setTimeout(() => window.removeEventListener('click', swallow, true));
}

/*
 * The web follows the press with the page's own pointer events, which leave the row's right-click to its context
 * menu. A press on the row's view starts it; moves and the release are followed on the window, so the drag keeps
 * the pointer once it leaves the row.
 */
function useRowDrag({
  drag,
  id,
  ghost,
}: RowDragProps): (event: PointerEvent) => void {
  const stop = useRef<(() => void) | undefined>(undefined);

  useEffect(() => () => stop.current?.(), []);

  return ({ nativeEvent }) => {
    if (nativeEvent.button !== 0 || !nativeEvent.isPrimary) return;

    stop.current?.();

    const press: Press = {
      pointerId: nativeEvent.pointerId,
      start: pointOf(nativeEvent),
      at: Date.now(),
      pointer: nativeEvent.pointerType === 'mouse' ? 'mouse' : 'touch',
      lifted: false,
    };
    const ours = (event: globalThis.PointerEvent): boolean =>
      event.pointerId === press.pointerId;

    const onMove = (event: globalThis.PointerEvent): void => {
      if (!ours(event)) return;

      const at = pointOf(event);

      if (press.lifted) return drag.follow(at);

      const next = dragStart({
        pointer: press.pointer,
        heldFor: Date.now() - press.at,
        distance: Math.hypot(at.x - press.start.x, at.y - press.start.y),
      });

      if (next === 'scroll') return end();

      if (next !== 'lift') return;

      press.lifted = true;
      drag.begin(id, ghost, press.start);
      drag.follow(at);
    };
    const onUp = (event: globalThis.PointerEvent): void => {
      if (!ours(event)) return;

      if (press.lifted) {
        swallowReleaseClick();
        drag.finish();
      }

      end();
    };
    const onCancel = (event: globalThis.PointerEvent): void => {
      if (ours(event)) cancel();
    };
    const cancel = (): void => {
      if (press.lifted) drag.cancel();

      end();
    };
    const end = (): void => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
      // A drag across rows would otherwise select their text.
      window.removeEventListener('selectstart', prevent);
      stop.current = undefined;
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
    window.addEventListener('selectstart', prevent);
    stop.current = cancel;
  };
}

// Desktop and web: a mouse lifts a row once it moves past the slop.
export function RowDrag(props: RowDragProps): ReactNode {
  const onPointerDown = useRowDrag(props);

  return (
    <View ref={props.viewRef} collapsable={false} onPointerDown={onPointerDown}>
      {props.children}
    </View>
  );
}
