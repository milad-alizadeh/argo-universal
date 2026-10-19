import type { Subagent } from '@repo/contracts';
import { type JSX } from 'react';
import { View } from 'react-native';
import { Text } from '#primitives/content/text';
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

function PhoneHeader({ section }: { section: SubagentSection }): JSX.Element {
  return (
    <View className="flex-row items-baseline gap-1.5 px-4 pb-2 pt-4">
      <Text role="heading" aria-level={2} tone="muted">
        {section.title}
      </Text>
      <Text role="body" tone="muted">
        {section.rows.length}
      </Text>
    </View>
  );
}

function PhoneRow({ subagent, section, now, onSelect }: RowProps): JSX.Element {
  const supporting = subagentSupporting(subagent, now);

  return (
    <ListItem
      title={subagent.title}
      subtitle={supporting}
      leading={<SubagentMark subagent={subagent} />}
      disclosure
      onPress={() => onSelect(subagent)}
      accessibilityLabel={`${subagent.title}, ${section.title}, ${supporting}`}
    />
  );
}

function PhoneRows({ section, now, onSelect }: SectionProps): JSX.Element[] {
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

function PhoneSection(props: SectionProps): JSX.Element {
  return (
    <>
      <PhoneHeader section={props.section} />
      <List.Section>
        <PhoneRows {...props} />
      </List.Section>
    </>
  );
}

export function PhoneSubagentList(props: PhoneProps): JSX.Element {
  return (
    <List appearance="grouped" fit={false} accessibilityLabel="Subagents">
      {subagentSections(props.subagents).map((section) => (
        <PhoneSection
          key={section.title}
          section={section}
          now={props.now}
          onSelect={props.onSelect}
        />
      ))}
    </List>
  );
}
