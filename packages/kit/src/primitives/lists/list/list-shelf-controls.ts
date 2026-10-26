import type { LegendListRef } from '@legendapp/list/react-native';
import { useCallback, useEffect, useState, type Ref } from 'react';
import type { ListProps } from './list-props';
import type { TileGeometry } from './use-tile-layout';

interface Edges {
  atStart: boolean;
  atEnd: boolean;
}

export interface ShelfControls extends Edges {
  ref: (value: LegendListRef | null) => void;
  onScroll: ListProps<never>['onScroll'];
  move: (direction: number) => void;
}

export function useShelfControls<Item>(
  props: ListProps<Item>,
  geometry: TileGeometry,
): ShelfControls {
  const { list, ref } = useShelfRef(props.ref);
  const edges = useShelfEdges(list);

  return {
    ...edges,
    ref,
    onScroll: props.onScroll,
    move: shelfMover(list, geometry.viewport),
  };
}

function useShelfEdges(list: LegendListRef | null): Edges {
  const [edges, setEdges] = useState({ atStart: true, atEnd: true });
  useEffect(() => followEdges(list, setEdges), [list]);

  return edges;
}

const edgeSignals = ['isAtStart', 'isAtEnd', 'totalSize'] as const;

function followEdges(
  list: LegendListRef | null,
  report: (edges: Edges) => void,
): (() => void) | undefined {
  if (!list) return;
  const update = (): void => report(readEdges(list));

  const stops = edgeSignals.map((signal) =>
    list.getState().listen(signal, update),
  );

  update();

  return () => {
    for (const stop of stops) stop();
  };
}

function readEdges(list: LegendListRef): Edges {
  const state = list.getState();

  return { atStart: state.isAtStart, atEnd: state.isAtEnd };
}

export function assignListRef(
  ref: Ref<LegendListRef> | undefined,
  value: LegendListRef | null,
): void {
  if (typeof ref === 'function') ref(value);
  else if (ref) ref.current = value;
}

interface ShelfRef {
  list: LegendListRef | null;
  ref: ShelfControls['ref'];
}

function useShelfRef(forwarded: Ref<LegendListRef> | undefined): ShelfRef {
  const [list, setList] = useState<LegendListRef | null>(null);

  const ref = useCallback(
    (value: LegendListRef | null) => {
      setList(value);
      assignListRef(forwarded, value);
    },
    [forwarded],
  );

  return { list, ref };
}

function shelfMover(
  list: LegendListRef | null,
  viewport: number,
): ShelfControls['move'] {
  return (direction) => {
    if (!list) return;
    void list.scrollToOffset({
      offset: shelfOffset(list, direction, viewport),
      animated: true,
    });
  };
}

function shelfOffset(
  list: LegendListRef,
  direction: number,
  viewport: number,
): number {
  const state = list.getState();

  return Math.max(
    0,
    Math.min(
      state.contentLength - state.scrollLength,
      state.scroll + direction * viewport,
    ),
  );
}
