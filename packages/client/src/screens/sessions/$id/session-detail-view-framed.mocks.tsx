import type * as React from 'react';
import { HostedScaffoldMock } from '../../../../mocks/scaffold';
import {
  SessionDetailView,
  type SessionDetailViewProps,
} from './session-detail-view';
import { SessionPageHeader } from './session-page-header';

// The Session page in the Frame, with the real Inspector host and, in a stack, the narrow header.
export function FramedSessionPreview(
  props: SessionDetailViewProps,
): React.JSX.Element {
  return (
    <HostedScaffoldMock>
      <SessionPageHeader {...props} />
      <SessionDetailView {...props} />
    </HostedScaffoldMock>
  );
}
