import { SizeClass } from '@repo/kit/size-class/size-class';
import type * as React from 'react';
import { SessionsListContent } from './sessions-list-content';
import type { SessionsListProps } from './sessions-list-props';

export type { SessionsListProps } from './sessions-list-props';

export function SessionsList(props: SessionsListProps): React.JSX.Element {
  return (
    <SizeClass
      compact={<SessionsListContent {...props} treeDrawn={false} />}
      wide={<SessionsListContent {...props} treeDrawn />}
    />
  );
}
