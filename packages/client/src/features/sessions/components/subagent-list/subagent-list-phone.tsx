import type { Subagent } from '@repo/contracts';
import { FieldGroup } from '@repo/kit/primitives/fields/field-group';
import { List } from '@repo/kit/primitives/lists/list';
import type { JSX } from 'react';
import { subagentMarkDescriptor } from '../../../../lib/product/subagents/subagent-role';
import { workListSections } from '../work-list-sections';
import { subagentSupporting } from './subagent-format';
import type { SubagentListProps } from './subagent-list-types';

type PhoneProps = SubagentListProps & { now: number };

const listProps = {
  appearance: 'grouped',
  fit: false,
  accessibilityLabel: 'Agents',
} as const;

const row = (agent: Subagent, props: PhoneProps): JSX.Element => (
  <FieldGroup.Link
    key={agent.sessionId}
    title={agent.title}
    titleTone={agent.state === 'idle' ? 'muted' : 'neutral'}
    subtitle={subagentSupporting(agent, props.now)}
    roomy
    wrapSubtitle
    leadingMark={subagentMarkDescriptor(agent)}
    disabled={!props.onSelect}
    onPress={() => props.onSelect?.(agent)}
  />
);

function rows(props: PhoneProps): JSX.Element[] {
  return workListSections(
    props.subagents,
    (agent) => agent.state !== 'idle',
    (agent) => row(agent, props),
  );
}

export function PhoneSubagentList(props: PhoneProps): JSX.Element {
  return <List {...listProps}>{rows(props)}</List>;
}
