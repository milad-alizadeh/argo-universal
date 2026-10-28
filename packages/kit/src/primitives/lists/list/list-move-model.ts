import { applyListMove, type ListMove } from '@repo/contracts/kit-moves';

// What a move reports: the row, the Section it lands in (none for rows outside any Section) and its index there.
export { applyListMove, type ListMove };

/*
 * A List's movable rows, Section by Section, in the order it draws them. `key` is the Section's place in the List as
 * the List reads its children: rows, zones and lanes all name their Section by it. The rows outside any Section are one
 * Section of their own, without an id.
 */
export interface MoveSection {
  key: string;
  id?: string;
  title?: string;
  rows: readonly string[];
}

export interface RowPlace {
  sectionKey: string;
  index: number;
}

// Where a dragged row would go: before the row at `insertion` in the Section `sectionKey`, counted with the row still in place.
export interface DropPlace {
  sectionKey: string;
  insertion: number;
}

export interface RowMove {
  label: string;
  move: ListMove;
}

// Where a row sits: its Section's position and the Section itself, and its index there.
export interface HeldPlace extends RowPlace {
  own: MoveSection;
}

export function placeOf(
  sections: readonly MoveSection[],
  id: string,
): HeldPlace | undefined {
  for (const own of sections) {
    const index = own.rows.indexOf(id);

    if (index !== -1) return { sectionKey: own.key, index, own };
  }

  return undefined;
}

const moveIn = (
  section: MoveSection | undefined,
  id: string,
  index: number,
): ListMove =>
  section?.id === undefined
    ? { id, index }
    : { id, section: section.id, index };

// The rows outside any Section have no title; a Section without one is named by its place.
function targetLabel(section: MoveSection, sectionIndex: number): string {
  if (section.id === undefined) return 'Move out of Section';

  const name = section.title ?? `Section ${sectionIndex + 1}`;

  return `Move to ${name}`;
}

// To the end of every other Section, so every move a drag makes can be made from the menu too.
const sectionMoves = (
  sections: readonly MoveSection[],
  own: MoveSection,
  id: string,
): RowMove[] =>
  sections.flatMap((section, sectionIndex) =>
    section === own
      ? []
      : [
          {
            label: targetLabel(section, sectionIndex),
            move: moveIn(section, id, section.rows.length),
          },
        ],
  );

// The Move Actions of a row: up and down within its Section, then to the end of each other Section, as a context menu lists them.
export function rowMoves(
  sections: readonly MoveSection[],
  id: string,
): RowMove[] {
  const place = placeOf(sections, id);

  if (!place) return [];

  return [
    ...stepMoves(place.own, id, place.index),
    ...sectionMoves(sections, place.own, id),
  ];
}

function stepMoves(own: MoveSection, id: string, index: number): RowMove[] {
  const steps: RowMove[] = [];

  if (index > 0)
    steps.push({ label: 'Move up', move: moveIn(own, id, index - 1) });

  if (index < own.rows.length - 1)
    steps.push({ label: 'Move down', move: moveIn(own, id, index + 1) });

  return steps;
}

// Leaving its slot moves every later row of its own Section up by one.
const shifted = ({ index }: RowPlace, insertion: number): number =>
  insertion > index ? insertion - 1 : insertion;

// Where a dropped row lands in the drop's Section, or none when that is its own slot.
function landedIndex(place: RowPlace, drop: DropPlace): number | undefined {
  if (place.sectionKey !== drop.sectionKey) return drop.insertion;

  const index = shifted(place, drop.insertion);

  return index === place.index ? undefined : index;
}

const landedIn = (
  target: MoveSection,
  id: string,
  index: number | undefined,
): ListMove | undefined =>
  index === undefined
    ? undefined
    : moveIn(target, id, Math.min(index, target.rows.length));

// The move a drop makes, or none when the row lands back on its own slot.
export function landing(
  sections: readonly MoveSection[],
  id: string,
  drop: DropPlace,
): ListMove | undefined {
  const place = placeOf(sections, id);
  const target = sections.find((section) => section.key === drop.sectionKey);

  if (!place || !target) return undefined;

  return landedIn(target, id, landedIndex(place, drop));
}

// The rows as they read once a move is made, by the rule its owner applies too, so the List shows a drop at once.
export const movedSections = (
  sections: readonly MoveSection[],
  move: ListMove,
): MoveSection[] => applyListMove(sections, move);
