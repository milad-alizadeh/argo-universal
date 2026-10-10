import type { CustomAgentDefinition } from '@repo/contracts';
import type * as React from 'react';
import { AgentSettingsView } from '../components/agent-settings-view';
import type { SubmitCustomAgent } from '../hooks/use-custom-agent-form';
import {
  useAgentCheck,
  useCustomAgentMutations,
  useCustomAgents,
} from '../hooks/use-custom-agents';

export interface AgentSettingsScreenProps {
  agent: string;
}

function useCustomDefinition(agent: string): CustomAgentDefinition | undefined {
  return useCustomAgents().data?.find(({ id }) => id === agent)?.definition;
}

function useSaveAgent(agent: string): SubmitCustomAgent {
  const { edit } = useCustomAgentMutations();
  return (definition) => edit(agent, definition);
}

export function AgentSettingsScreen({
  agent,
}: AgentSettingsScreenProps): React.JSX.Element {
  const definition = useCustomDefinition(agent);
  const check = useAgentCheck(agent, definition !== undefined);
  return (
    <AgentSettingsView
      agentId={agent}
      definition={definition}
      check={check.isFetching ? undefined : check.data}
      onCheck={() => void check.refetch()}
      onSave={useSaveAgent(agent)}
    />
  );
}
