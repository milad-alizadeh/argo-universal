import type * as React from 'react';
import {
  SessionHeaderMenu,
  type SessionHeaderProps,
  type SessionMenu,
  SessionMenuToolbar,
} from '#features/sessions';
import {
  ScreenHeader,
  type ScreenHeaderProps,
} from '#lib/product/navigation/screen-header';
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

// The web's narrow header: the Session's title, and ⋯ as its trailing item. Native stack headers take only the title.
export function sessionScreenHeader(
  props: SessionDetailViewProps,
): ScreenHeaderProps {
  const menu = headerMenuOf(props);

  return {
    title: sessionPageTitle(props),
    right: menu ? [<SessionHeaderMenu key="menu" menu={menu} />] : [],
  };
}

// A narrow window's header: the Session's title, and ⋯ with its menu; native stack headers take the toolbar's stock item.
export function SessionPageHeader(
  props: SessionDetailViewProps,
): React.JSX.Element {
  const menu = headerMenuOf(props);

  return (
    <>
      <ScreenHeader {...sessionScreenHeader(props)} />
      {menu && <SessionMenuToolbar menu={menu} />}
    </>
  );
}
