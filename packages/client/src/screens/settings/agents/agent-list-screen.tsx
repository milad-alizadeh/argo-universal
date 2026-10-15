import type * as React from 'react';
import { useAgentCatalog, useInstalledAgents } from '#features/agents';
import { useNavigate } from '#lib/product/navigation/context';
import { AgentListView } from './agent-list-view';

export function AgentListScreen(): React.JSX.Element {
  const navigate = useNavigate();

  return (
    <AgentListView
      catalog={useAgentCatalog().load}
      installed={useInstalledAgents()}
      onAddCustomAgent={() => navigate({ to: 'settings-agent-new' })}
      onOpenAgent={(agent) => navigate({ to: 'settings-agent', agent })}
    />
  );
}
