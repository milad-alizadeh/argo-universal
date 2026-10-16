import type * as React from 'react';
import { useWide } from '#lib/generic/use-wide/use-wide';
import {
  GroupedListItem,
  type GroupedListItemProps,
} from '#primitives/lists/grouped-list-item';
import type { AgentRowEntry } from '../../state/agent-list';
import { RegistryIcon } from '../registry-icon/registry-icon';
import {
  AgentButton,
  type AgentActions,
  type AgentCardProps,
} from './agent-button';
import { AgentFooter } from './agent-links';

export function AgentListItem(props: AgentCardProps): React.JSX.Element {
  const wide = useWide();

  return (
    <GroupedListItem
      {...cardContent(props.agent, wide)}
      accessory={<AgentButton {...props} wide={wide} />}
    />
  );
}

const cardContent = (
  agent: AgentRowEntry,
  wide: boolean,
): GroupedListItemProps => ({
  label: agent.name,
  labelDetail: `v${agent.version}`,
  alignment: 'top',
  subtitle: {
    text: agent.description,
    numberOfLines: 2,
  },
  leading: <RegistryIcon uri={agent.icon} agentName={agent.name} role="row" />,
  footer: wide ? <AgentFooter agent={agent} /> : undefined,
});

export const agentRows = (
  agents: readonly AgentRowEntry[],
  actions: AgentActions,
): React.JSX.Element[] =>
  agents.map((agent) => (
    <AgentListItem key={agent.id} agent={agent} {...actions} />
  ));
