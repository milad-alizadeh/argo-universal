import { useState, type ReactElement } from 'react';
import { Pill } from '#primitives/status/pill';
import { Board } from './board';
import type { BoardProps } from './board-props';

// What a move reports: the card and the column it lands in.
type BoardMove = Parameters<NonNullable<BoardProps['onMove']>>[0];

interface Card {
  id: string;
  title: string;
  subtitle: string;
  column: string;
  movesTo: string[];
  label?: string;
  pending?: boolean;
}

export const boardColumns = [
  { id: 'backlog', title: 'Backlog' },
  { id: 'doing', title: 'In progress' },
  { id: 'review', title: 'In review' },
  { id: 'done', title: 'Done' },
];

// Each card names the columns it may move to: the next and the one before, as a workflow allows.
export const boardCards: Card[] = [
  {
    id: 'a',
    title: 'Draft the outline',
    subtitle: 'A-1',
    column: 'backlog',
    movesTo: ['doing'],
    label: 'Writing',
  },
  {
    id: 'b',
    title: 'Pick a palette',
    subtitle: 'A-2',
    column: 'backlog',
    movesTo: ['doing'],
  },
  {
    id: 'c',
    title: 'Sketch the layout',
    subtitle: 'A-3',
    column: 'doing',
    movesTo: ['backlog', 'review'],
    label: 'Design',
  },
  {
    id: 'd',
    title: 'Check the copy',
    subtitle: 'A-4',
    column: 'review',
    movesTo: ['doing', 'done'],
  },
  {
    id: 'e',
    title: 'Order the prints',
    subtitle: 'A-5',
    column: 'done',
    movesTo: ['review'],
  },
];

interface ExampleProps {
  cards?: Card[];
  onMove?: BoardProps['onMove'];
  // A card opens its detail on press, as a tracker's issue does.
  onOpen?: (id: string) => void;
}

type Handlers = Pick<ExampleProps, 'onOpen'>;

const cardOf =
  ({ onOpen }: Handlers) =>
  ({ column: _column, label, ...card }: Card): ReactElement => (
    <Board.Card
      key={card.id}
      {...card}
      onPress={onOpen && (() => onOpen(card.id))}
      meta={label ? <Pill text={label} /> : undefined}
    />
  );

const columnOf =
  (cards: readonly Card[], handlers: Handlers) =>
  (column: (typeof boardColumns)[number]): ReactElement => (
    <Board.Column key={column.id} id={column.id} title={column.title}>
      {cards.flatMap((card) =>
        card.column === column.id ? [cardOf(handlers)(card)] : [],
      )}
    </Board.Column>
  );

const landed = (cards: Card[], { id, column }: BoardMove): Card[] =>
  cards.map((card) => (card.id === id ? { ...card, column } : card));

// The cards, and the move that lands one in the column it names once the owner hears of it.
function useLandedCards(
  initial: Card[],
  onMove: ExampleProps['onMove'],
): [Card[], (move: BoardMove) => void] {
  const [cards, setCards] = useState(initial);

  const moved = (move: BoardMove): void => {
    onMove?.(move);
    setCards((current) => landed(current, move));
  };

  return [cards, moved];
}

// A board that keeps its own cards: a move lands the card in the column it names, as its owner answers.
export function BoardExample({
  cards: initial = boardCards,
  onMove,
  onOpen,
}: ExampleProps): ReactElement {
  const [cards, moved] = useLandedCards(initial, onMove);

  return (
    <Board accessibilityLabel="Tasks" onMove={moved}>
      {boardColumns.map(columnOf(cards, { onOpen }))}
    </Board>
  );
}

// The same columns, with nothing in them yet.
export const EmptyBoard = (): ReactElement => <BoardExample cards={[]} />;

// A card whose move waits on its owner: it shows in its new column with a spinner.
export const PendingBoard = (): ReactElement => (
  <BoardExample
    cards={boardCards.map((card) =>
      card.id === 'b' ? { ...card, column: 'doing', pending: true } : card,
    )}
  />
);
