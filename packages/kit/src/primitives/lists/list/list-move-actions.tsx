import type { ReactNode } from 'react';
import { Action } from '#primitives/actions/action';
import { rowMoves } from './list-move-model';
import { useListMoves } from './list-moves';

// Alt with an arrow moves the focused row a place, as a desktop list reorders from the keyboard.
const stepShortcuts: Partial<
  Record<string, { modifiers: 'alt'[]; key: string }>
> = {
  'Move up': { modifiers: ['alt'], key: 'ArrowUp' },
  'Move down': { modifiers: ['alt'], key: 'ArrowDown' },
};

/*
 * A row's own Actions, then a Move Section: up and down a place, and to the end of each other Section. Every move a
 * drag makes can be made here too, by keyboard, screen reader or switch control.
 */
export function useMoveActions(
  id: string | undefined,
  actions: ReactNode,
): ReactNode {
  const moves = useListMoves();
  const entries = moves && id !== undefined ? rowMoves(moves.sections, id) : [];

  if (!moves || entries.length === 0) return actions;

  return (
    <>
      {actions}
      <Action.Section key="list-move" title="Move">
        {entries.map(({ label, move }) => (
          <Action
            key={label}
            label={label}
            shortcut={stepShortcuts[label]}
            onPress={() => moves.move(move)}
          />
        ))}
      </Action.Section>
    </>
  );
}
