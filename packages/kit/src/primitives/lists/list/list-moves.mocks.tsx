import { useState, type ReactElement } from 'react';
import { ListItem } from '../list-item';
import { List } from './list';
import type { ListMove } from './list-move-model';
import {
  boardLanes,
  type BoardCard,
  type BoardLane,
  type MovesProps,
} from './list-moves-fixtures';

// The lanes as they read once a move is made: the card leaves its lane and lands at the index in the named one.
export function movedLanes(
  lanes: readonly BoardLane[],
  { id, section, index }: ListMove,
): BoardLane[] {
  const moved = lanes
    .flatMap((lane) => lane.cards)
    .find((card) => card.id === id);

  if (!moved) return [...lanes];

  return lanes.map((lane) => {
    const cards: BoardCard[] = lane.cards.filter((card) => card.id !== id);

    if (lane.id === section) cards.splice(index, 0, moved);

    return { ...lane, cards };
  });
}

type ExampleProps = MovesProps & {
  lanes?: readonly BoardLane[];
  // Called with each move, after the example applies it.
  onMove?: (move: ListMove) => void;
  // Called when a card is pressed.
  onPress?: () => void;
};

// A List whose owner keeps the order: every move, dragged or chosen from a row's menu, redraws the rows.
export function MovesExample({
  lanes: initial = boardLanes,
  onMove,
  onPress,
  ...props
}: ExampleProps): ReactElement {
  const [lanes, setLanes] = useState(initial);

  return (
    <List
      {...props}
      onMove={(move) => {
        setLanes((current) => movedLanes(current, move));
        onMove?.(move);
      }}
    >
      {lanes.map((lane) => (
        <List.Section key={lane.id} id={lane.id} title={lane.title}>
          {lane.cards.map((card) => (
            <ListItem
              key={card.id}
              id={card.id}
              title={card.title}
              onPress={onPress}
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
