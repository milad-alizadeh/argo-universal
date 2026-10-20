import type * as React from 'react';
import { HostedScaffoldMock } from '../../../../mocks/scaffold';
import { ScreenHeaderMock } from '../../../../mocks/screen-header-mock';
import {
  SessionDetailView,
  type SessionDetailViewProps,
} from './session-detail-view';
import { sessionScreenHeader } from './session-page-header';

// The Session page in the Frame, with the real Inspector host and the narrow screen header.
export function FramedSessionPreview(
  props: SessionDetailViewProps,
): React.JSX.Element {
  return (
    <HostedScaffoldMock>
      <ScreenHeaderMock {...sessionScreenHeader(props)} />
      <SessionDetailView {...props} />
    </HostedScaffoldMock>
  );
}
