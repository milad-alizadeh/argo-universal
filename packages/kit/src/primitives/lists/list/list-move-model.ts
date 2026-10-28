import type { KitProps } from '../../kit-props';

// What a move reports: the row, the Section it lands in (none for rows outside any Section) and its index there.
export type ListMove = Parameters<NonNullable<KitProps<'List'>['onMove']>>[0];

// A List's movable rows, Section by Section, in the order it draws them.
export interface MoveSection {
  id?: string;
  title?: string;
  rows: readonly string[];
}

export interface RowPlace {
  // The Section's position in the List.
  section: number;
  index: number;
}

// Where a dragged row would go: before the row at `insertion` in the Section at `section`, counted with the row still in place.
export interface DropPlace {
  section: number;
  insertion: number;
}

export interface RowMove {
  label: string;
  move: ListMove;
}

export function placeOf(
  sections: readonly MoveSection[],
  id: string,
): RowPlace | undefined {
  for (const [section, { rows }] of sections.entries()) {
    const index = rows.indexOf(id);

    if (index !== -1) return { section, index };
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

// A Section a row can be moved to by name: one with an id and a title, other than its own.
const namedTarget = (section: MoveSection, own: MoveSection): boolean =>
  section !== own && section.id !== undefined && section.title !== undefined;

// The Move Actions of a row: up and down within its Section, then to the end of each other Section, as a context menu lists them.
export function rowMoves(
  sections: readonly MoveSection[],
  id: string,
): RowMove[] {
  const place = placeOf(sections, id);
  const own = place && sections[place.section];

  if (!place || !own) return [];

  return [
    ...stepMoves(own, id, place.index),
    ...sections
      .filter((section) => namedTarget(section, own))
      .map((section) => ({
        label: `Move to ${section.title}`,
        move: moveIn(section, id, section.rows.length),
      })),
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

// The move a drop makes, or none when the row lands back on its own slot.
export function landing(
  sections: readonly MoveSection[],
  id: string,
  drop: DropPlace,
): ListMove | undefined {
  const place = placeOf(sections, id);
  const target = sections[drop.section];

  if (!place || !target) return undefined;

  const sameSection = place.section === drop.section;
  // Leaving its slot moves every later row of its own Section up by one.
  const index =
    sameSection && drop.insertion > place.index
      ? drop.insertion - 1
      : drop.insertion;

  if (sameSection && index === place.index) return undefined;

  return moveIn(target, id, Math.min(index, target.rows.length));
}

const sectionOf = (section: MoveSection, move: ListMove): boolean =>
  section.id === move.section;

// The rows as they read once a move is made, so the List shows a drop at once while its owner answers.
export function movedSections(
  sections: readonly MoveSection[],
  move: ListMove,
): MoveSection[] {
  const without = sections.map((section) => ({
    ...section,
    rows: section.rows.filter((row) => row !== move.id),
  }));

  return without.map((section) => {
    if (!sectionOf(section, move)) return section;

    const rows = [...section.rows];

    rows.splice(move.index, 0, move.id);

    return { ...section, rows };
  });
}
