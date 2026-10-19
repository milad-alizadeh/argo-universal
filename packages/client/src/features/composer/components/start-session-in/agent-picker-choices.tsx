import type { AgentServer } from '@repo/contracts';
import type * as React from 'react';
import { useWindowDimensions } from 'react-native';
import { Icon } from '#primitives/content/icon';
import { List } from '#primitives/lists/list';
import { ListItem } from '#primitives/lists/list-item';
import { AgentIcon } from '../composer-configuration/agent-icon';

export interface AgentChoiceProps {
  agents: AgentServer[];
  agent?: AgentServer;
  onAgentChange: (id: string) => void;
  onAddAgents: () => void;
  close: (after?: () => void) => void;
}

const maximumHeight = 320;

const screenFraction = 0.6;

const choicesTestID = 'new-session-agents-scroll';

export function AgentChoices(props: AgentChoiceProps): React.JSX.Element {
  const { height } = useWindowDimensions();

  return (
    <List
      maxHeight={{ compact: height * screenFraction, wide: maximumHeight }}
      testID={choicesTestID}
    >
      {agentRows(props)}
    </List>
  );
}

function agentRows(props: AgentChoiceProps): React.JSX.Element {
  return (
    <List.Section {...agentSelection(props)}>
      {props.agents.map((agent) => (
        <AgentChoice key={agent.id} agent={agent} choices={props} />
      ))}
      <ListItem {...addAgentsProps(props)} />
    </List.Section>
  );
}

type RowProps = { agent: AgentServer; choices: AgentChoiceProps };

function AgentChoice({ agent }: RowProps): React.JSX.Element {
  return (
    <ListItem
      {...agentChoiceProps(agent)}
      leading={
        <AgentIcon agent={agent} role={{ compact: 'body', wide: 'row' }} />
      }
    />
  );
}

const agentChoiceProps = (
  agent: AgentServer,
): React.ComponentProps<typeof ListItem> => ({
  title: agent.name,
  id: agent.id,
});

const addAgentsProps = (
  props: AgentChoiceProps,
): React.ComponentProps<typeof ListItem> => ({
  title: 'Add Agents',
  leading: (
    <Icon fitArtwork name="add" role={{ compact: 'body', wide: 'row' }} />
  ),
  onPress: () => props.close(props.onAddAgents),
});

function agentSelection(
  props: AgentChoiceProps,
): React.ComponentProps<typeof List.Section> {
  return {
    selectionMode: 'single',
    selection: props.agent ? [props.agent.id] : [],
    onSelectionChange: ([id]) => {
      if (id !== undefined) props.close(() => props.onAgentChange(id));
    },
  };
}
