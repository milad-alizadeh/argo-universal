import type { AgentServer } from '@repo/contracts';
import type * as React from 'react';
import { Platform, View, useWindowDimensions } from 'react-native';
import { RegistryIcon } from '#features/agents';
import { ScrollFadeList } from '#lib/product/scroll-fade/scroll-fade-list';
import { SelectedCheck } from '#primitives/display/selected-check';
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
  return (
    <View className="px-4 wide:px-0">
      <GroupedListSection>
        <ChoicesList {...props} />
      </GroupedListSection>
    </View>
  );
}

function ChoicesList(props: ScrollableChoicesProps): React.JSX.Element {
  return (
    <ScrollFadeList
      data={props.agents}
      maxHeight={props.maxHeight}
      surfaceClassName="bg-content"
      testID="new-session-agents-scroll"
      keyExtractor={({ id }) => id}
      renderItem={({ item }) => <AgentChoice agent={item} choices={props} />}
      ListFooterComponent={<AddAgents {...props} />}
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
