import { useEffect, useRef, type ReactElement, type ReactNode } from 'react';
import type { ViewInstance } from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { motionDuration } from '../../../motion';
import { useLiftedRowMark } from '../../../row-highlights';
import { useDragFrame } from './list-drag-layer';
import { placeOf } from './list-move-model';
import { measureView, useListMoves, type ListMoves } from './list-moves';
import { RowDrag } from './list-row-drag';

const slideTiming = {
  duration: motionDuration.exit,
  reduceMotion: ReduceMotion.System,
};

// Moves aside while another row is dragged past it, where rows slide apart.
export function Sliding({
  offset,
  className,
  children,
}: {
  offset: number;
  className?: string;
  children: ReactNode;
}): ReactNode {
  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: withTiming(offset, slideTiming) }],
  }));

  return (
    <Animated.View className={className} style={style}>
      {children}
    </Animated.View>
  );
}

interface DraggedRowProps {
  moves: ListMoves;
  id: string;
  ghost: ReactNode;
  children: ReactNode;
}

function DraggedRow({
  moves,
  id,
  ghost,
  children,
}: DraggedRowProps): ReactNode {
  const { drag, look } = moves;
  const outer = useRef<ViewInstance>(null);
  const frame = useDragFrame(drag);
  const lifted = frame?.id === id;
  useLiftedRowMark(lifted);

  // The outer view never moves, so the drag measures the row's resting slot.
  useEffect(() => drag.registerRow(id, () => measureView(outer)), [drag, id]);

  return (
    <RowDrag drag={drag} id={id} ghost={ghost} viewRef={outer}>
      <Sliding
        offset={look.slides ? (frame?.rowSlides.get(id) ?? 0) : 0}
        className={lifted ? look.lifted : undefined}
      >
        {children}
      </Sliding>
    </RowDrag>
  );
}
/*
 * A row of a List with `onMove`, when it is one the List can move: a top-level ListItem with an `id`, in a Section
 * with an id or in none. Any other row draws as it is.
 */
export function MovableRow({
  id,
  ghost,
  children,
}: {
  id: string | undefined;
  ghost: ReactNode;
  children: ReactNode;
}): ReactElement {
  const moves = useListMoves();

  if (!moves || id === undefined || !placeOf(moves.sections, id))
    return <>{children}</>;

  return (
    <DraggedRow moves={moves} id={id} ghost={ghost}>
      {children}
    </DraggedRow>
  );
}
