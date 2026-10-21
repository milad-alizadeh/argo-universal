import { SizeClass } from '@repo/kit/size-class/size-class';
import { useClock } from '@repo/kit/use-clock';
import type { JSX } from 'react';
import { PhoneSubagentList } from './subagent-list-phone';
import type { SubagentListProps } from './subagent-list-types';
import { WideSubagentList } from './subagent-list-wide';

export type { SubagentListProps } from './subagent-list-types';

export function SubagentList(props: SubagentListProps): JSX.Element | null {
  const running = props.subagents.some((subagent) => subagent.state !== 'idle');
  const now = useClock(running, props.now);

  if (props.subagents.length === 0) return null;

  return (
    <SizeClass
      compact={<PhoneSubagentList {...props} now={now} />}
      wide={<WideSubagentList {...props} now={now} />}
    />
  );
}
