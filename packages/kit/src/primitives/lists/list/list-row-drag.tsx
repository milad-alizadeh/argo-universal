import { useState, type ReactNode } from 'react';
import { View } from 'react-native';
import {
  GestureDetector,
  GestureStateManager,
  PointerType,
  usePanGesture,
  type GestureTouchEvent,
  type PanGesture,
} from 'react-native-gesture-handler';
import { startAt, type DragStart, type PressStart } from './list-drag-rules';
import type { Point } from './list-drop-aim';
import type { RowDragProps } from './list-row-drag-props';

type PanConfig = Parameters<typeof usePanGesture>[0];

const firstTouch = (event: GestureTouchEvent): Point | undefined => {
  const touch = event.allTouches[0] ?? event.changedTouches[0];

  return touch && { x: touch.absoluteX, y: touch.absoluteY };
};

const pointerOf = (type: PointerType): PressStart['pointer'] =>
  type === PointerType.MOUSE ? 'mouse' : 'touch';

function pressFrom(event: GestureTouchEvent): PressStart | null {
  const start = firstTouch(event);

  return start
    ? { start, at: Date.now(), pointer: pointerOf(event.pointerType) }
    : null;
}

// Activates the Pan when the press lifts the row, and fails it when the press scrolls the List instead.
function settle(next: DragStart, handlerTag: number): void {
  if (next === 'lift') GestureStateManager.activate(handlerTag);
  else if (next === 'scroll') GestureStateManager.fail(handlerTag);
}

function decide(event: GestureTouchEvent, press: PressStart | null): void {
  const at = firstTouch(event);

  if (at && press) settle(startAt(press, at, Date.now()), event.handlerTag);
}

// The press a Pan follows, from its first touch until the Pan ends.
class TrackedPress {
  private press: PressStart | null = null;

  readonly down = (event: GestureTouchEvent): void => {
    this.press = pressFrom(event);
  };

  readonly move = (event: GestureTouchEvent): void => decide(event, this.press);

  readonly end = (): void => {
    this.press = null;
  };
}

// The List is measured as the press begins, so a lifted row follows the finger from its first move.
const pressHandlers = (
  press: TrackedPress,
  { drag, id }: RowDragProps,
): PanConfig => ({
  onTouchesDown: (event) => {
    press.down(event);
    drag.prepare(id);
  },
  onTouchesMove: press.move,
  onFinalize: press.end,
});

const pointAt = (event: { absoluteX: number; absoluteY: number }): Point => ({
  x: event.absoluteX,
  y: event.absoluteY,
});

// Once the Pan activates, it lifts the row, follows it, and drops or puts it back.
const dragHandlers = ({ drag, id, ghost }: RowDragProps): PanConfig => ({
  onActivate: (event) => drag.begin(id, ghost, pointAt(event)),
  onUpdate: (event) => drag.follow(pointAt(event)),
  onDeactivate: (event) => (event.canceled ? drag.cancel() : drag.finish()),
});

/*
 * Gesture Handler's Pan with `manualActivation`: each touch move asks `dragStart` whether the press lifts the row,
 * scrolls, or waits, and `GestureStateManager` activates or fails the Pan to match. Until it activates, the row's
 * own press, its context menu's long press and the List's scroll keep the touch.
 */
function useRowDrag(props: RowDragProps): PanGesture {
  const [press] = useState(() => new TrackedPress());

  return usePanGesture({
    runOnJS: true,
    manualActivation: true,
    ...pressHandlers(press, props),
    ...dragHandlers(props),
  });
}

// iOS and Android: a finger holds a row, then drags it.
export function RowDrag(props: RowDragProps): ReactNode {
  const gesture = useRowDrag(props);
  const { viewRef, children } = props;

  return (
    <GestureDetector gesture={gesture}>
      <View ref={viewRef} collapsable={false}>
        {children}
      </View>
    </GestureDetector>
  );
}
