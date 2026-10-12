import type * as React from 'react';
import { ListItem } from '#primitives/list-item';
import { Icon } from '../../../lib/generic/symbols/icon';
import { useWide } from '../../../lib/generic/use-wide';
import {
  type AgentRowEntry,
  agentStatusLabels,
  statusTone,
} from '../state/agent-status';
import { RegistryIcon } from './registry-icon';

type AgentListItemProps = {
  agent: AgentRowEntry;
  onOpen: (agentId: string) => void;
};

// One Agent: its logo, name and one-line description, then its status; details open on its page.
export function AgentListItem({
  agent,
  onOpen,
}: AgentListItemProps): React.JSX.Element {
  return (
    <ListItem
      title={agent.name}
      subtitle={agent.description ? { text: agent.description } : undefined}
      leading={<AgentGlyph agent={agent} />}
      {...statusProps(agent)}
      onPress={() => onOpen(agent.id)}
    />
  );
}

// The status reads as the row's value; Ready and Update available add a dot.
function statusProps({
  status,
}: AgentRowEntry): Pick<
  React.ComponentProps<typeof ListItem>,
  'value' | 'status'
> {
  const label = agentStatusLabels[status];
  const tone = statusTone(status);
  return { value: label, status: tone ? { tone, label } : undefined };
}

// One row per Agent, for a FieldList section.
export const agentRows = (
  agents: readonly AgentRowEntry[],
  onOpen: (agentId: string) => void,
): React.JSX.Element[] =>
  agents.map((agent) => (
    <AgentListItem key={agent.id} agent={agent} onOpen={onOpen} />
  ));

// A custom Agent has no registry logo, so it shows the Agent glyph.
function AgentGlyph({
  agent,
}: Pick<AgentListItemProps, 'agent'>): React.JSX.Element {
  const customSize = useWide() ? 'md' : 'lg';
  if (agent.custom)
    return <Icon name="agent" size={customSize} className="text-foreground" />;
  return <RegistryIcon uri={agent.icon} agentName={agent.name} size="md" />;
}
