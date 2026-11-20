import type { Subagent } from '@repo/contracts';
import { Text } from '@repo/kit/primitives/content/text';
import { useClock } from '@repo/kit/use-clock';
import { useId, type ReactElement } from 'react';
import { Pressable, View } from 'react-native';
import { subagentRoleMark } from '../../../lib/product/subagents/subagent-role';
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

  const icons = subagents
    .filter((agent) => !isWorking(agent))
    .map((agent) => subagentRoleMark(agent.role));

  return <WorkbenchShowMore {...{ more, done, icons, onOpen }} />;
}

const rowPressable = (
  { agent, onOpen }: RowProps,
  hint: string,
  descriptionId: string,
) =>
  ({
    role: 'button',
    accessibilityLabel: `Open ${agent.title}`,
    accessibilityHint: hint,
    'aria-describedby': descriptionId,
    onPress: () => onOpen(agent),
    className:
      'flex-row items-start gap-2 rounded-control px-1 py-2 web:hover:bg-hover',
  }) as const;

function AgentRow(props: RowProps): ReactElement {
  const descriptionId = useId();
  const supporting = subagentSupporting(props.agent, props.now);

  return (
    <Pressable {...rowPressable(props, supporting, descriptionId)}>
      <SubagentMark subagent={props.agent} />
      <AgentText title={props.agent.title} {...{ supporting, descriptionId }} />
    </Pressable>
  );
}

type AgentTextProps = {
  title: string;
  supporting: string;
  descriptionId: string;
};

function AgentText(props: AgentTextProps): ReactElement {
  return (
    <View className="min-w-0 flex-1 gap-0.5">
      <Text numberOfLines={1}>{props.title}</Text>
      <View nativeID={props.descriptionId}>
        <Text role="secondary" tone="muted">
          {props.supporting}
        </Text>
      </View>
    </View>
  );
}
