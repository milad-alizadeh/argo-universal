import type { LegendListRef } from '@legendapp/list/react-native';
import { useMemo, useRef, type ReactElement, type RefObject } from 'react';
import {
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewProps,
  type ViewInstance,
} from 'react-native';
import { OutsideColumn } from '../../../content-column/content-column';
import { useBoardEnd } from './list-board-end';
import { DragScrollView } from './list-drag-scroll-view';
import { ListHeader } from './list-header';
import { useLaneDrag } from './list-lane-drag';
import { LaneRows, type LaneScroll } from './list-lane-rows';
import { sectionKey } from './list-move-model';
import { ListEnd } from './list-scroll-props';
import { lanesOf, type Lane } from './list-section-entries';
import type { ListBlock } from './list-section-model';
import type { ChildDataProps } from './list-section-shelves';

interface LaneProps {
  lane: Lane;
  scroll: LaneScroll;
}

type LaneBodyProps = LaneProps & { laneRef: RefObject<ViewInstance | null> };

function LaneBody({ lane, laneRef, scroll }: LaneBodyProps): ReactElement {
  const bodyRef = useRef<ViewInstance>(null);
  const listRef = useRef<LegendListRef>(null);

  const views = useMemo(
    () => ({ lane: laneRef, body: bodyRef, list: listRef }),
    [laneRef],
  );

  useLaneDrag(sectionKey(lane.key), views);

  return (
    <View ref={bodyRef} collapsable={false} className="min-h-0 grow">
      <LaneRows lane={lane} listRef={listRef} scroll={scroll} />
    </View>
  );
}

// A lane reads as a group named after its Section.
const namedGroup = (title: string | undefined) =>
  ({ role: 'group', accessibilityLabel: title }) as const;

function BoardLane({ lane, scroll }: LaneProps): ReactElement {
  const laneRef = useRef<ViewInstance>(null);

  return (
    <View
      ref={laneRef}
      collapsable={false}
      {...namedGroup(lane.title)}
      className="w-72 shrink-0 pb-4"
    >
      {lane.header}
      <LaneBody lane={lane} laneRef={laneRef} scroll={scroll} />
      {lane.footer}
    </View>
  );
}

const boardLane =
  (scroll: LaneScroll) =>
  (lane: Lane): ReactElement => (
    <BoardLane key={lane.key} lane={lane} scroll={scroll} />
  );

type LanesProps = ChildDataProps & {
  blocks: ListBlock[];
  // The key of the rows outside any Section.
  looseKey: string;
};

type OnScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => void;

const boardLook = {
  className: 'min-h-0 grow',
  contentContainerClassName: 'gap-4 px-4',
} as const;

// Each lane's list fades at its own top and bottom, and keeps the List's keyboard props.
const laneScroll = (list: ChildDataProps): LaneScroll => ({
  edges: list.edges,
  keyboardDismissMode: list.keyboardDismissMode,
  keyboardShouldPersistTaps: list.keyboardShouldPersistTaps,
});

/*
 * The board's own ScrollView keeps the List's test id and keyboard props. It takes no `refreshControl`: React Native's
 * ScrollView pulls to refresh only when it scrolls up and down, and the board scrolls sideways. It draws no edge fade, so
 * `edges` goes to each lane.
 */
const boardScroll = (list: ChildDataProps): ScrollViewProps => ({
  testID: list.testID,
  keyboardDismissMode: list.keyboardDismissMode,
  keyboardShouldPersistTaps: list.keyboardShouldPersistTaps,
});

// The List's own `onScroll` hears the board scroll sideways, after the board checks for its end.
function useBoardScrolled(list: ChildDataProps): OnScroll {
  const ended = useBoardEnd(list);

  return (event) => {
    ended(event);
    list.onScroll?.(event);
  };
}

// The board itself, named as the List is, which calls the List's `onEndReached` as it scrolls to its end.
function Board({ blocks, looseKey, ...list }: LanesProps): ReactElement {
  const lanes = useMemo(() => lanesOf(blocks, looseKey), [blocks, looseKey]);

  return (
    <DragScrollView
      horizontal
      listRef={list.ref}
      aria-label={list.accessibilityLabel}
      onScroll={useBoardScrolled(list)}
      {...boardScroll(list)}
      {...boardLook}
    >
      <OutsideColumn>{lanes.map(boardLane(laneScroll(list)))}</OutsideColumn>
    </DragScrollView>
  );
}

/*
 * Each Section a lane, side by side, on a wide desktop or web window: the board scrolls sideways and each lane up and
 * down on its own LegendList (ADR-0032). Rows outside any Section form one lane of their own, without a header. The
 * List's header and footer stay above and below the board rather than scrolling with any one lane.
 */
export function SectionLanes(props: LanesProps): ReactElement {
  return (
    <View className="min-h-0 grow">
      {props.startContent}
      {props.header == null ? null : <ListHeader list={props} />}
      <Board {...props} />
      <ListEnd {...props} />
    </View>
  );
}
