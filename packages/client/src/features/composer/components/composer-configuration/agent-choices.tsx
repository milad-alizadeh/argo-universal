import type { AgentInfo } from '@repo/contracts';
import type * as React from 'react';
import { Platform, View, useWindowDimensions } from 'react-native';
import { listTestIdProps } from '#lib/generic/list-test-id';
import { ScrollFadeList } from '#lib/product/scroll-fade/scroll-fade-list';
import { GroupedList } from '#primitives/lists/grouped-list';
import { GroupedListItemEnd } from '#primitives/lists/grouped-list-item';
import { GroupedListSection } from '#primitives/lists/grouped-list-section';
import { SizeClass } from '../../../../lib/generic/size-class/size-class';
import { AgentChoice } from './agent-choice';
import type { ConfigurationChoicesProps as AgentChoicesProps } from './configuration-types';

const maximumHeight = 320;

const screenFraction = 0.6;

// A phone lists the Agents natively; a wide window and the web scroll a list.
export function AgentChoices(props: AgentChoicesProps): React.JSX.Element {
  if (Platform.OS === 'web') return <AgentList {...props} />;

  return (
    <SizeClass
      compact={<NativeAgentChoices {...props} />}
      wide={<AgentList {...props} />}
    />
  );
}

function NativeAgentChoices(props: AgentChoicesProps): React.JSX.Element {
  return (
    <GroupedList onContentHeightChange={props.onContentHeightChange}>
      <GroupedListSection>
        {props.configuration.agents.map((agent) => (
          <AgentChoice key={agent.agent} agent={agent} {...props} />
        ))}
      </GroupedListSection>
    </GroupedList>
  );
}

function AgentList(props: AgentChoicesProps): React.JSX.Element {
  const listProps = useAgentList(props);

  return (
    <View className="px-4 wide:px-0">
      <GroupedListSection>
        <ScrollFadeList {...listProps} />
      </GroupedListSection>
    </View>
  );
}

function useAgentList(
  props: AgentChoicesProps,
): React.ComponentProps<typeof ScrollFadeList<AgentInfo>> {
  const { height } = useWindowDimensions();

  const current = props.configuration.agents.findIndex(
    (agent) => agent.agent === props.configuration.agent,
  );

  return {
    ...agentListProps(props),
    maxHeight: { compact: height * screenFraction, wide: maximumHeight },
    initialScrollIndex: current > 0 ? current : undefined,
  };
}

const agentListPresentation = {
  ...listTestIdProps('composer-agents-scroll'),
  surfaceClassName: 'bg-content',
  estimatedItemSize: 52,
};

function agentListProps(
  props: AgentChoicesProps,
): React.ComponentProps<typeof ScrollFadeList<AgentInfo>> {
  const agents = props.configuration.agents;

  return {
    ...agentListPresentation,
    data: agents,
    keyExtractor: (agent) => agent.agent,
    renderItem: agentListRenderer(props),
    extraData: props.configuration,
  };
}

function agentListRenderer(
  props: AgentChoicesProps,
): NonNullable<
  React.ComponentProps<typeof ScrollFadeList<AgentInfo>>['renderItem']
> {
  return ({ item, index }) => (
    <AgentListRow
      {...props}
      agent={item}
      last={index === props.configuration.agents.length - 1}
    />
  );
}

function AgentListRow({
  agent,
  last,
  ...props
}: AgentChoicesProps & { agent: AgentInfo; last: boolean }): React.JSX.Element {
  return (
    <GroupedListItemEnd value={last}>
      <View>
        <AgentChoice agent={agent} {...props} />
      </View>
    </GroupedListItemEnd>
  );
}
