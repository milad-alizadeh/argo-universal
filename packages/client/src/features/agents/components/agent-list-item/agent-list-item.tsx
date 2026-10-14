import type * as React from 'react';
import { ListItem } from '#lib/generic/primitives/lists/list-item/list-item';
import { Icon } from '../../../../lib/generic/symbols/icon';
import {
  type AgentRowEntry,
  agentStatusLabels,
  statusTone,
} from '../../state/agent-status';
import { RegistryIcon } from '../registry-icon/registry-icon';

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

// The status reads as the row's value with its dot, or a spinner while Checking…; a disabled Agent reads as Disabled with no dot.
function statusProps({
  status,
  disabled,
}: AgentRowEntry): Pick<
  React.ComponentProps<typeof ListItem>,
  'value' | 'status'
> {
  if (disabled) return { value: 'Disabled' };
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

// A custom Agent has no registry logo, so it shows the Agent glyph. A logo fills its whole box where the glyph keeps a margin, so the logo draws one step smaller, at the Body size, to look the same size.
function AgentGlyph({
  agent,
}: Pick<AgentListItemProps, 'agent'>): React.JSX.Element {
  if (agent.custom)
    return <Icon name="agent" role="row" className="text-foreground" />;

  // A registry Agent with no logo falls back to the glyph, so it takes the glyph's size.
  return (
    <RegistryIcon
      uri={agent.icon}
      agentName={agent.name}
      role={agent.icon ? 'body' : 'row'}
    />
  );
}
