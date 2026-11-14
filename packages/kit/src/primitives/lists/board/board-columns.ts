import { isValidElement, type ReactElement, type ReactNode } from 'react';
import { flattenedChildren } from '../../../flattened-children';
import type { BoardCardProps, BoardColumnProps } from './board-props';

// A column the Board reads: its id, title, count and cards.
export function BoardColumnPart(_props: BoardColumnProps): null {
  return null;
}

// A card the Board reads: its title, subtitle, meta and the columns it may move to.
export function BoardCardPart(_props: BoardCardProps): null {
  return null;
}

export interface BoardCard extends BoardCardProps {
  key: string;
}

export interface BoardColumn {
  key: string;
  id: string;
  title: string;
  count?: number;
  cards: BoardCard[];
}

const isColumn = (child: ReactNode): child is ReactElement<BoardColumnProps> =>
  isValidElement(child) && child.type === BoardColumnPart;

const isCard = (child: ReactNode): child is ReactElement<BoardCardProps> =>
  isValidElement(child) && child.type === BoardCardPart;

const cardOf = (child: ReactElement<BoardCardProps>): BoardCard => ({
  ...child.props,
  key: String(child.key ?? child.props.id),
});

// A column as it is written: the column, still empty, and the cards written in it.
interface WrittenColumn {
  column: BoardColumn;
  cards: BoardCard[];
}

const written = (child: ReactElement<BoardColumnProps>): WrittenColumn => {
  const { id, title, count, children } = child.props;

  return {
    column: { key: String(child.key ?? id), id, title, count, cards: [] },
    cards: flattenedChildren(children).filter(isCard).map(cardOf),
  };
};

// Each written card goes to the column it shows in.
function placeCards(read: readonly WrittenColumn[]): void {
  const byId = new Map(read.map(({ column }) => [column.id, column]));

  const shownIn = (card: BoardCard, column: BoardColumn): BoardColumn =>
    byId.get(card.column ?? column.id) ?? column;

  for (const { column, cards } of read)
    for (const card of cards) shownIn(card, column).cards.push(card);
}

/*
 * The Board's columns, each with the cards it shows: a card shows in the column its `column` names, as a move shows
 * it while its Operation runs, else in the column it is written in. A card naming no column the board has stays where
 * it is written.
 */
export function boardColumns(children: ReactNode): BoardColumn[] {
  const read = flattenedChildren(children).filter(isColumn).map(written);

  placeCards(read);

  return read.map(({ column }) => column);
}

// Each card, by id, and the columns it may move to.
export const boardTargets = (
  columns: readonly BoardColumn[],
): ReadonlyMap<string, readonly string[]> =>
  new Map(
    columns.flatMap(({ cards }) =>
      cards.map((card): [string, readonly string[]] => [
        card.id,
        card.movesTo ?? [],
      ]),
    ),
  );
