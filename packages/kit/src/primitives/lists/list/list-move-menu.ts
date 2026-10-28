import {
  resolveMove,
  type MoveIntent,
  type MoveSection,
} from './list-move-model';

// One entry of a row's Move menu, keyed by what it does rather than by what it says.
export interface MenuMove {
  key: string;
  label: string;
  intent: MoveIntent;
}

const steps: MenuMove[] = [
  { key: 'up', label: 'Move up', intent: { kind: 'step', by: -1 } },
  { key: 'down', label: 'Move down', intent: { kind: 'step', by: 1 } },
];

// The rows outside any Section have no title; a Section without one is named by its place.
function targetLabel(section: MoveSection, sectionIndex: number): string {
  if (section.id === undefined) return 'Move out of Section';

  const name = section.title ?? `Section ${sectionIndex + 1}`;

  return `Move to ${name}`;
}

const toSection = (section: MoveSection, sectionIndex: number): MenuMove => ({
  key: `to:${section.key}`,
  label: targetLabel(section, sectionIndex),
  intent: { kind: 'end', sectionKey: section.key },
});

/*
 * The Move Actions of a row: up and down within its Section, then to the end of each other Section, as a context menu
 * lists them. Only the entries that would move it, so every move a drag makes can be made from the menu too.
 */
export const menuMoves = (
  sections: readonly MoveSection[],
  id: string,
): MenuMove[] =>
  [...steps, ...sections.map(toSection)].filter(
    (entry) => resolveMove(sections, id, entry.intent) !== undefined,
  );
