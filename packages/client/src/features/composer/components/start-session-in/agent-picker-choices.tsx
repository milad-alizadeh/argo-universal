import type { AgentServer } from '@repo/contracts';
import type * as React from 'react';
import { Platform, Pressable, View, useWindowDimensions } from 'react-native';
import { RegistryIcon } from '#features/agents';
import { ScrollFadeList } from '#lib/product/scroll-fade/scroll-fade-list';
import { Icon } from '#primitives/display/icon';
import { SelectedCheck } from '#primitives/display/selected-check';
import { Text } from '#primitives/display/text';
import { GroupedList } from '#primitives/lists/grouped-list';
import {
  GroupedListItem,
  type GroupedListItemProps,
} from '#primitives/lists/grouped-list-item';
import { GroupedListSection } from '#primitives/lists/grouped-list-section';
import type { StartSessionInProps } from './start-session-types';

export type AgentChoiceProps = StartSessionInProps & {
  close: (after?: () => void) => void;
};

const maximumHeight = 320;

const screenFraction = 0.6;

export function AgentChoices(props: AgentChoiceProps): React.JSX.Element {
  const { height } = useWindowDimensions();

  const agents = [...props.agents].sort((a, b) => a.name.localeCompare(b.name));

  if (Platform.OS !== 'web')
    return <NativeChoices {...props} agents={agents} />;

  return (
    <WebChoices
      {...props}
      agents={agents}
      maxHeight={{ compact: height * screenFraction, wide: maximumHeight }}
    />
  );
}

type ScrollableChoicesProps = AgentChoiceProps &
  Pick<React.ComponentProps<typeof ScrollFadeList>, 'maxHeight'>;

function WebChoices(props: ScrollableChoicesProps): React.JSX.Element {
  return <ChoicesList {...props} />;
}

function ChoicesList(props: ScrollableChoicesProps): React.JSX.Element {
  return (
    <ScrollFadeList
      data={props.agents}
      maxHeight={props.maxHeight}
      contentContainerStyle={{ gap: 2 }}
      testID="new-session-agents-scroll"
      keyExtractor={({ id }) => id}
      renderItem={({ item }) => <WebAgentChoice agent={item} choices={props} />}
      ListFooterComponent={<WebAddAgents {...props} />}
    />
  );
}

function NativeChoices(props: AgentChoiceProps): React.JSX.Element {
  return (
    <GroupedList fit>
      <GroupedListSection>
        {props.agents.map((agent) => (
          <AgentChoice key={agent.id} agent={agent} choices={props} />
        ))}
        <AddAgents {...props} />
      </GroupedListSection>
    </GroupedList>
  );
}

type RowProps = {
  agent: AgentServer;
  choices: AgentChoiceProps;
};

function AgentChoice({ agent, choices }: RowProps): React.JSX.Element {
  return (
    <GroupedListItem
      {...choiceProps(agent, choices)}
      leading={
        <RegistryIcon uri={agent.icon} agentName={agent.name} role="row" />
      }
    />
  );
}

function WebAgentChoice({ agent, choices }: RowProps): React.JSX.Element {
  const selected = choices.agent === agent.id;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      className="min-h-9 flex-row items-center gap-3 rounded-xl px-2 web:cursor-default web:select-none web:outline-none web:hover:bg-hover web:focus:bg-hover web:active:bg-pressed"
      onPress={() => choices.close(() => choices.onAgentChange(agent.id))}
    >
      <RegistryIcon uri={agent.icon} agentName={agent.name} role="row" />
      <Text role="body" numberOfLines={1} className="min-w-0 flex-1">
        {agent.name}
      </Text>
      {selected ? <SelectedCheck role="mark" /> : <View className="size-4" />}
    </Pressable>
  );
}

const choiceProps = (
  agent: AgentServer,
  props: AgentChoiceProps,
): GroupedListItemProps => ({
  label: agent.name,
  accessibilityRole: 'button',
  disclosure: false,
  selected: props.agent === agent.id,
  accessory: props.agent === agent.id ? <SelectedCheck /> : undefined,
  onPress: () => props.close(() => props.onAgentChange(agent.id)),
});

function AddAgents(props: AgentChoiceProps): React.JSX.Element {
  return (
    <GroupedListItem
      label="Add Agents"
      icon="add"
      accessibilityRole="button"
      onPress={() => props.close(props.onAddAgents)}
    />
  );
}

function WebAddAgents(props: AgentChoiceProps): React.JSX.Element {
  return (
    <View className="pt-1_5">
      <Pressable
        accessibilityRole="button"
        className="min-h-9 flex-row items-center gap-3 rounded-xl px-2 web:cursor-default web:select-none web:outline-none web:hover:bg-hover web:focus:bg-hover web:active:bg-pressed"
        onPress={() => props.close(props.onAddAgents)}
      >
        <Icon name="add" role="row" />
        <Text role="body">Add Agents</Text>
      </Pressable>
    </View>
  );
}
