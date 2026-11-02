import type { Subagent } from '@repo/contracts';
import { isStockIconName } from '@repo/contracts/kit-symbols';
import { FieldGroup } from '@repo/kit/primitives/fields/field-group';
import { List, phonesGrouped } from '@repo/kit/primitives/lists/list';
import type { ComponentProps, JSX } from 'react';
import { subagentMarkDescriptor } from '../../../../lib/product/subagents/subagent-role';
import { workListSections } from '../work-list-sections';
import { subagentSupporting } from './subagent-format';
import type { SubagentListProps } from './subagent-list-types';

type Mark = NonNullable<ComponentProps<typeof FieldGroup.Link>['leadingMark']>;

function mark(subagent: Subagent): Mark {
  const { icon, ...descriptor } = subagentMarkDescriptor(subagent);

  return { ...descriptor, icon: isStockIconName(icon) ? icon : 'sparkle' };
}

type PhoneProps = SubagentListProps & { now: number };

const listProps = {
  appearance: 'cards',
  onPhones: phonesGrouped,
  fit: false,
  accessibilityLabel: 'Agents',
} as const;

const row = (agent: Subagent, props: PhoneProps): JSX.Element => (
  <FieldGroup.Link
    key={agent.sessionId}
    title={agent.title}
    titleTone={agent.state === 'idle' ? 'muted' : 'neutral'}
    subtitle={subagentSupporting(agent, props.now)}
    leadingMark={mark(agent)}
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
