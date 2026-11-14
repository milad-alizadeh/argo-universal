import {
  placeOf,
  type HeldPlace,
  type MoveSection,
  type RowId,
  type SectionId,
  type SectionKey,
} from './list-move-model';

// A board's cards and the columns each may move to; a card it does not name moves nowhere.
export type MoveTargets = ReadonlyMap<RowId, ReadonlySet<SectionId>>;

// Which steps a row's Move menu offers: up, down, both or neither. Its Move to… entry is always there.
export type MenuSteps = 'up' | 'down' | 'both' | 'none';

// What a row's Move menu offers: its steps, or on a board the Section it is in, whose moves it lists.
export type MenuKey = MenuSteps | `in ${string}`;

// A board's order as it shows now, and where each card may go.
export interface BoardOrder {
  sections: readonly MoveSection[];
  targets: MoveTargets;
}

// A row lands where it is dragged: one place, by the Section it lands in.
export interface Landing {
  id: RowId;
  sectionKey: SectionKey;
}

const withUp = (down: boolean): MenuSteps => (down ? 'both' : 'up');

const withoutUp = (down: boolean): MenuSteps => (down ? 'down' : 'none');

const stepsOf = (index: number, length: number): MenuSteps =>
  (index > 0 ? withUp : withoutUp)(index < length - 1);

// A List's row offers its steps; a board's card, the moves of the column it is in.
export const menuKeyOf = (place: HeldPlace, board: boolean): MenuKey =>
  board
    ? `in ${place.sectionKey}`
    : stepsOf(place.index, place.own.rows.length);

const isOwn = (
  { sections }: BoardOrder,
  { id, sectionKey }: Landing,
): boolean => placeOf(sections, id)?.sectionKey === sectionKey;

const sectionIdAt = (
  { sections }: BoardOrder,
  key: SectionKey,
): SectionId | undefined => sections.find((each) => each.key === key)?.id;

const names = (board: BoardOrder, { id, sectionKey }: Landing): boolean => {
  const target = sectionIdAt(board, sectionKey);

  return target !== undefined && board.targets.get(id)?.has(target) === true;
};

// A card lands only in another column, one it names.
export const boardAllows = (board: BoardOrder, landing: Landing): boolean =>
  names(board, landing) && !isOwn(board, landing);

// While a card is dragged, a column refuses it unless it is the card's own or one it names.
export const boardRefuses = (board: BoardOrder, landing: Landing): boolean =>
  !names(board, landing) && !isOwn(board, landing);
