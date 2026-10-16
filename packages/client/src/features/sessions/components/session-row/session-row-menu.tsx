import type { ReactElement } from 'react';
import { ContextMenu, type ContextMenuItem } from '#primitives/overlays/menu';
import type { SessionRowProps } from './session-row-props';

type SessionRowMenuProps = SessionRowProps & { children: ReactElement };

// A right-click opens Rename and Archive at the pointer, and a double-click renames; an archived Session has neither.
export function SessionRowMenu(props: SessionRowMenuProps): ReactElement {
  const groups = sessionMenuGroups(props);

  if (groups.length === 0) return props.children;

  return (
    <ContextMenu groups={groups} onDoubleClick={renameSession(props)}>
      {props.children}
    </ContextMenu>
  );
}

const renameSession = (props: SessionRowProps): (() => void) | undefined =>
  props.onRename && ((): void => props.onRename?.(props.session.sessionId));

const archiveSession = (props: SessionRowProps): (() => void) | undefined =>
  props.onArchive && ((): void => props.onArchive?.(props.session.sessionId));

// Rename, then Archive after a separator, each only when the list offers it.
export function sessionMenuGroups(props: SessionRowProps): ContextMenuItem[][] {
  if (props.session.archivedAt !== null) return [];

  return [
    menuGroup('Rename', 'rename', renameSession(props)),
    menuGroup('Archive', 'archive', archiveSession(props)),
  ].filter((group) => group.length > 0);
}

function menuGroup(
  label: string,
  icon: ContextMenuItem['icon'],
  onPress: (() => void) | undefined,
): ContextMenuItem[] {
  return onPress ? [{ label, icon, onPress }] : [];
}
