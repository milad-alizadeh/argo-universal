import type { Subagent } from '@repo/contracts';
import { List, phonesGrouped } from '@repo/kit/primitives/lists/list';
import { ListItem } from '@repo/kit/primitives/lists/list-item';
import type { ComponentProps, JSX } from 'react';
import { workListSections } from '../work-list-sections';
import { subagentSupporting } from './subagent-format';
import type { SubagentListProps } from './subagent-list-types';
import { SubagentMark } from './subagent-mark';

type PhoneProps = SubagentListProps & { now: number };

type RowProps = Omit<PhoneProps, 'subagents'> & { subagent: Subagent };

const rowPress = ({
  subagent,
  onSelect,
}: RowProps): (() => void) | undefined =>
  onSelect ? () => onSelect(subagent) : undefined;

const rowTones = (finished: boolean) =>
  ({
    titleTone: finished ? 'muted' : 'neutral',
    subtitleDimmed: finished,
  }) as const;

function phoneRowProps(props: RowProps): ComponentProps<typeof ListItem> {
  const { subagent, now, onSelect } = props;
  const supporting = subagentSupporting(subagent, now);

  return {
    ...rowTones(subagent.state === 'idle'),
    title: subagent.title,
    subtitle: supporting,
    disclosure: Boolean(onSelect),
    onPress: rowPress(props),
    accessibilityLabel: `${subagent.title}, ${supporting}`,
  };
}

function PhoneRow(props: RowProps): JSX.Element {
  return (
    <ListItem
      {...phoneRowProps(props)}
      leading={<SubagentMark subagent={props.subagent} />}
      leadingSize="avatar"
    />
  );
}

const listProps = {
  appearance: 'cards',
  onPhones: phonesGrouped,
  fit: false,
  accessibilityLabel: 'Agents',
} as const;

export function PhoneSubagentList(props: PhoneProps): JSX.Element {
  const row = (subagent: Subagent): JSX.Element => (
    <PhoneRow key={subagent.sessionId} {...props} subagent={subagent} />
  );

  return (
    <List {...listProps}>
      {workListSections(
        props.subagents,
        (agent) => agent.state !== 'idle',
        row,
      )}
    </List>
  );
}
