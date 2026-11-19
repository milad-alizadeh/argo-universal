import type * as React from 'react';
import { HostedScaffoldMock } from '../../../../mocks/scaffold';
import {
  SessionDetailView,
  type SessionDetailViewProps,
} from './session-detail-view';
import { SessionPageHeader } from './session-page-header';
import { useInspectorPanels } from './use-inspector-panels';

// The Session page in the Frame, with the real Inspector host and, in a stack, the narrow header.
export function FramedSessionPreview(
  props: SessionDetailViewProps,
): React.JSX.Element {
  const inspectorPanels = useInspectorPanels(
    props.state === 'open' ? props : {},
  );

  const page = props.state === 'open' ? { ...props, inspectorPanels } : props;

  return (
    <HostedScaffoldMock>
      <SessionPageHeader {...page} />
      <SessionDetailView {...page} />
    </HostedScaffoldMock>
  );
}
