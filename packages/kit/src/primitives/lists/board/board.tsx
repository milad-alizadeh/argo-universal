import type { ListMove } from '@repo/contracts/kit-moves';
import { useMemo, type ReactElement } from 'react';
import { Spinner } from '#primitives/status/spinner';
import { List } from '../list';
import { ListItem } from '../list-item';
import {
  BoardCardPart,
  BoardColumnPart,
  boardColumns,
  boardTargets,
  type BoardCard,
  type BoardColumn,
} from './board-columns';
import type { BoardProps } from './board-props';

// A card drawn as a kit row; a pending move shows a spinner at its end.
const cardRow = ({
  key,
  movesTo: _movesTo,
  column: _column,
  pending,
  ...card
}: BoardCard): ReactElement => (
  <ListItem
    key={key}
    {...card}
    trailing={pending ? <Spinner accessibilityLabel="Moving" /> : undefined}
  />
);

const columnLane = (column: BoardColumn): ReactElement => (
  <List.Section
    key={column.key}
    id={column.id}
    title={column.title}
    count={column.count ?? column.cards.length}
  >
    {column.cards.map(cardRow)}
  </List.Section>
);

// A List's move, as the Board reports it: the card and the column it lands in.
const boardMove =
  (onMove: NonNullable<BoardProps['onMove']>) =>
  ({ id, section }: ListMove): void => {
    if (section !== undefined) onMove({ id, column: section });
  };

/*
 * Lists / Board: columns of cards, side by side, scrolling sideways when they do not fit, at every width. A card moves
 * by drag or from its menu, only to the columns its `movesTo` names; the others fade while it is dragged. The Board
 * reports the card and its new column, and draws it there once its owner does, as a Plugin's move shows it at once
 * through its card's `column`.
 */
export function Board({
  accessibilityLabel,
  onMove,
  children,
}: BoardProps): ReactElement {
  const columns = useMemo(() => boardColumns(children), [children]);
  const targets = useMemo(() => boardTargets(columns), [columns]);

  return (
    <List
      layout="lanes"
      appearance="cards"
      accessibilityLabel={accessibilityLabel}
      moveTargets={targets}
      onMove={onMove && boardMove(onMove)}
    >
      {columns.map(columnLane)}
    </List>
  );
}

Board.Column = BoardColumnPart;

Board.Card = BoardCardPart;
