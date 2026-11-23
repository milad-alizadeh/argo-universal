import { NotFoundScreen } from '@repo/client';
import type * as React from 'react';

// An unknown path lands here inside the Frame, so the page keeps the Rail, the Sidebar and a way out.
export default function NotFoundRoute(): React.JSX.Element {
  return <NotFoundScreen />;
}
