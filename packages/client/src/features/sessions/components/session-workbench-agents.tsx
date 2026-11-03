import type { Subagent } from '@repo/contracts';
import { Text } from '@repo/kit/primitives/content/text';
import { useClock } from '@repo/kit/use-clock';
import type { ReactElement } from 'react';
import { Pressable, View } from 'react-native';
import { subagentSupporting } from './subagent-list/subagent-format';
import type { SubagentListProps } from './subagent-list/subagent-list-types';
import { SubagentMark } from './subagent-list/subagent-mark';
import { activePreview } from './workbench-preview';
import { WorkbenchShowMore } from './workbench-show-more';

type OpenAgent = (agent: Subagent) => void;

type Props = SubagentListProps & { onOpen: OpenAgent };

type RowProps = { agent: Subagent; now: number; onOpen: OpenAgent };

const isWorking = (agent: Subagent): boolean => agent.state !== 'idle';

export function WorkbenchAgents(props: Props): ReactElement {
  const { rows } = activePreview(props.subagents, isWorking);
  const now = useClock(rows.length > 0, props.now);

  const row = (agent: Subagent): ReactElement => (
    <AgentRow key={agent.sessionId} {...{ agent, now, onOpen: props.onOpen }} />
  );

  return <View>{rows.map(row)}</View>;
}

// The footer of the Agents card: the Agents it left out, absent when every one is a row.
export function WorkbenchMoreAgents({
  subagents,
  onOpen,
}: Pick<SubagentListProps, 'subagents'> & {
  onOpen: () => void;
}): ReactElement | null {
  const { more, done } = activePreview(subagents, isWorking);

  return <WorkbenchShowMore more={more} done={done} onOpen={onOpen} />;
}

const rowPressable = ({ agent, onOpen }: RowProps) =>
  ({
    role: 'button',
    accessibilityLabel: `Open ${agent.title}`,
    onPress: () => onOpen(agent),
    className:
      'flex-row items-start gap-2 rounded-control px-1 py-2 web:hover:bg-hover web:focus-visible:bg-hover',
  }) as const;

function AgentRow(props: RowProps): ReactElement {
  return (
    <Pressable {...rowPressable(props)}>
      <SubagentMark subagent={props.agent} />
      <AgentText agent={props.agent} now={props.now} />
    </Pressable>
  );
}

function AgentText({ agent, now }: Omit<RowProps, 'onOpen'>): ReactElement {
  return (
    <View className="min-w-0 flex-1 gap-0.5">
      <Text numberOfLines={1}>{agent.title}</Text>
      <Text role="secondary" tone="muted" numberOfLines={1}>
        {subagentSupporting(agent, now)}
      </Text>
    </View>
  );
}
