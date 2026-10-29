import { useMemo, type ReactElement, type ReactNode } from 'react';
import { Action } from '#primitives/actions/action';
import type { ActionShortcut } from '#primitives/content/kbd';
import { useListMoveOrder } from './list-move-context';
import {
  moveEntries,
  moveMenuTitle,
  type MoveEntry,
} from './list-move-entries';
import { rowIdOf, type RowId } from './list-move-model';
import { useMoveOrder, type MoveOrder } from './list-move-order';

// Alt with an arrow moves the focused row a place, as a desktop list reorders from the keyboard.
const stepShortcuts = new Map<string, ActionShortcut>([
  ['up', { modifiers: ['alt'], key: 'ArrowUp' }],
  ['down', { modifiers: ['alt'], key: 'ArrowDown' }],
]);

const moveAction = ({ key, label, choose }: MoveEntry): ReactElement => (
  <Action
    key={key}
    label={label}
    shortcut={stepShortcuts.get(key)}
    onPress={choose}
  />
);

// The Move Section a row's menu ends with; an element, so the menu reads it as one of its Sections.
const moveSection = (order: MoveOrder, id: RowId): ReactElement => (
  <Action.Section key="list-move" title={moveMenuTitle}>
    {moveEntries(order, id).map(moveAction)}
  </Action.Section>
);

const rowSection = (
  order: MoveOrder | undefined,
  id: RowId | undefined,
): ReactElement | null =>
  order && id !== undefined ? moveSection(order, id) : null;

/*
 * A row's Move Section, which its menu lists after the row's own Actions: up and down a place, and Move to…, which
 * opens a picker of every Section and place in it. Every move a drag makes can be made here too, by keyboard, screen
 * reader or switch control. Argo declares it, not the row's owner, so its Alt+↑/↓ belong to the focused row in a
 * Plugin's List too. It is drawn again only when the steps it offers change, so a move does not declare every row's
 * Actions again.
 */
export function useMoveActions(ownId: string | undefined): ReactNode {
  const id = rowIdOf(ownId);
  const order = useListMoveOrder();
  const menu = useMoveOrder(order, (each) => each.menuOf(id));

  return useMemo(
    () => (menu === undefined ? null : rowSection(order, id)),
    [menu, order, id],
  );
}
