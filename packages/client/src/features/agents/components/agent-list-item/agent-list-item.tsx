import type * as React from 'react';
import {
  GroupedListItem,
  type GroupedListItemProps,
} from '#primitives/lists/grouped-list-item';
import type { AgentRowEntry } from '../../utils/agent-rows';
import { RegistryIcon } from '../registry-icon/registry-icon';
import {
  AgentButton,
  type AgentActions,
  type AgentCardProps,
} from './agent-button';
import { AgentFooter } from './agent-links';

export function AgentListItem(props: AgentCardProps): React.JSX.Element {
  return (
    <GroupedListItem
      {...cardContent(props.agent)}
      accessory={{
        compact: <AgentButton {...props} wide={false} />,
        wide: <AgentButton {...props} wide />,
      }}
    />
  );
}

const cardContent = (agent: AgentRowEntry): GroupedListItemProps => ({
  label: agent.name,
  labelDetail: `v${agent.version}`,
  variant: 'card',
  subtitle: {
    text: agent.description,
    numberOfLines: 2,
  },
  leading: cardLogo(agent),
  footer: { compact: undefined, wide: <AgentFooter agent={agent} /> },
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
