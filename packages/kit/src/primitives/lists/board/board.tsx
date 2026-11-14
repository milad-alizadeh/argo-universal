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

// A pending move shows a spinner at the card's end.
const pendingMark = (pending: boolean | undefined): ReactElement | undefined =>
  pending ? <Spinner accessibilityLabel="Moving" /> : undefined;

/*
 * A card that moves but opens nothing is still a focus stop: a menu button, whose context-menu key opens its moves,
 * so the moves a drag makes reach the keyboard too.
 */
type CardMoves = Pick<BoardCard, 'onPress' | 'movesTo'>;

const opensOnlyMenu = ({ onPress, movesTo = [] }: CardMoves): boolean =>
  onPress === undefined && movesTo.length > 0;

const asMenuButton = { role: 'button', 'aria-haspopup': 'menu' } as const;

const menuButton = (card: CardMoves): Partial<typeof asMenuButton> =>
  opensOnlyMenu(card) ? asMenuButton : {};

// A card drawn as a kit row.
const cardRow = ({
  key,
  movesTo,
  column: _column,
  pending,
  ...card
}: BoardCard): ReactElement => (
  <ListItem
    key={key}
    {...card}
    {...menuButton({ onPress: card.onPress, movesTo })}
    trailing={pendingMark(pending)}
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

// A board draws its columns as a List's lanes of cards.
const lanes = { layout: 'lanes', appearance: 'cards' } as const;

/*
 * Lists / Board: columns of cards, side by side, scrolling sideways when they do not fit, at every width. A card moves
 * by drag or from its menu, only to the columns its `movesTo` names; the others fade while it is dragged. The Board
 * reports the card and its new column, and draws it there once its owner does, as a Plugin's move shows it at once
 * through its card's `column`.
 */
export function Board({
  onMove,
  children,
  ...board
}: BoardProps): ReactElement {
  const columns = useMemo(() => boardColumns(children), [children]);
  const targets = useMemo(() => boardTargets(columns), [columns]);
  const moved = onMove && boardMove(onMove);

  return (
    <List {...board} {...lanes} moveTargets={targets} onMove={moved}>
      {columns.map(columnLane)}
    </List>
  );
}

Board.Column = BoardColumnPart;

Board.Card = BoardCardPart;
