import type * as React from 'react';
import { Icon } from '#primitives/display/icon';
import { GroupedListItem } from '#primitives/lists/grouped-list-item';
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

// One Agent: its logo, name and up to two lines of description, then its status dot; the status reads on its page.
export function AgentListItem({
  agent,
  onOpen,
}: AgentListItemProps): React.JSX.Element {
  return (
    <GroupedListItem
      label={agent.name}
      subtitle={descriptionLine(agent)}
      leading={<AgentGlyph agent={agent} />}
      {...statusProps(agent)}
      onPress={() => onOpen(agent.id)}
    />
  );
}

// A long description stops after two lines, ending in an ellipsis.
const descriptionLine = ({
  description,
}: AgentRowEntry): React.ComponentProps<typeof GroupedListItem>['subtitle'] =>
  description ? { text: description, numberOfLines: 2 } : undefined;

// Only the dot shows the status; its label names the row for assistive technology, and the Agent's page spells it out.
function statusProps({
  status,
}: AgentRowEntry): Pick<
  React.ComponentProps<typeof GroupedListItem>,
  'status'
> {
  const tone = statusTone(status);

  return {
    status: tone ? { tone, label: agentStatusLabels[status] } : undefined,
  };
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
