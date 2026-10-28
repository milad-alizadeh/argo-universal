import {
  resolveMove,
  type DropPlace,
  type MoveIntent,
  type MoveSection,
  type SectionKey,
} from './list-move-model';

// One step entry of a row's Move menu, keyed by what it does rather than by what it says.
export interface MenuMove {
  key: 'up' | 'down';
  label: string;
  intent: MoveIntent;
}

const steps: MenuMove[] = [
  { key: 'up', label: 'Move up', intent: { kind: 'step', by: -1 } },
  { key: 'down', label: 'Move down', intent: { kind: 'step', by: 1 } },
];

// Up and down a place within the row's Section: only the steps that would move it.
export const stepMoves = (
  sections: readonly MoveSection[],
  id: string,
): MenuMove[] =>
  steps.filter(
    (entry) => resolveMove(sections, id, entry.intent) !== undefined,
  );

// One place the Move to… picker offers: the top of a Section, after one of its rows, or its end.
export interface PickSpot {
  key: string;
  label: string;
  place: DropPlace;
}

// A Section the picker lists, with the places in it the row can move to.
export interface PickSection {
  key: string;
  title: string | undefined;
  spots: PickSpot[];
}

// A row's name in the picker: its title, else its place in its Section.
export type RowTitle = (id: string, index: number) => string;

const spotAt =
  (sectionKey: SectionKey) =>
  (label: string, insertion: number): PickSpot => ({
    key: `${insertion}`,
    label,
    place: { sectionKey, insertion },
  });

// Top, after each row but the last, and the end, which is after the last row.
function spotsIn({ key, rows }: MoveSection, titleOf: RowTitle): PickSpot[] {
  const spot = spotAt(key);

  const afters = rows
    .slice(0, -1)
    .map((row, index) => spot(`After ${titleOf(row, index)}`, index + 1));

  return [
    spot('Top', 0),
    ...afters,
    ...rows.slice(-1).map(() => spot('End', rows.length)),
  ];
}

// The rows outside any Section are named only beside Sections.
const looseTitle = (sections: readonly MoveSection[]): string | undefined =>
  sections.length > 1 ? 'No Section' : undefined;

// A Section without a title is named by its place.
const sectionTitle = (
  section: MoveSection,
  index: number,
  sections: readonly MoveSection[],
): string | undefined =>
  section.id === undefined
    ? looseTitle(sections)
    : (section.title ?? `Section ${index + 1}`);

/*
 * What the Move to… picker lists for row `id`: each Section, then every place in it the row would move to, so a
 * place it already holds is left out. A Section with no such place is left out too.
 */
export function pickSections(
  sections: readonly MoveSection[],
  id: string,
  titleOf: RowTitle,
): PickSection[] {
  const moves = ({ place }: PickSpot): boolean =>
    resolveMove(sections, id, { kind: 'place', place }) !== undefined;

  return sections.flatMap((section, index) => {
    const spots = spotsIn(section, titleOf).filter(moves);
    const title = sectionTitle(section, index, sections);

    return spots.length > 0 ? [{ key: section.key, title, spots }] : [];
  });
}
