import type * as React from 'react';
import { useAgentCatalog, useInstalledAgents } from '#features/agents';
import { agentHref, useNavigate } from '#lib/product/navigation/navigation';
import { AgentListView } from './agent-list-view';
import { AgentsPhoneHeader } from './agents-phone-header';

export function AgentListScreen(): React.JSX.Element {
  const navigate = useNavigate();

  return (
    <AgentListView
      catalog={useAgentCatalog().load}
      installed={useInstalledAgents()}
      onAddCustomAgent={() => navigate('/settings/agents/new')}
      onOpenAgent={(agent) => navigate(agentHref(agent))}
      renderHeader={(header) => <AgentsPhoneHeader {...header} />}
    />
  );
}
