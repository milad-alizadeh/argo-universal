import { useRef, type ReactNode } from 'react';
import { View } from 'react-native';
import {
  GestureDetector,
  GestureStateManager,
  PointerType,
  usePanGesture,
  type GestureTouchEvent,
  type PanGesture,
} from 'react-native-gesture-handler';
import { dragStart, type PressTrack } from './list-drag-rules';
import type { Point } from './list-drop-aim';
import type { RowDragProps } from './list-row-drag-props';

interface Press {
  start: Point;
  at: number;
  pointer: PressTrack['pointer'];
}

const firstTouch = (event: GestureTouchEvent): Point | undefined => {
  const touch = event.allTouches[0] ?? event.changedTouches[0];

  return touch && { x: touch.absoluteX, y: touch.absoluteY };
};

/*
 * Gesture Handler's Pan with `manualActivation`: each touch move asks `dragStart` whether the press lifts the row,
 * scrolls, or waits, and `GestureStateManager` activates or fails the Pan to match. Until it activates, the row's
 * own press, its context menu's long press and the List's scroll keep the touch.
 */
function useRowDrag({ drag, id, ghost }: RowDragProps): PanGesture {
  const press = useRef<Press | undefined>(undefined);

  return usePanGesture({
    runOnJS: true,
    manualActivation: true,
    onTouchesDown: (event) => {
      const start = firstTouch(event);

      press.current = start && {
        start,
        at: Date.now(),
        pointer: event.pointerType === PointerType.MOUSE ? 'mouse' : 'touch',
      };
    },
    onTouchesMove: (event) => {
      const at = firstTouch(event);
      const started = press.current;

      if (!at || !started) return;

      const next = dragStart({
        pointer: started.pointer,
        heldFor: Date.now() - started.at,
        distance: Math.hypot(at.x - started.start.x, at.y - started.start.y),
      });

      if (next === 'lift') GestureStateManager.activate(event.handlerTag);
      else if (next === 'scroll') GestureStateManager.fail(event.handlerTag);
    },
    onActivate: (event) =>
      drag.begin(id, ghost, { x: event.absoluteX, y: event.absoluteY }),
    onUpdate: (event) =>
      drag.follow({ x: event.absoluteX, y: event.absoluteY }),
    onDeactivate: (event) => (event.canceled ? drag.cancel() : drag.finish()),
    onFinalize: () => {
      press.current = undefined;
    },
  });
}

// iOS and Android: a finger holds a row, then drags it.
export function RowDrag(props: RowDragProps): ReactNode {
  const gesture = useRowDrag(props);

  return (
    <GestureDetector gesture={gesture}>
      <View ref={props.viewRef} collapsable={false}>
        {props.children}
      </View>
    </GestureDetector>
  );
}
