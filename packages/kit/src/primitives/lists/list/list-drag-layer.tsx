import { memo, useCallback, useSyncExternalStore, type ReactNode } from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';
import Animated, {
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';
import type { ListDrag } from './list-drag-controller';
import { useDragEscape } from './list-drag-escape';
import type { DragFrame } from './list-drag-frame';
import type { DragLook } from './list-drag-look';
import type { InsertionLine as InsertionLineAt } from './list-drop-aim';

// One value of the drag, drawing again only when it changes, as a row's own offset does while another row aims elsewhere.
export function useDragValue<Value>(
  drag: ListDrag,
  read: (frame: DragFrame | undefined) => Value,
): Value {
  const snapshot = (): Value => read(drag.current());

  return useSyncExternalStore(drag.subscribe, snapshot, snapshot);
}

interface LayerProps {
  drag: ListDrag;
  look: DragLook;
  x: SharedValue<number>;
  y: SharedValue<number>;
}

interface LiftedRowProps extends Pick<LayerProps, 'x' | 'y'> {
  width: number;
  children: ReactNode;
}

function LiftedCopy({ width, x, y, children }: LiftedRowProps): ReactNode {
  const follow = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { translateY: y.value }],
  }));

  return (
    <Animated.View
      className="absolute top-0 left-0 overflow-hidden rounded-2xl bg-card shadow-lg"
      style={[{ width }, follow]}
    >
      {children}
    </Animated.View>
  );
}

// Drawn once per drag: the frame changes as the pointer moves, but the lifted copy and its width do not.
const LiftedRow = memo(LiftedCopy);

function InsertionLine({ line }: { line: InsertionLineAt }): ReactNode {
  return (
    <View
      testID="list-insertion-line"
      className="absolute h-0.5 rounded-full bg-foreground"
      // The line centres on the gap it marks.
      style={{ left: line.x, top: line.y - 1, width: line.width }}
    />
  );
}

// Over the rows, for the eye only: it takes no presses and hides from assistive technology.
const overlay = {
  pointerEvents: 'none',
  'aria-hidden': true,
  importantForAccessibility: 'no-hide-descendants',
  style: StyleSheet.absoluteFill,
} satisfies ViewProps;

interface FrameProps extends Omit<LayerProps, 'drag'> {
  frame: DragFrame;
}

function DraggedFrame({ frame, look, x, y }: FrameProps): ReactNode {
  const line = look.slides ? undefined : frame.line;

  return (
    <View {...overlay}>
      {line && <InsertionLine line={line} />}
      <LiftedRow width={frame.source.width} x={x} y={y}>
        {frame.ghost}
      </LiftedRow>
    </View>
  );
}

/*
 * Over the List's rows while one is dragged: the lifted copy, in card fill with a raised shadow, following the
 * pointer, and the line where it lands. It is drawn for the eye only; the row itself keeps its place in the
 * accessibility tree, and its context menu moves it for assistive technology.
 */
export function ListDragLayer({ drag, ...layer }: LayerProps): ReactNode {
  const frame = useDragValue(drag, (current) => current);
  const cancel = useCallback(() => drag.cancel(), [drag]);

  useDragEscape(cancel, frame !== undefined);

  return frame ? <DraggedFrame frame={frame} {...layer} /> : null;
}
