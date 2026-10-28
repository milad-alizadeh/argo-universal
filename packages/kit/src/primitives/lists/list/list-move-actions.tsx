import { useMemo, type ReactElement, type ReactNode } from 'react';
import { Action } from '#primitives/actions/action';
import type { ActionShortcut } from '#primitives/content/kbd';
import { useListMoves, type ListMoves } from './list-move-context';
import { stepMoves, type MenuMove } from './list-move-menu';
import { resolveMove, type MoveIntent } from './list-move-model';
import { useMoveOrder } from './list-move-order';

// Alt with an arrow moves the focused row a place, as a desktop list reorders from the keyboard.
const stepShortcuts = new Map<string, ActionShortcut>([
  ['up', { modifiers: ['alt'], key: 'ArrowUp' }],
  ['down', { modifiers: ['alt'], key: 'ArrowDown' }],
]);

// The move an entry makes in the order as it is when pressed.
function pressed({ order }: ListMoves, id: string, intent: MoveIntent): void {
  const now = resolveMove(order.sections, id, intent);

  if (now) order.move(now);
}

const stepActions = (
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

// The Move Section a row's menu ends with; an element, so the menu reads it as one of its Sections.
function moveSection(moves: ListMoves, id: string): ReactElement {
  const entries = stepMoves(moves.order.sections, id);

  return (
    <Action.Section key="list-move" title="Move">
      {stepActions(moves, id, entries)}
      <Action key="to" label="Move to…" onPress={() => moves.order.pick(id)} />
    </Action.Section>
  );
}

const rowSection = (
  moves: ListMoves | null,
  id: string | undefined,
): ReactElement | null =>
  moves && id !== undefined ? moveSection(moves, id) : null;

/*
 * A row's Move Section, which its menu lists after the row's own Actions: up and down a place, and Move to…, which
 * opens a picker of every Section and place in it. Every move a drag makes can be made here too, by keyboard, screen
 * reader or switch control. Argo declares it, not the row's owner, so its Alt+↑/↓ belong to the focused row in a
 * Plugin's List too. It is drawn again only when the steps it offers change, so a move does not declare every row's
 * Actions again.
 */
export function useMoveActions(id: string | undefined): ReactNode {
  const moves = useListMoves();
  const menu = useMoveOrder(moves?.order, (order) => order.menuOf(id));

  return useMemo(
    () => (menu === undefined ? null : rowSection(moves, id)),
    [menu, moves, id],
  );
}
