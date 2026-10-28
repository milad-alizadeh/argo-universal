import {
  useEffect,
  useRef,
  type ReactElement,
  type ReactNode,
  type RefObject,
} from 'react';
import { View, type ViewInstance } from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { motionDuration } from '../../../motion';
import type { ListDrag } from './list-drag-controller';
import { useDragValue } from './list-drag-layer';
import type { MeasureZone } from './list-drag-measure';
import { measureView } from './list-geometry';
import { useListMoves, type ListMoves } from './list-move-context';
import { useMoveOrder } from './list-move-order';

// A header's Section starts at its top, and its first row goes under it.
async function measureHeader(
  view: RefObject<ViewInstance | null>,
): ReturnType<MeasureZone> {
  const rect = await measureView(view);

  return rect && { rect, start: rect.y + rect.height };
}

function useHeaderZone(
  drag: ListDrag,
  sectionKey: string,
): RefObject<ViewInstance | null> {
  const view = useRef<ViewInstance>(null);

  useEffect(
    () => drag.registerZone(sectionKey, () => measureHeader(view)),
    [drag, sectionKey],
  );

  return view;
}

interface ZoneProps {
  moves: ListMoves;
  sectionKey: string;
  children: ReactNode;
}

// A Section's header in one column: a row dragged over it lands first in its Section.
function HeaderZone({ moves, sectionKey, children }: ZoneProps): ReactElement {
  const view = useHeaderZone(moves.drag, sectionKey);

  const offset = useDragValue(moves.drag, (frame) =>
    slideOf(frame?.zoneSlides, sectionKey),
  );

  return (
    <View ref={view} collapsable={false}>
      <Sliding offset={offset}>{children}</Sliding>
    </View>
  );
}

// A board's lanes are their Sections' zones, so only one column's headers are; only a Section whose rows move has one.
function useZoned(sectionKey: string): ListMoves | null {
  const moves = useListMoves();

  const zoned = useMoveOrder(
    moves?.order,
    (order) => order.holds(sectionKey) && !moves?.lanes,
  );

  return zoned ? moves : null;
}

interface SectionZoneProps {
  sectionKey: string;
  children: ReactNode;
}

// The header of a Section whose rows move; a board's lane is its zone instead, and any other header draws as it is.
export function SectionMoveZone({
  sectionKey,
  children,
}: SectionZoneProps): ReactNode {
  const moves = useZoned(sectionKey);

  if (!moves) return children;

  return (
    <HeaderZone moves={moves} sectionKey={sectionKey}>
      {children}
    </HeaderZone>
  );
}

const slideTiming = {
  duration: motionDuration.exit,
  reduceMotion: ReduceMotion.System,
};

// How far a row or Section header moves aside, by its key, while a row is dragged; none where rows do not slide apart.
export const slideOf = <Key,>(
  slides: ReadonlyMap<Key, number> | undefined,
  key: Key,
): number => slides?.get(key) ?? 0;

interface SlidingProps {
  offset: number;
  className?: string;
  children: ReactNode;
}

// Moves aside while another row is dragged past it, where rows slide apart.
function useSlide(offset: number): ReturnType<typeof useAnimatedStyle> {
  const slid = useSharedValue(offset);

  // The style stays one worklet; only a new offset starts a slide.
  useEffect(() => slid.set(withTiming(offset, slideTiming)), [slid, offset]);

  return useAnimatedStyle(() => ({
    transform: [{ translateY: slid.get() }],
  }));
}

export function Sliding({
  offset,
  className,
  children,
}: SlidingProps): ReactNode {
  const style = useSlide(offset);

  return (
    <Animated.View className={className} style={style}>
      {children}
    </Animated.View>
  );
}
