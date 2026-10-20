import type { JSX } from 'react';
import { useClock } from '#lib/generic/use-clock';
import { SizeClass } from '../../../../lib/generic/size-class/size-class';
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
