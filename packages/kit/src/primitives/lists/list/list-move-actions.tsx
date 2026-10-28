import { useMemo, type ReactElement, type ReactNode } from 'react';
import { Action } from '#primitives/actions/action';
import type { ActionShortcut } from '#primitives/content/kbd';
import { useListMoves, type ListMoves } from './list-move-context';
import { menuMoves, type MenuMove } from './list-move-menu';
import { resolveMove, type MoveIntent } from './list-move-model';
import { useMoveOrder } from './list-move-order';

// Alt with an arrow moves the focused row a place, as a desktop list reorders from the keyboard.
const stepShortcuts = new Map<string, ActionShortcut>([
  ['up', { modifiers: ['alt'], key: 'ArrowUp' }],
  ['down', { modifiers: ['alt'], key: 'ArrowDown' }],
]);

// The move an entry makes in the order as it is when pressed, so "to the end" counts the rows there now.
function pressed({ order }: ListMoves, id: string, intent: MoveIntent): void {
  const now = resolveMove(order.sections, id, intent);

  if (now) order.move(now);
}

const moveActions = (
  moves: ListMoves,
  id: string,
  entries: MenuMove[],
): ReactElement[] =>
  entries.map(({ key, label, intent }) => (
    <Action
      key={key}
      label={label}
      shortcut={stepShortcuts.get(key)}
      onPress={() => pressed(moves, id, intent)}
    />
  ));

// The Move Section a row's menu ends with, when it can move at all; an element, so the menu reads it as one of its Sections.
function moveSection(moves: ListMoves, id: string): ReactElement | null {
  const entries = menuMoves(moves.order.sections, id);

  if (entries.length === 0) return null;

  return (
    <Action.Section key="list-move" title="Move">
      {moveActions(moves, id, entries)}
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
