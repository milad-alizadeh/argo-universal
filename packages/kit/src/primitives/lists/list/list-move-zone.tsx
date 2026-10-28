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
import { measureView, useListMoves, type ListMoves } from './list-move-context';
import type { MoveSection } from './list-move-model';
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
  index: number,
): RefObject<ViewInstance | null> {
  const view = useRef<ViewInstance>(null);

  useEffect(
    () => drag.registerZone(index, () => measureHeader(view)),
    [drag, index],
  );

  return view;
}

interface ZoneProps {
  moves: ListMoves;
  index: number;
  children: ReactNode;
}

// A Section's header in one column: a row dragged over it lands first in its Section.
function HeaderZone({ moves, index, children }: ZoneProps): ReactElement {
  const view = useHeaderZone(moves.drag, index);
  const frame = useDragFrame(moves.drag);
  const offset = moves.look.slides ? slideOf(frame?.zoneSlides, index) : 0;

  return (
    <View ref={view} collapsable={false}>
      <Sliding offset={offset}>{children}</Sliding>
    </View>
  );
}

const sectionIndex = (
  sections: readonly MoveSection[],
  section: string | undefined,
): number =>
  section === undefined
    ? -1
    : sections.findIndex((candidate) => candidate.id === section);

// A board's lanes are their Sections' zones, so only one column's headers are.
const headerIndex = (
  moves: ListMoves | null,
  section: string | undefined,
): number =>
  moves && !moves.lanes ? sectionIndex(moves.sections, section) : -1;

interface SectionZoneProps {
  section: string | undefined;
  children: ReactNode;
}

// The header of a Section whose rows move; a board's lane is its zone instead, and any other header draws as it is.
export function SectionMoveZone({
  section,
  children,
}: SectionZoneProps): ReactNode {
  const moves = useListMoves();
  const index = headerIndex(moves, section);

  if (!moves || index === -1) return children;

  return (
    <HeaderZone moves={moves} index={index}>
      {children}
    </HeaderZone>
  );
}
