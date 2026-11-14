import { boardMoveProps, type BoardMove } from './board-kit-props';
import { madePageCall, type MadePageCall } from './page-call-payload';
import type { PageCall, WireJson, WireNode } from './wire';

// A card where the board shows it: in the column its `column` names, else in the column it is written in.
interface PlacedCard {
  card: WireNode;
  columnId: string;
}

const textOf = (value: WireJson | undefined, fallback: string): string =>
  typeof value === 'string' ? value : fallback;

const columnsOf = (board: WireNode): WireNode[] =>
  board.children.filter((child) => child.type === 'Board.Column');

const columnById = (board: WireNode, id: string): WireNode | undefined =>
  columnsOf(board).find((column) => column.props.id === id);

const cardsIn = (written: WireNode): PlacedCard[] =>
  written.children.map((card) => ({
    card,
    columnId: textOf(card.props.column, textOf(written.props.id, '')),
  }));

const placedCard = (board: WireNode, id: string): PlacedCard | undefined =>
  columnsOf(board)
    .flatMap(cardsIn)
    .find(({ card }) => card.props.id === id);

const titleOf = (node: WireNode | undefined, fallback: string): string =>
  textOf(node?.props.title, fallback);

const namesColumn = (card: WireNode, column: string): boolean =>
  Array.isArray(card.props.movesTo) && card.props.movesTo.includes(column);

// A card may land in a column the board has and the card names.
const mayLand = (board: WireNode, card: WireNode, column: string): boolean =>
  columnById(board, column) !== undefined && namesColumn(card, column);

// Why the board refuses a move of a card it holds, or nothing when the card may make it.
function refusal(
  board: WireNode,
  placed: PlacedCard,
  column: string,
): string | undefined {
  const cardTitle = titleOf(placed.card, textOf(placed.card.props.id, ''));
  const named = titleOf(columnById(board, column), column);

  if (placed.columnId === column) return `${cardTitle} is already in ${named}`;

  return mayLand(board, placed.card, column)
    ? undefined
    : `${cardTitle} can't move to ${named}`;
}

// The card a move takes, when it may make it: a card the board holds, to another column it names.
function movedCard(board: WireNode, { id, column }: BoardMove): WireNode {
  const placed = placedCard(board, id);

  if (!placed) throw new Error(`The board holds no card ${id}`);

  const refused = refusal(board, placed, column);

  if (refused) throw new Error(refused);

  return placed.card;
}

// The card shows in its new column, pending, until the Operation answers.
const shownMoved = (
  made: MadePageCall,
  card: WireNode,
  column: string,
): MadePageCall =>
  'operation' in made
    ? {
        ...made,
        optimistic: [
          { key: card.key, props: { column, pending: true } },
          ...(made.optimistic ?? []),
        ],
      }
    : made;

// A Component event on a node: the event's name, the call its node holds for it, and the payload it reports.
export interface NodeEvent {
  name: string;
  call: PageCall;
  payload: WireJson | undefined;
}

/*
 * The call a Board's move makes (ADR-0050): its payload fills the Plugin's call, as any event's does, once the board
 * has checked that the card may go to that column. An Operation shows the card in its new column, pending, at once,
 * through optimistic props, so a failure puts it back.
 */
export function boardEventCall(
  board: WireNode,
  { call, payload }: NodeEvent,
): MadePageCall {
  const move = boardMoveProps.parse(payload);
  const card = movedCard(board, move);

  return shownMoved(madePageCall(call, payload), card, move.column);
}

/*
 * The call a Component event makes on `node`. A Board's move is checked against the board and shows at once; every
 * other event's payload only fills its call.
 */
export const nodeEventCall = (
  node: WireNode,
  event: NodeEvent,
): MadePageCall =>
  node.type === 'Board' && event.name === 'onMove'
    ? boardEventCall(node, event)
    : madePageCall(event.call, event.payload);
