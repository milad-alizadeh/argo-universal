import { useCallback, useSyncExternalStore, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';
import type { DragFrame, ListDrag } from './list-drag-controller';
import { useDragEscape } from './list-drag-escape';
import type { DragLook } from './list-drag-look';

export const useDragFrame = (drag: ListDrag): DragFrame | undefined =>
  useSyncExternalStore(drag.subscribe, drag.current, drag.current);

interface LayerProps {
  drag: ListDrag;
  look: DragLook;
  x: SharedValue<number>;
  y: SharedValue<number>;
}

/*
 * Over the List's rows while one is dragged: the lifted copy, in card fill with a raised shadow, following the
 * pointer, and the line where it lands. It is drawn for the eye only; the row itself keeps its place in the
 * accessibility tree, and its context menu moves it for assistive technology.
 */
export function ListDragLayer({ drag, look, x, y }: LayerProps): ReactNode {
  const frame = useDragFrame(drag);
  const cancel = useCallback(() => drag.cancel(), [drag]);
  useDragEscape(cancel, frame !== undefined);

  if (!frame) return null;

  return (
    <View
      pointerEvents="none"
      aria-hidden
      importantForAccessibility="no-hide-descendants"
      style={StyleSheet.absoluteFill}
    >
      {look.line && frame.line && <InsertionLine line={frame.line} />}
      <LiftedRow width={frame.source.width} x={x} y={y}>
        {frame.ghost}
      </LiftedRow>
    </View>
  );
}

function InsertionLine({
  line,
}: {
  line: NonNullable<DragFrame['line']>;
}): ReactNode {
  return (
    <View
      testID="list-insertion-line"
      className="absolute h-0.5 rounded-full bg-foreground"
      // The line centres on the gap it marks.
      style={{ left: line.x, top: line.y - 1, width: line.width }}
    />
  );
}

function LiftedRow({
  width,
  x,
  y,
  children,
}: {
  width: number;
  x: SharedValue<number>;
  y: SharedValue<number>;
  children: ReactNode;
}): ReactNode {
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
