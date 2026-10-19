import type * as React from 'react';
import { useState } from 'react';
import { fn } from 'storybook/test';
import { ScaffoldMock } from '../../../../mocks/scaffold';
import {
  SessionDetailView,
  type SessionDetailViewProps,
} from './session-detail-view';

// The Session page in the Frame on a wide window; the rail's toggle collapses and expands the sidebar beside the Feed.
export function FramedSessionPreview(
  props: SessionDetailViewProps,
): React.JSX.Element {
  const [sidebarShown, setSidebarShown] = useState(true);
  const sidebar = { sidebarShown, onSidebarShownChange: setSidebarShown };

  return (
    <ScaffoldMock sizeClass="wide" {...sidebar} onSectionChange={fn()}>
      <SessionDetailView {...props} />
    </ScaffoldMock>
  );
}
