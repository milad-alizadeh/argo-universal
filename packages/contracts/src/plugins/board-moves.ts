import { boardMoveProps, type BoardMove } from './board-kit-props';
import { madePageCall, type MadePageCall } from './page-call-payload';
import type { PageCall, WireJson, WireNode } from './wire';

// A card where the board shows it: in the column its `column` names, else in the column it is written in.
interface PlacedCard {
  card: WireNode;
  column: WireNode | undefined;
}

const columnsOf = (board: WireNode): WireNode[] =>
  board.children.filter((child) => child.type === 'Board.Column');

const columnById = (board: WireNode, id: unknown): WireNode | undefined =>
  columnsOf(board).find((column) => column.props.id === id);

function placedCard(board: WireNode, id: string): PlacedCard | undefined {
  for (const written of columnsOf(board))
    for (const card of written.children)
      if (card.type === 'Board.Card' && card.props.id === id)
        return {
          card,
          column: columnById(board, card.props.column ?? written.props.id),
        };

  return undefined;
}

const titleOf = (node: WireNode | undefined, fallback: string): string =>
  typeof node?.props.title === 'string' ? node.props.title : fallback;

const movesTo = (card: WireNode): readonly unknown[] =>
  Array.isArray(card.props.movesTo) ? card.props.movesTo : [];

// The card a move takes, when it may make it: a card the board holds, to another column it names.
function movedCard(board: WireNode, { id, column }: BoardMove): WireNode {
  const placed = placedCard(board, id);

  if (!placed) throw new Error(`The board holds no card ${id}`);

  const { card } = placed;
  const cardTitle = titleOf(card, id);
  const target = titleOf(columnById(board, column), column);

  if (placed.column?.props.id === column)
    throw new Error(`${cardTitle} is already in ${target}`);

  if (!movesTo(card).includes(column) || !columnById(board, column))
    throw new Error(`${cardTitle} can't move to ${target}`);

  return card;
}

/*
 * The call a Board's move makes (ADR-0050): its payload fills the Plugin's call, as any event's does, once the board
 * has checked that the card may go to that column. An Operation shows the card in its new column, pending, at once,
 * through optimistic props, so a failure puts it back.
 */
export function boardEventCall(
  board: WireNode,
  call: PageCall,
  payload: WireJson | undefined,
): MadePageCall {
  const move = boardMoveProps.parse(payload);
  const card = movedCard(board, move);
  const made = madePageCall(call, payload);

  if (!('operation' in made)) return made;

  const shown = {
    key: card.key,
    props: { column: move.column, pending: true },
  };

  return { ...made, optimistic: [shown, ...(made.optimistic ?? [])] };
}

/*
 * The call a Component event makes on `node`. A Board's move is checked against the board and shows at once; every
 * other event's payload only fills its call.
 */
export function nodeEventCall(
  node: WireNode,
  event: string,
  call: PageCall,
  payload: WireJson | undefined,
): MadePageCall {
  return node.type === 'Board' && event === 'onMove'
    ? boardEventCall(node, call, payload)
    : madePageCall(call, payload);
}
