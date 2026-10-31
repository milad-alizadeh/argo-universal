import type * as React from 'react';
import { replaceWithSessions } from '#lib/product/navigation/navigation';
import { NotFoundView } from './not-found-view';

export function NotFoundScreen(): React.JSX.Element {
  return <NotFoundView onLeave={replaceWithSessions} />;
}
