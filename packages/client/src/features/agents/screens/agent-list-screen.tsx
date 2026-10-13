import type * as React from 'react';
import { useNavigate } from '#lib/product/navigation/context';
import { AgentListView } from '../components/agent-list-view/agent-list-view';
import { useAgentCatalog } from '../hooks/use-agent-catalog';
import { useInstalledAgents } from '../hooks/use-installed-agents';

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
