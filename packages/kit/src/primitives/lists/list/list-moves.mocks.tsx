import { applyListMove, type ListMove } from '@repo/contracts/kit-moves';
import { useState, type ReactElement } from 'react';
import { ListItem } from '../list-item';
import { List } from './list';
import {
  board,
  boardLanes,
  type BoardLane,
  type MovesProps,
} from './list-moves-fixtures';

type ExampleProps = MovesProps & {
  lanes?: readonly BoardLane[];
  // Called with each move, after the example applies it.
  onMove?: (move: ListMove) => void;
  // Called when a card is pressed.
  onPress?: () => void;
};

// A plain function, not a component: the List reads its Sections from its own children.
const laneSection =
  (onPress: ExampleProps['onPress']) =>
  (lane: BoardLane): ReactElement => (
    <List.Section key={lane.id} id={lane.id} title={lane.title}>
      {lane.rows.map((card) => (
        <ListItem
          key={card.id}
          id={card.id}
          title={card.title}
          onPress={onPress}
        />
      ))}
    </List.Section>
  );

function useMovedLanes(
  initial: readonly BoardLane[],
  onMove: ExampleProps['onMove'],
): [readonly BoardLane[], (move: ListMove) => void] {
  const [lanes, setLanes] = useState(initial);

  return [
    lanes,
    (move) => {
      setLanes((current) => applyListMove(current, move));
      onMove?.(move);
    },
  ];
}

// A List whose owner keeps the order: every move, dragged or chosen from a row's menu, redraws the rows.
export function MovesExample(example: ExampleProps): ReactElement {
  const { lanes: initial = boardLanes, onMove, onPress, ...props } = example;
  const [lanes, move] = useMovedLanes(initial, onMove);

  return (
    <List {...props} onMove={move}>
      {lanes.map(laneSection(onPress))}
    </List>
  );
}

const refuse = (): Promise<void> => Promise.reject(new Error('Refused'));

const open = (): void => {};

// A board whose owner refuses every move: a moved row goes back to where it was.
export function RefusedMovesExample(): ReactElement {
  return (
    <List {...board} onMove={refuse}>
      {boardLanes.map(laneSection(open))}
    </List>
  );
}
