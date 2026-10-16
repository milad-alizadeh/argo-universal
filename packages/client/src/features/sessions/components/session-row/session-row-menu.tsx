import type { ReactElement } from 'react';
import { sessionHref } from '#lib/product/navigation/navigation';
import {
  ContextMenu,
  type ContextMenuItem,
  type ContextMenuTriggerProps,
  contextMenuGroup,
} from '#primitives/overlays/menu';
import type { SessionRowProps } from './session-row-props';

type SessionRowMenuProps = SessionRowProps & {
  children: ReactElement<ContextMenuTriggerProps>;
};

// A right-click opens Rename and Archive at the pointer, and a double-click renames; an archived Session has neither. A phone's long press opens them under the Session's title; iOS previews the Session above them.
export function SessionRowMenu(props: SessionRowMenuProps): ReactElement {
  const groups = sessionMenuGroups(props);

  if (groups.length === 0) return props.children;

  return (
    <ContextMenu
      groups={groups}
      title={props.session.title}
      preview={sessionHref(props.session.sessionId)}
      onDoubleClick={renameSession(props)}
    >
      {props.children}
    </ContextMenu>
  );
}

const renameSession = (props: SessionRowProps): (() => void) | undefined =>
  props.onRename && ((): void => props.onRename?.(props.session.sessionId));

const archiveSession = (props: SessionRowProps): (() => void) | undefined =>
  props.onArchive && ((): void => props.onArchive?.(props.session.sessionId));

// Rename, then Archive, each only when the list offers it; a phone's system menu parts the two.
export function sessionMenuGroups(props: SessionRowProps): ContextMenuItem[][] {
  if (props.session.archivedAt !== null) return [];

  return [
    contextMenuGroup('Rename', 'rename', renameSession(props)),
    contextMenuGroup('Archive', 'archive', archiveSession(props)),
  ].filter((group) => group.length > 0);
}
