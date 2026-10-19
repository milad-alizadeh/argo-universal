import type { Subagent } from '@repo/contracts';
import { type JSX } from 'react';
import { List } from '#primitives/lists/list';
import { ListItem } from '#primitives/lists/list-item';
import { subagentSupporting } from './subagent-format';
import {
  type SubagentListProps,
  type SubagentSection,
  subagentSections,
} from './subagent-list-types';
import { SubagentMark } from './subagent-mark';

type PhoneProps = SubagentListProps & { now: number };

type SectionProps = {
  section: SubagentSection;
  now: number;
  onSelect: SubagentListProps['onSelect'];
};

type RowProps = SectionProps & { subagent: Subagent };

function PhoneRow({ subagent, section, now, onSelect }: RowProps): JSX.Element {
  const supporting = subagentSupporting(subagent, now);

  return (
    <ListItem
      title={subagent.title}
      subtitle={supporting}
      leading={<SubagentMark subagent={subagent} />}
      disclosure={Boolean(onSelect)}
      onPress={onSelect ? () => onSelect(subagent) : undefined}
      accessibilityLabel={`${subagent.title}, ${section.title}, ${supporting}`}
    />
  );
}

function phoneRows({ section, now, onSelect }: SectionProps): JSX.Element[] {
  return section.rows.map((subagent) => (
    <PhoneRow
      key={subagent.sessionId}
      subagent={subagent}
      section={section}
      now={now}
      onSelect={onSelect}
    />
  ));
}

function phoneSections(props: PhoneProps): JSX.Element[] {
  return subagentSections(props.subagents).map((section) => (
    <List.Section
      key={section.title}
      title={section.title}
      count={section.rows.length}
    >
      {phoneRows({ section, now: props.now, onSelect: props.onSelect })}
    </List.Section>
  ));
}

export function PhoneSubagentList(props: PhoneProps): JSX.Element {
  return (
    <List appearance="grouped" fit={false} accessibilityLabel="Subagents">
      {phoneSections(props)}
    </List>
  );
}
