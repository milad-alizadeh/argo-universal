import type * as React from 'react';
import {
  useAgentCatalog,
  useInstalledAgents,
  useAgentManagement,
} from '#features/agents';
import { AgentListView } from './agent-list-view';
import { AgentsPhoneHeader } from './agents-phone-header';

export function AgentListScreen(): React.JSX.Element {
  const catalog = useAgentCatalog();
  const management = useAgentManagement();

  return (
    <AgentListView
      catalog={catalog.load}
      installed={useInstalledAgents()}
      onInstall={management.install}
      onRemove={management.remove}
      onRetry={catalog.retry}
      renderHeader={(header) => <AgentsPhoneHeader {...header} />}
    />
  );
}
