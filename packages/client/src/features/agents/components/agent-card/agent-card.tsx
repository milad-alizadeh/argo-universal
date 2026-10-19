import type * as React from 'react';
import { Text } from '#primitives/content/text';
import { Card } from '#primitives/layout/card';
import { Stack } from '#primitives/layout/stack';
import type { AgentRowEntry } from '../../utils/agent-rows';
import { RegistryIcon } from '../registry-icon/registry-icon';
import {
  AgentButton,
  type AgentActions,
  type AgentCardProps,
} from './agent-button';
import { AgentMeta, hasAgentMeta } from './agent-meta';

// The Paper Agent card: the registry logo, name over version, the action on the title line, then the description and links.
export function AgentCard(props: AgentCardProps): React.JSX.Element {
  const { agent } = props;

  return (
    <Card
      icon={<RegistryIcon uri={agent.icon} agentName={agent.name} role="row" />}
      title={agent.name}
      subtitle={`v${agent.version}`}
      accessibilityLabel={`${agent.name}, v${agent.version}, ${agent.description}`}
      actions={<AgentButton {...props} />}
    >
      <AgentBody agent={agent} />
    </Card>
  );
}

function AgentBody({ agent }: { agent: AgentRowEntry }): React.JSX.Element {
  return (
    <Stack direction="column" gap={1}>
      <Text>{agent.description}</Text>
      {hasAgentMeta(agent) ? (
        <Stack direction="row" gap={2} align="center">
          <AgentMeta agent={agent} />
        </Stack>
      ) : null}
    </Stack>
  );
}

export const agentCards = (
  agents: readonly AgentRowEntry[],
  actions: AgentActions,
): React.JSX.Element[] =>
  agents.map((agent) => (
    <AgentCard key={agent.id} agent={agent} {...actions} />
  ));
