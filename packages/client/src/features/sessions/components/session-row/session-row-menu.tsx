import { Action } from '@repo/kit/primitives/actions/action';
import type { ListItemProps } from '@repo/kit/primitives/lists/list-item';
import type { ReactElement } from 'react';
import { sessionHref } from '#lib/product/navigation/navigation';
import { sessionMenuItems, type SessionMenuItem } from '../session-menu-items';
import type { SessionRowProps } from './session-row-props';

type SessionRowMenu = Pick<ListItemProps, 'actions' | 'contextMenu'>;

// A right-click opens Rename and Archive at the pointer, and a double-click renames; an archived Session has neither. A phone's long press opens them under the Session's title; iOS previews the Session above them.
export function sessionRowMenu(props: SessionRowProps): SessionRowMenu {
  const groups = sessionMenuGroups(props);

  if (groups.length === 0) return {};

  return {
    actions: (
      <Action.Section>{groups.flat().map(sessionAction)}</Action.Section>
    ),
    contextMenu: {
      title: props.session.title,
      preview: sessionHref(props.session.sessionId),
      onDoubleClick: renameSession(props),
    },
  };
}

function sessionAction(item: SessionMenuItem): ReactElement {
  const shortcut =
    item.label === 'Rename'
      ? ({ modifiers: [], key: 'Enter' } as const)
      : ({ modifiers: ['meta'], key: 'Backspace' } as const);

  return <Action key={item.label} {...item} shortcut={shortcut} />;
}

const renameSession = (props: SessionRowProps): (() => void) | undefined =>
  props.onRename && ((): void => props.onRename?.(props.session.sessionId));

const archiveSession = (props: SessionRowProps): (() => void) | undefined =>
  props.onArchive && ((): void => props.onArchive?.(props.session.sessionId));

// Rename, then Archive, in one group: no separator between them, as in the header's menu.
export function sessionMenuGroups(props: SessionRowProps): SessionMenuItem[][] {
  const { session } = props;

  const items = sessionMenuItems({
    archived: session.archivedAt !== null,
    status: session.status,
    onRename: renameSession(props),
    onArchive: archiveSession(props),
  });

  return items.length > 0 ? [items] : [];
}
