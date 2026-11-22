import type { SessionStatus } from '@repo/contracts';
import { Action } from '@repo/kit/primitives/actions/action';
import type { ReactElement } from 'react';

// What a Session's menus offer, from its row's right-click or long press, or its page's header.
export interface SessionMenu {
  // An archived Session offers neither action.
  archived: boolean;
  status: SessionStatus;
  handoff?: { pending: boolean; onPress: () => void };
  onRename?: () => void;
  onArchive?: () => void;
}

interface SessionActionOptions {
  // A row answers Enter with Rename and ⌘⌫ with Archive while it has focus.
  shortcuts?: boolean;
}

const renameShortcut = { modifiers: [], key: 'Enter' } as const;

const archiveShortcut = { modifiers: ['meta'], key: 'Backspace' } as const;

// The Server archives only a Session with no Turn: one running or waiting on an answer refuses it.
const isTurnActive = (status: SessionStatus): boolean =>
  status === 'running' || status === 'needs_input';

const renameAction = (
  { onRename }: SessionMenu,
  { shortcuts }: SessionActionOptions,
): ReactElement | undefined =>
  onRename && (
    <Action
      key="rename"
      label="Rename"
      icon="rename"
      onPress={onRename}
      shortcut={shortcuts ? renameShortcut : undefined}
    />
  );

// While a Turn runs, Archive stays but is disabled.
const archiveAction = (
  { status, onArchive }: SessionMenu,
  { shortcuts }: SessionActionOptions,
): ReactElement | undefined =>
  onArchive && (
    <Action
      key="archive"
      label="Archive"
      icon="archive"
      disabled={isTurnActive(status)}
      onPress={onArchive}
      shortcut={shortcuts ? archiveShortcut : undefined}
    />
  );

function handoffAction({
  handoff,
  status,
}: SessionMenu): ReactElement | undefined {
  return (
    handoff && (
      <Action
        key="handoff"
        label="Handoff"
        icon="arrow-right"
        disabled={handoff.pending || isTurnActive(status)}
        onPress={handoff.onPress}
      />
    )
  );
}

const isAction = (action: ReactElement | undefined): action is ReactElement =>
  action !== undefined;

export function sessionActions(
  menu: SessionMenu,
  options: SessionActionOptions = {},
): ReactElement[] {
  if (menu.archived) return [];

  return [
    handoffAction(menu),
    renameAction(menu, options),
    archiveAction(menu, options),
  ].filter(isAction);
}
