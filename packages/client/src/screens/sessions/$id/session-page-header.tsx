import type * as React from 'react';
import {
  SessionHeaderMenu,
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

const headerMenuOf = (
  props: SessionDetailViewProps,
): SessionMenu | undefined =>
  props.state === 'open' ? props.header.menu : undefined;

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
