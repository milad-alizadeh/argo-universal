import type { Subagent } from '@repo/contracts';
import type { JSX } from 'react';
import { useClock } from '#lib/generic/use-clock';
import { List } from '#primitives/lists/list';
import { RowDrawingContext } from '../../../../lib/generic/row-drawing-context';
import { SizeClass } from '../../../../lib/generic/size-class/size-class';
import { SubagentRow } from './subagent-row';

export interface SubagentListProps {
  subagents: Subagent[];
  onSelect?: (subagent: Subagent) => void;
  now?: number;
}

type ListBodyProps = SubagentListProps & { now: number; wide: boolean };

// One flat list in spawn order, as the Feed shows them: rows never regroup when a Subagent finishes.
function SubagentRows(props: ListBodyProps): JSX.Element[] {
  return props.subagents.map((subagent) => (
    <SubagentRow
      key={subagent.sessionId}
      subagent={subagent}
      now={props.now}
      wide={props.wide}
      onSelect={props.onSelect}
    />
  ));
}

// Desktop: sidebar rows, flat on the pane. Phones: one grouped card in the Sheet.
function WideSubagentList(props: ListBodyProps): JSX.Element {
  return (
    <RowDrawingContext value="sidebar">
      <List appearance="plain" fit={false} accessibilityLabel="Subagents">
        {SubagentRows(props)}
      </List>
    </RowDrawingContext>
  );
}

function PhoneSubagentList(props: ListBodyProps): JSX.Element {
  return (
    <List appearance="grouped" fit={false} accessibilityLabel="Subagents">
      <List.Section>{SubagentRows(props)}</List.Section>
    </List>
  );
}

export function SubagentList(props: SubagentListProps): JSX.Element | null {
  const running = props.subagents.some((subagent) => subagent.state !== 'idle');
  const now = useClock(running, props.now);

  if (props.subagents.length === 0) return null;

  return (
    <SizeClass
      compact={<PhoneSubagentList {...props} now={now} wide={false} />}
      wide={<WideSubagentList {...props} now={now} wide />}
    />
  );
}
