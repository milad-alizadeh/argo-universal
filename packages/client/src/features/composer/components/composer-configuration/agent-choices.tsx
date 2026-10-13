import type { AgentInfo } from '@repo/contracts';
import type * as React from 'react';
import { Platform, View, useWindowDimensions } from 'react-native';
import { listTestIdProps } from '#lib/generic/list-test-id';
import { ScrollFadeList } from '#lib/product/scroll-fade/scroll-fade-list';
import { FieldGroup } from '#primitives/fields/field-group/field-group';
import { FieldSection } from '#primitives/fields/field-section/field-section';
import { FieldRowEnd } from '../../../../lib/generic/primitives/fields/field-layout';
import { useWide } from '../../../../lib/generic/use-wide/use-wide';
import { AgentChoice } from './agent-choice';
import type { ComposerConfigurationProps } from './configuration-types';
interface AgentChoicesProps {
  configuration: ComposerConfigurationProps;
  onSelect: () => void;
}
const maximumHeight = 320;
const screenFraction = 0.6;
export function AgentChoices(props: AgentChoicesProps): React.JSX.Element {
  const wide = useWide();
  if (Platform.OS !== 'web' && !wide) return <NativeAgentChoices {...props} />;
  return <AgentList {...props} />;
}
function NativeAgentChoices(props: AgentChoicesProps): React.JSX.Element {
  return (
    <FieldGroup>
      <FieldSection>
        {props.configuration.agents.map((agent) => (
          <AgentChoice key={agent.agent} agent={agent} {...props} />
        ))}
      </FieldSection>
    </FieldGroup>
  );
}
function AgentList(props: AgentChoicesProps): React.JSX.Element {
  const listProps = useAgentList(props);
  return (
    <View className="px-4 wide:px-0">
      <FieldSection>
        <ScrollFadeList {...listProps} />
      </FieldSection>
    </View>
  );
}
function useAgentList(
  props: AgentChoicesProps,
): React.ComponentProps<typeof ScrollFadeList<AgentInfo>> {
  const wide = useWide();
  const { height } = useWindowDimensions();
  const current = props.configuration.agents.findIndex(
    (agent) => agent.agent === props.configuration.agent,
  );
  return {
    ...agentListProps(props),
    maxHeight: wide ? maximumHeight : height * screenFraction,
    initialScrollIndex: current > 0 ? current : undefined,
  };
}
const agentListPresentation = {
  ...listTestIdProps('composer-agents-scroll'),
  surfaceClassName: 'bg-sidebar',
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
    <FieldRowEnd value={last}>
      <View>
        <AgentChoice agent={agent} {...props} />
      </View>
    </FieldRowEnd>
  );
}
