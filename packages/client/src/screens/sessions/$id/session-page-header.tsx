import { Action } from '@repo/kit/primitives/actions/action';
import { ScreenStackHeader } from '@repo/kit/primitives/scaffolds/screen';
import type * as React from 'react';
import {
  type SessionHeaderProps,
  type SessionMenu,
  sessionActions,
} from '#features/sessions';
import {
  type SessionDetailViewProps,
  sessionPageTitle,
} from './session-detail-view';

function headerMenuOf(props: SessionDetailViewProps): SessionMenu | undefined {
  if (props.state !== 'open' || !props.header.menu) return undefined;

  return { ...props.header.menu, changes: menuChanges(props.header.changes) };
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

// The Session's ⋯: one header Action whose menu holds changed files, Rename and Archive, declared as a Plugin page declares its Screen's Actions.
function moreAction(
  menu: SessionMenu | undefined,
): React.JSX.Element | undefined {
  const actions = menu
    ? sessionActions(menu, { changesIcon: 'changed-files' })
    : [];

  if (!actions.length) return undefined;

  return (
    <Action label="More" icon="more">
      {actions}
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
      actions={moreAction(headerMenuOf(props))}
    />
  );
}
