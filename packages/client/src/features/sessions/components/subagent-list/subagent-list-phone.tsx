import type { Subagent } from '@repo/contracts';
import { Icon } from '@repo/kit/primitives/content/icon';
import { List } from '@repo/kit/primitives/lists/list';
import { ListItem } from '@repo/kit/primitives/lists/list-item';
import type { ComponentProps, JSX } from 'react';
import { Platform } from 'react-native';
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

function disclosure(onSelect: RowProps['onSelect']): JSX.Element | undefined {
  if (!onSelect || Platform.OS !== 'android') return undefined;

  return <Icon name="chevron-right" size="sm" tone="muted" />;
}

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
    trailing: disclosure(onSelect),
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

function phoneRows(props: PhoneProps): JSX.Element[] {
  return props.subagents.map((subagent) => (
    <PhoneRow
      key={subagent.sessionId}
      subagent={subagent}
      onSelect={props.onSelect}
      now={props.now}
    />
  ));
}

export function PhoneSubagentList(props: PhoneProps): JSX.Element {
  return (
    <List appearance="cards" fit={false} accessibilityLabel="Subagents">
      <List.Section>{phoneRows(props)}</List.Section>
    </List>
  );
}
