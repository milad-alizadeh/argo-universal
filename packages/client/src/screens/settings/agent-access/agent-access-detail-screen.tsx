import type * as React from 'react';
import { useNavigate } from '#lib/product/navigation/navigation';
import { AgentAccessDetailView } from './agent-access-detail-view';
import { useAgentAccess } from './use-agent-access';

export function AgentAccessDetailScreen(): React.JSX.Element {
  const navigate = useNavigate();

  return (
    <AgentAccessDetailView
      {...useAgentAccess()}
      onBack={() => navigate('/settings')}
    />
  );
}
