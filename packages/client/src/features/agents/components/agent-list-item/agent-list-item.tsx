import { RegistryIcon } from '@repo/kit/primitives/content/agent-logo';
import { ListItem } from '@repo/kit/primitives/lists/list-item';
import type { ListItemProps } from '@repo/kit/primitives/lists/list-item';
import type * as React from 'react';
import type { AgentRowEntry } from '../../utils/agent-rows';
import { AgentButton, type AgentActions } from './agent-button';
import { AgentLinks, AgentMeta } from './agent-meta';

export interface AgentListItemProps {
  // The Registry's row for one Agent, which says whether it is installed or unavailable here.
  agent: AgentRowEntry;
  onInstall: (id: string) => void;
  onRemove: (id: string) => void;
}

export function AgentListItem(props: AgentListItemProps): React.JSX.Element {
  return (
    <ListItem
      {...cardContent(props.agent)}
      trailingAccessories={<AgentButton {...props} />}
      metaAccessories={<AgentLinks agent={props.agent} />}
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
  <RegistryIcon uri={agent.icon} agentName={agent.name} size="lg" />
);

export const agentRows = (
  agents: readonly AgentRowEntry[],
  actions: AgentActions,
): React.JSX.Element[] =>
  agents.map((agent) => (
    <AgentListItem key={agent.id} agent={agent} {...actions} />
  ));
