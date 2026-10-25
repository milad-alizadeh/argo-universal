import { Action } from '@repo/kit/primitives/actions/action';
import type { ListItemProps } from '@repo/kit/primitives/lists/list-item';
import { sessionHref } from '#lib/product/navigation/navigation';
import { sessionActions, type SessionMenu } from '../session-actions';
import type { SessionRowProps } from './session-row-props';

type SessionRowMenu = Pick<ListItemProps, 'actions' | 'contextMenu'>;

// A right-click opens Rename and Archive at the pointer, and a double-click renames; an archived Session has neither. A phone's long press opens them under the Session's title; iOS previews the Session above them.
export function sessionRowMenu(props: SessionRowProps): SessionRowMenu {
  const actions = sessionActions(sessionMenu(props), { shortcuts: true });

  if (actions.length === 0) return {};

  return {
    // Rename, then Archive, in one Section: no separator between them, as in the header's menu.
    actions: <Action.Section>{actions}</Action.Section>,
    contextMenu: {
      title: props.session.title,
      preview: sessionHref(props.session.sessionId),
      onDoubleClick: renameSession(props),
    },
  };
}

const renameSession = (props: SessionRowProps): (() => void) | undefined =>
  props.onRename && ((): void => props.onRename?.(props.session.sessionId));

const archiveSession = (props: SessionRowProps): (() => void) | undefined =>
  props.onArchive && ((): void => props.onArchive?.(props.session.sessionId));

const sessionMenu = (props: SessionRowProps): SessionMenu => ({
  archived: props.session.archivedAt !== null,
  status: props.session.status,
  onRename: renameSession(props),
  onArchive: archiveSession(props),
});
