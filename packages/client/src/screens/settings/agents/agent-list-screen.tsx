import type * as React from 'react';
import { useRegistryAgents } from '#features/agents';
import { AgentListView } from './agent-list-view';

export function AgentListScreen(): React.JSX.Element {
  const agents = useRegistryAgents();

  return (
    <AgentListView
      agents={agents.page}
      onInstall={agents.install}
      onRemove={agents.remove}
      onRetry={agents.retry}
    />
  );
}
