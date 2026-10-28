import type { ReactElement, ReactNode } from 'react';
import { Action } from '#primitives/actions/action';
import type { ActionShortcut } from '#primitives/content/kbd';
import { useListMoves, type ListMoves } from './list-move-context';
import { rowMoves, type RowMove } from './list-move-model';

// Alt with an arrow moves the focused row a place, as a desktop list reorders from the keyboard.
const stepShortcuts = new Map<string, ActionShortcut>([
  ['Move up', { modifiers: ['alt'], key: 'ArrowUp' }],
  ['Move down', { modifiers: ['alt'], key: 'ArrowDown' }],
]);

const moveEntries = (moves: ListMoves | null, id?: string): RowMove[] =>
  moves && id !== undefined ? rowMoves(moves.sections, id) : [];

// The Move Section a row's menu ends with; an element, so the menu reads it as one of its Sections.
const moveSection = (
  entries: readonly RowMove[],
  { move }: ListMoves,
): ReactElement => (
  <Action.Section key="list-move" title="Move">
    {entries.map((entry) => (
      <Action
        key={entry.label}
        label={entry.label}
        shortcut={stepShortcuts.get(entry.label)}
        onPress={() => move(entry.move)}
      />
    ))}
  </Action.Section>
);

/*
 * A row's Move Section, which its menu lists after the row's own Actions: up and down a place, and to the end of each
 * other Section. Every move a drag makes can be made here too, by keyboard, screen reader or switch control. Argo
 * declares it, not the row's owner, so its Alt+↑/↓ belong to the focused row in a Plugin's List too.
 */
export function useMoveActions(id: string | undefined): ReactNode {
  const moves = useListMoves();
  const entries = moveEntries(moves, id);

  return moves && entries.length > 0 ? moveSection(entries, moves) : null;
}
