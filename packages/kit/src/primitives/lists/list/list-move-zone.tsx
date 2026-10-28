import {
  useEffect,
  useRef,
  type ReactElement,
  type ReactNode,
  type RefObject,
} from 'react';
import { View, type ViewInstance } from 'react-native';
import type { ListDrag } from './list-drag-controller';
import { useDragFrame } from './list-drag-layer';
import type { MeasureZone } from './list-drag-measure';
import { measureView } from './list-measure-view';
import { useListMoves, type ListMoves } from './list-move-context';
import { slideOf, Sliding } from './list-sliding';

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
  const frame = useDragFrame(moves.drag);
  const slides = frame?.zoneSlides;
  const offset = moves.look.slides ? slideOf(slides, sectionKey) : 0;

  return (
    <View ref={view} collapsable={false}>
      <Sliding offset={offset}>{children}</Sliding>
    </View>
  );
}

// A board's lanes are their Sections' zones, so only one column's headers are; only a Section whose rows move has one.
const zoned = (moves: ListMoves | null, sectionKey: string): boolean =>
  moves !== null &&
  !moves.lanes &&
  moves.sections.some((section) => section.key === sectionKey);

interface SectionZoneProps {
  sectionKey: string;
  children: ReactNode;
}

// The header of a Section whose rows move; a board's lane is its zone instead, and any other header draws as it is.
export function SectionMoveZone({
  sectionKey,
  children,
}: SectionZoneProps): ReactNode {
  const moves = useListMoves();

  if (!moves || !zoned(moves, sectionKey)) return children;

  return (
    <HeaderZone moves={moves} sectionKey={sectionKey}>
      {children}
    </HeaderZone>
  );
}
