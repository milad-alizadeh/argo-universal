import { useEffect, useRef, type ReactNode } from 'react';
import { View, type PointerEvent } from 'react-native';
import type { RowDragProps } from './list-row-press';
import { pressStart } from './list-row-press';
import { pointOf, WindowPress, type WebPressStart } from './list-window-press';

type DownEvent = PointerEvent['nativeEvent'];

// The left button of the primary pointer drags; the right one leaves the row to its context menu.
const drags = (event: DownEvent): boolean =>
  event.button === 0 && event.isPrimary;

const webPress = (event: DownEvent): WebPressStart => ({
  pointerId: event.pointerId,
  ...pressStart(pointOf(event), event.pointerType === 'mouse'),
});

/*
 * The web follows the press with the page's own pointer events, which leave the row's right-click to its context
 * menu. A press on the row's view starts it; the window follows its moves and release.
 */
function useRowDrag(props: RowDragProps): (event: PointerEvent) => void {
  const active = useRef<WindowPress | null>(null);

  useEffect((): (() => void) => () => active.current?.cancel(), []);

  return ({ nativeEvent }) => {
    if (!drags(nativeEvent)) return;

    active.current?.cancel();
    active.current = new WindowPress(props, webPress(nativeEvent));
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
