import type { AgentInfo, CustomAgentDefinition } from '@repo/contracts';
import { useQuery } from '@tanstack/react-query';
import type * as React from 'react';
import { useTRPC } from '#features/connection';
import { useNavigate } from '#lib/product/navigation/context';
import { AgentDetailView } from '../components/agent-detail-view';
import { AgentPlaceholder } from '../components/agent-placeholder';
import { CustomAgentDetailView } from '../components/custom-agent-detail-view';
import { useAgents } from '../hooks/use-agents';
import type { SubmitCustomAgent } from '../hooks/use-custom-agent-form';
import {
  useAgentCheck,
  useCustomAgentMutations,
  useCustomAgents,
} from '../hooks/use-custom-agents';
import { useSessionDefaults } from '../hooks/use-session-defaults';
import { agentDetail } from '../state/agent-detail';
import type { AgentDetail } from '../state/agent-detail-types';

export interface AgentDetailScreenProps {
  agent: string;
}
type PageProps = AgentDetailScreenProps & { onBack: () => void };

function useCustomDefinition(agent: string): CustomAgentDefinition | undefined {
  return useCustomAgents().data?.find(({ id }) => id === agent)?.definition;
}

function useSaveAgent(agent: string): SubmitCustomAgent {
  const { edit } = useCustomAgentMutations();
  return (definition) => edit(agent, definition);
}

export function AgentDetailScreen({
  agent,
}: AgentDetailScreenProps): React.JSX.Element {
  const navigate = useNavigate();
  const onBack = (): void => navigate({ to: 'settings-agents' });
  const definition = useCustomDefinition(agent);
  if (!definition) return <AgentPage agent={agent} onBack={onBack} />;
  return (
    <CustomAgentPage agent={agent} definition={definition} onBack={onBack} />
  );
}

function CustomAgentPage(
  props: PageProps & { definition: CustomAgentDefinition },
): React.JSX.Element {
  const check = useAgentCheck(props.agent, true);
  return (
    <CustomAgentDetailView
      agentId={props.agent}
      definition={props.definition}
      check={check.isFetching ? undefined : check.data}
      onCheck={() => void check.refetch()}
      onSave={useSaveAgent(props.agent)}
      onBack={props.onBack}
    />
  );
}

function useAgentDetail(agent: string): {
  info: AgentInfo | undefined;
  detail: AgentDetail | undefined;
  retry: () => void;
} {
  const agents = useAgents();
  const catalog = useQuery(useTRPC().agents.catalog.queryOptions());
  const info = agents.data?.find((entry) => entry.agent === agent);
  const registry = catalog.data?.agents.find(({ id }) => id === agent);
  return { info, detail: agentDetail(info, registry), retry: agents.retry };
}

// A built-in or registry Agent: the Server's probe and the saved ACP Registry entry.
function AgentPage({ agent, onBack }: PageProps): React.JSX.Element {
  const { info, detail, retry } = useAgentDetail(agent);
  const { defaults, change } = useSessionDefaults(info);
  if (!detail) return <AgentPlaceholder agent={agent} />;
  return (
    <AgentDetailView
      agent={detail}
      defaults={defaults}
      onDefaultChange={change}
      onBack={onBack}
      onCheckAgain={retry}
    />
  );
}
