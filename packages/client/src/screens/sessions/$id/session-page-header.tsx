import { Action } from '@repo/kit/primitives/actions/action';
import { ScreenStackHeader } from '@repo/kit/primitives/scaffolds/screen';
import type * as React from 'react';
import {
  type SessionHeaderProps,
  type SessionMenu,
  sessionMenuItems,
} from '#features/sessions';
import {
  type SessionDetailViewProps,
  sessionPageTitle,
} from './session-detail-view';

function headerMenuOf(props: SessionDetailViewProps): SessionMenu | undefined {
  if (props.state !== 'open') return undefined;

  return withChanges(props.header);
}

function withChanges(header: SessionHeaderProps): SessionMenu | undefined {
  if (!header.menu) return undefined;

  return { ...header.menu, changes: menuChanges(header.changes) };
}

function menuChanges(
  changes: SessionHeaderProps['changes'],
): SessionMenu['changes'] {
  if (!changes?.summary) return undefined;

  return {
    files: changes.summary.files,
    onPress: () => changes.onOpenChange(true),
  };
}

// The Session's ⋯: one header Action whose menu holds changed files, Rename and Archive. A Screen reads its Actions from the element it is given.
function sessionActions(
  menu: SessionMenu | undefined,
): React.JSX.Element | undefined {
  const items = menu ? sessionMenuItems(menu) : [];

  if (!items.length) return undefined;

  return (
    <Action label="More" icon="more">
      {items.map((item) => (
        <Action
          key={item.label}
          label={item.label}
          icon={item.icon === 'diff' ? 'changed-files' : item.icon}
          disabled={item.disabled}
          onPress={item.onPress}
        />
      ))}
    </Action>
  );
}

// A narrow window's header: the Session's title and its ⋯ menu. The page's body is the Session's own, so only the header is a Screen's.
export function SessionPageHeader(
  props: SessionDetailViewProps,
): React.JSX.Element {
  return (
    <ScreenStackHeader
      title={sessionPageTitle(props)}
      actions={sessionActions(headerMenuOf(props))}
    />
  );
}
