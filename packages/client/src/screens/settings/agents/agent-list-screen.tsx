import type * as React from 'react';
import { useRegistryAgents } from '#features/agents';
import { useNavigate } from '#lib/product/navigation/navigation';
import { AgentListView } from './agent-list-view';

export function AgentListScreen(): React.JSX.Element {
  const agents = useRegistryAgents();
  const navigate = useNavigate();

  return (
    <AgentListView
      agents={agents.page}
      onInstall={agents.install}
      onRemove={agents.remove}
      onConfigure={(id) => navigate(`/settings/agents/${id}`)}
      onRetry={agents.retry}
    />
  );
}
