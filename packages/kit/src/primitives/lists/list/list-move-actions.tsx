import { useMemo, type ReactElement, type ReactNode } from 'react';
import { Action } from '#primitives/actions/action';
import type { ActionShortcut } from '#primitives/content/kbd';
import { useListMoves, type ListMoves } from './list-move-context';
import { rowMoves } from './list-move-model';
import { useMoveOrder } from './list-move-order';

// Alt with an arrow moves the focused row a place, as a desktop list reorders from the keyboard.
const stepShortcuts = new Map<string, ActionShortcut>([
  ['Move up', { modifiers: ['alt'], key: 'ArrowUp' }],
  ['Move down', { modifiers: ['alt'], key: 'ArrowDown' }],
]);

// The move an entry makes in the order as it is when pressed, so "to the end" counts the rows there now.
function pressed({ order, move }: ListMoves, id: string, label: string): void {
  const now = rowMoves(order.sections, id).find(
    (entry) => entry.label === label,
  );

  if (now) move(now.move);
}

const moveActions = (
  moves: ListMoves,
  id: string,
  labels: string[],
): ReactElement[] =>
  labels.map((label) => (
    <Action
      key={label}
      label={label}
      shortcut={stepShortcuts.get(label)}
      onPress={() => pressed(moves, id, label)}
    />
  ));

// The Move Section a row's menu ends with, when it can move at all; an element, so the menu reads it as one of its Sections.
function moveSection(moves: ListMoves, id: string): ReactElement | null {
  const labels = rowMoves(moves.order.sections, id).map(({ label }) => label);

  if (labels.length === 0) return null;

  return (
    <Action.Section key="list-move" title="Move">
      {moveActions(moves, id, labels)}
    </Action.Section>
  );
}

const rowSection = (
  moves: ListMoves | null,
  id: string | undefined,
): ReactElement | null =>
  moves && id !== undefined ? moveSection(moves, id) : null;

/*
 * A row's Move Section, which its menu lists after the row's own Actions: up and down a place, and to the end of each
 * other Section. Every move a drag makes can be made here too, by keyboard, screen reader or switch control. Argo
 * declares it, not the row's owner, so its Alt+↑/↓ belong to the focused row in a Plugin's List too. It is drawn again
 * only when what it lists changes, so a move does not declare every row's Actions again.
 */
export function useMoveActions(id: string | undefined): ReactNode {
  const moves = useListMoves();
  const menu = useMoveOrder(moves?.order, (order) => order.menuOf(id));

  return useMemo(
    () => (menu === undefined ? null : rowSection(moves, id)),
    [menu, moves, id],
  );
}
