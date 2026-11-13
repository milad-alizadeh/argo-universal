import type * as React from 'react';
import {
  type InstalledAgents,
  useAgentEnvironmentChange,
  useInstalledAgents,
} from '#features/agents';
import { useNavigate } from '#lib/product/navigation/navigation';
import {
  type AgentDetailViewProps,
  type AgentLoad,
  AgentDetailView,
} from './agent-detail-view';

export interface AgentDetailScreenProps {
  agentId: string;
}

type Found = { load: AgentLoad; name?: string };

// A failed load keeps the loading row: the Agents page says why, and the query retries when the Connection reopens.
function toAgentLoad(installed: InstalledAgents, agentId: string): Found {
  if (installed.status !== 'loaded') return { load: { status: 'loading' } };

  const agent = installed.agents.find(({ id }) => id === agentId);

  return agent
    ? { load: { status: 'loaded', env: agent.env }, name: agent.name }
    : { load: { status: 'missing' } };
}

function useAgentDetail(agentId: string): AgentDetailViewProps {
  const navigate = useNavigate();
  const { load, name } = toAgentLoad(useInstalledAgents(), agentId);
  const change = useAgentEnvironmentChange();

  return {
    title: name ?? agentId,
    agent: load,
    onEnvironmentChange: (env) => change(agentId, env),
    onBack: () => navigate('/settings/agents'),
  };
}

export function AgentDetailScreen({
  agentId,
}: AgentDetailScreenProps): React.JSX.Element {
  const props = useAgentDetail(agentId);

  return <AgentDetailView {...props} />;
}
