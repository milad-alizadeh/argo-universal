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
import type { Point } from './list-geometry';
import type { RowDragProps } from './list-row-press';
import {
  pressStart,
  RowPress,
  type PressStep,
  type PressTarget,
} from './list-row-press';

const firstTouch = (event: GestureTouchEvent): Point | undefined => {
  const touch = event.allTouches[0] ?? event.changedTouches[0];

  return touch && { x: touch.absoluteX, y: touch.absoluteY };
};

// Activates the Pan when the press lifts the row, and fails it when the press scrolls the List instead.
function settle(step: PressStep, handlerTag: number): void {
  if (step === 'lift') GestureStateManager.activate(handlerTag);
  else if (step === 'scroll') GestureStateManager.fail(handlerTag);
}

// The native adapter for a RowPress: the press a Pan follows, from its first touch until the Pan ends.
class PanPress {
  private press: RowPress | null = null;

  public readonly down = (
    event: GestureTouchEvent,
    target: PressTarget,
  ): void => {
    const start = firstTouch(event);
    const mouse = event.pointerType === PointerType.MOUSE;

    this.press = start ? new RowPress(target, pressStart(start, mouse)) : null;
  };

  public readonly move = (event: GestureTouchEvent): void => {
    const at = firstTouch(event);

    if (at && this.press)
      settle(this.press.move(at, Date.now()), event.handlerTag);
  };

  public readonly drop = (canceled: boolean): void => {
    if (!this.press) return;

    if (canceled) this.press.cancel();
    else this.press.release();
  };

  // A Pan that ends without dropping, failed or cancelled, puts a lifted row back.
  public readonly end = (): void => {
    this.press?.cancel();
    this.press = null;
  };
}

/*
 * Gesture Handler's Pan with `manualActivation`: each touch move asks the RowPress whether the press lifts the row,
 * scrolls, or waits, and `GestureStateManager` activates or fails the Pan to match. Until it activates, the row's
 * own press, its context menu's long press and the List's scroll keep the touch.
 */
function useRowDrag({ drag, id, ghost }: RowDragProps): PanGesture {
  const [press] = useState(() => new PanPress());

  const target: PressTarget = { drag, id, ghost };

  // One object literal: the Worklets Babel plugin cannot read a spread config.
  return usePanGesture({
    runOnJS: true,
    manualActivation: true,
    onTouchesDown: (event) => press.down(event, target),
    onTouchesMove: (event) => press.move(event),
    onDeactivate: (event) => press.drop(event.canceled),
    onFinalize: () => press.end(),
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
