import type { Subagent } from '@repo/contracts';
import type { ReactElement } from 'react';
import { View } from 'react-native';
import { useClock } from '#lib/generic/use-clock';
import { Text } from '#primitives/content/text';
import { StackedSummary } from '../../../lib/product/stacked-summary';
import { subagentRoleMark } from '../../../lib/product/subagents/subagent-role';
import { subagentSupporting } from './subagent-list/subagent-format';
import type { SubagentListProps } from './subagent-list/subagent-list-types';
import { SubagentMark } from './subagent-list/subagent-mark';

type ActiveProps = { agent: Subagent; now: number };

export function WorkbenchAgents(props: SubagentListProps): ReactElement {
  const active = props.subagents.filter((agent) => agent.state !== 'idle');
  const done = props.subagents.filter((agent) => agent.state === 'idle');
  const now = useClock(active.length > 0, props.now);

  return (
    <View>
      {active.map((agent) => (
        <ActiveAgent key={agent.sessionId} agent={agent} now={now} />
      ))}
      {done.length > 0 && <DoneAgents agents={done} />}
    </View>
  );
}

function ActiveAgent({ agent, now }: ActiveProps): ReactElement {
  return (
    <View className="flex-row items-start gap-2 px-1 py-2">
      <SubagentMark subagent={agent} />
      <ActiveAgentText agent={agent} now={now} />
    </View>
  );
}

function ActiveAgentText({ agent, now }: ActiveProps): ReactElement {
  return (
    <View className="min-w-0 flex-1 gap-0.5">
      <Text numberOfLines={1}>{agent.title}</Text>
      <Text role="secondary" tone="muted" numberOfLines={1}>
        {subagentSupporting(agent, now)}
      </Text>
    </View>
  );
}

function DoneAgents({ agents }: { agents: Subagent[] }): ReactElement {
  const marks = agents.map((agent) => ({
    key: agent.sessionId,
    ...subagentRoleMark(agent.role),
  }));

  return <StackedSummary marks={marks} label={`${agents.length} done`} />;
}
