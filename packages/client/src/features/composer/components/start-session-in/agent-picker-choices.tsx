import type { AgentServer } from '@repo/contracts';
import type * as React from 'react';
import { useWindowDimensions } from 'react-native';
import { RegistryIcon } from '#features/agents';
import { Icon } from '#primitives/content/icon';
import { List } from '#primitives/lists/list';
import { ListItem } from '#primitives/lists/list-item';
import type { StartSessionInProps } from './start-session-types';

export type AgentChoiceProps = StartSessionInProps & {
  close: (after?: () => void) => void;
};

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
    <List.Section selectionMode="single">
      {props.agents.map((agent) => (
        <AgentChoice key={agent.id} agent={agent} choices={props} />
      ))}
      <ListItem {...addAgentsProps(props)} />
    </List.Section>
  );
}

type RowProps = { agent: AgentServer; choices: AgentChoiceProps };

function AgentChoice({ agent, choices }: RowProps): React.JSX.Element {
  return (
    <ListItem
      {...agentChoiceProps(agent, choices)}
      leading={
        <RegistryIcon uri={agent.icon} agentName={agent.name} role="row" />
      }
    />
  );
}

const agentChoiceProps = (
  agent: AgentServer,
  choices: AgentChoiceProps,
): React.ComponentProps<typeof ListItem> => ({
  title: agent.name,
  selected: choices.agent?.id === agent.id,
  onPress: () => choices.close(() => choices.onAgentChange(agent.id)),
});

const addAgentsProps = (
  props: AgentChoiceProps,
): React.ComponentProps<typeof ListItem> => ({
  title: 'Add Agents',
  leading: <Icon name="add" role="row" />,
  onPress: () => props.close(props.onAddAgents),
});
