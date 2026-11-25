import { ListPlaceContext } from '@repo/kit/list-place';
import { NativeSidebarHeader } from '@repo/kit/native-sidebar';
import { SizeClass } from '@repo/kit/size-class/size-class';
import { use } from 'react';
import type * as React from 'react';
import { SidebarRowsProvider } from '../session-row/session-row-sidebar';
import { SessionsListContent } from './sessions-list-content';
import type { SessionsListProps } from './sessions-list-props';

export type { SessionsListProps } from './sessions-list-props';

export function SessionsList(props: SessionsListProps): React.JSX.Element {
  if (use(NativeSidebarHeader)) {
    return (
      <ListPlaceContext value="sidebar">
        <SidebarRowsProvider value>
          <SessionsListContent {...props} treeDrawn />
        </SidebarRowsProvider>
      </ListPlaceContext>
    );
  }

  return (
    <SizeClass
      compact={<SessionsListContent {...props} treeDrawn={false} />}
      wide={<SessionsListContent {...props} treeDrawn />}
    />
  );
}
