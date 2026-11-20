import type * as React from 'react';
import {
  screenSightOffered,
  useScreenSightEnabled,
} from '#features/screen-sight';
import { useNavigate } from '#lib/product/navigation/navigation';
import { AgentAccessDetailView } from './agent-access-detail-view';
import { useAgentAccess } from './use-agent-access';

export function AgentAccessDetailScreen(): React.JSX.Element {
  const navigate = useNavigate();
  const screenSight = useScreenSightEnabled();

  return (
    <AgentAccessDetailView
      {...useAgentAccess()}
      screenSight={screenSight.enabled}
      onScreenSightChange={
        screenSightOffered() ? screenSight.setEnabled : undefined
      }
      onBack={() => navigate('/settings')}
    />
  );
}
