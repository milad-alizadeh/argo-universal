import type { AgentServer } from '@repo/contracts';
import type * as React from 'react';
import { Platform, View, useWindowDimensions } from 'react-native';
import { RegistryIcon } from '#features/agents';
import { ScrollFadeList } from '#lib/product/scroll-fade/scroll-fade-list';
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

  if (Platform.OS !== 'web') return <NativeChoices {...props} />;

  return (
    <WebChoices
      {...props}
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
      renderItem={({ item }) => <AgentChoice agent={item} choices={props} />}
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
      size={Platform.OS === 'web' ? 'sm' : undefined}
    />
  );
}

const choiceProps = (
  agent: AgentServer,
  props: AgentChoiceProps,
): GroupedListItemProps => ({
  label: agent.name,
  accessibilityRole: 'button',
  disclosure: false,
  selected: props.agent?.id === agent.id,
  choice: true,
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
      <GroupedListItem
        label="Add Agents"
        icon="add"
        accessibilityRole="button"
        onPress={() => props.close(props.onAddAgents)}
      />
    </View>
  );
}
