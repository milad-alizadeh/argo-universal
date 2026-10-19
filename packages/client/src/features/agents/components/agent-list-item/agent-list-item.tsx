import type * as React from 'react';
import { ListItem } from '#primitives/lists/list-item';
import type { ListItemProps } from '#primitives/lists/list-item';
import type { AgentRowEntry } from '../../utils/agent-rows';
import { RegistryIcon } from '../registry-icon/registry-icon';
import {
  AgentButton,
  type AgentActions,
  type AgentCardProps,
} from './agent-button';
import { AgentMeta } from './agent-links';

export function AgentListItem(props: AgentCardProps): React.JSX.Element {
  return (
    <ListItem
      {...cardContent(props.agent)}
      trailing={<AgentButton {...props} />}
    />
  );
}

const cardContent = (agent: AgentRowEntry): ListItemProps => ({
  title: agent.name,
  accessibilityLabel: `${agent.name}, v${agent.version}, ${agent.description}`,
  subtitle: agent.description,
  leading: cardLogo(agent),
  meta: <AgentMeta agent={agent} />,
});

const cardLogo = (agent: AgentRowEntry): React.JSX.Element => (
  <RegistryIcon uri={agent.icon} agentName={agent.name} role="identity" />
);

export const agentRows = (
  agents: readonly AgentRowEntry[],
  actions: AgentActions,
): React.JSX.Element[] =>
  agents.map((agent) => (
    <AgentListItem key={agent.id} agent={agent} {...actions} />
  ));
