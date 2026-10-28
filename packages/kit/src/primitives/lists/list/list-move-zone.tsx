import { useEffect, useRef, type ReactElement, type ReactNode } from 'react';
import { View, type ViewInstance } from 'react-native';
import type { ListDrag } from './list-drag-controller';
import { useDragFrame } from './list-drag-layer';
import { Sliding } from './list-movable-row';
import { measureView, useListMoves } from './list-moves';

interface ZoneProps {
  drag: ListDrag;
  index: number;
  slides: boolean;
  children: ReactNode;
}

// A Section's header in one column: a row dragged over it lands first in its Section.
function HeaderZone({
  drag,
  index,
  slides,
  children,
}: ZoneProps): ReactElement {
  const view = useRef<ViewInstance>(null);
  const frame = useDragFrame(drag);

  useEffect(
    () =>
      drag.registerZone(index, async () => {
        const rect = await measureView(view);

        return rect && { rect, start: rect.y + rect.height };
      }),
    [drag, index],
  );

  return (
    <View ref={view} collapsable={false}>
      <Sliding offset={slides ? (frame?.zoneSlides.get(index) ?? 0) : 0}>
        {children}
      </Sliding>
    </View>
  );
}

// The header of a Section whose rows move; a board's lane is its zone instead, and any other header draws as it is.
export function SectionMoveZone({
  section,
  children,
}: {
  section: string | undefined;
  children: ReactNode;
}): ReactElement {
  const moves = useListMoves();
  const index =
    moves && !moves.lanes && section !== undefined
      ? moves.sections.findIndex((candidate) => candidate.id === section)
      : -1;

  if (!moves || index === -1) return <>{children}</>;

  return (
    <HeaderZone drag={moves.drag} index={index} slides={moves.look.slides}>
      {children}
    </HeaderZone>
  );
}
