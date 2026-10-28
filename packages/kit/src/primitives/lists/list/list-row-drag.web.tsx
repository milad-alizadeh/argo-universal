import { useEffect, useRef, type ReactNode } from 'react';
import { View, type PointerEvent } from 'react-native';
import type { RowDragProps } from './list-row-drag-props';
import { pointOf, RowPress, type WebPressStart } from './list-row-press';

type DownEvent = PointerEvent['nativeEvent'];

// The left button of the primary pointer drags; the right one leaves the row to its context menu.
const drags = (event: DownEvent): boolean =>
  event.button === 0 && event.isPrimary;

const pressStart = (event: DownEvent): WebPressStart => ({
  pointerId: event.pointerId,
  start: pointOf(event),
  at: Date.now(),
  pointer: event.pointerType === 'mouse' ? 'mouse' : 'touch',
});

/*
 * The web follows the press with the page's own pointer events, which leave the row's right-click to its context
 * menu. A press on the row's view starts it; the window follows its moves and release.
 */
function useRowDrag(props: RowDragProps): (event: PointerEvent) => void {
  const active = useRef<RowPress | null>(null);

  useEffect((): (() => void) => () => active.current?.cancel(), []);

  return ({ nativeEvent }) => {
    if (!drags(nativeEvent)) return;

    active.current?.cancel();
    active.current = new RowPress(props, pressStart(nativeEvent));
  };
}

// Desktop and web: a mouse lifts a row once it moves past the slop.
export function RowDrag(props: RowDragProps): ReactNode {
  const onPointerDown = useRowDrag(props);
  const { viewRef, children } = props;

  return (
    <View ref={viewRef} collapsable={false} onPointerDown={onPointerDown}>
      {children}
    </View>
  );
}
