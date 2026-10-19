import type { Subagent } from '@repo/contracts';
import type { JSX } from 'react';
import { Pressable, View } from 'react-native';
import { Text } from '#primitives/content/text';
import { subagentSupporting } from './subagent-format';
import {
  type SubagentListProps,
  type SubagentSection,
  subagentSections,
} from './subagent-list-types';
import { SubagentMark } from './subagent-mark';

type WideProps = SubagentListProps & { now: number };

type SectionProps = {
  section: SubagentSection;
  now: number;
  onSelect: SubagentListProps['onSelect'];
};

type RowProps = {
  subagent: Subagent;
  now: number;
  onSelect: SubagentListProps['onSelect'];
};

function WideRowText({
  subagent,
  now,
}: Pick<RowProps, 'subagent' | 'now'>): JSX.Element {
  return (
    <View className="min-w-0 flex-1 gap-0.5">
      <Text role="body" numberOfLines={1}>
        {subagent.title}
      </Text>
      <Text role="secondary" tone="muted" numberOfLines={1}>
        {subagentSupporting(subagent, now)}
      </Text>
    </View>
  );
}

function WideRow({ subagent, onSelect, now }: RowProps): JSX.Element {
  return (
    <Pressable
      role="button"
      accessibilityLabel={`${subagent.title}, ${subagentSupporting(subagent, now)}`}
      onPress={() => onSelect(subagent)}
      className="min-h-9 flex-row items-start gap-3 rounded-xl px-3 py-2 web:hover:bg-hover web:active:bg-pressed"
    >
      <View className="h-5 w-5 shrink-0 items-center justify-center">
        <SubagentMark subagent={subagent} />
      </View>
      <WideRowText subagent={subagent} now={now} />
    </Pressable>
  );
}

function WideHeader({ section }: Pick<SectionProps, 'section'>): JSX.Element {
  return (
    <View className="h-8 flex-row items-center gap-1.5 px-3">
      <Text role="heading" aria-level={2}>
        {section.title}
      </Text>
      <Text role="secondary" tone="muted">
        {section.rows.length}
      </Text>
    </View>
  );
}

function WideRows({ section, now, onSelect }: SectionProps): JSX.Element[] {
  return section.rows.map((subagent) => (
    <WideRow
      key={subagent.sessionId}
      subagent={subagent}
      onSelect={onSelect}
      now={now}
    />
  ));
}

function WideSection(props: SectionProps): JSX.Element {
  return (
    <View>
      <WideHeader section={props.section} />
      <WideRows {...props} />
    </View>
  );
}

export function WideSubagentList(props: WideProps): JSX.Element {
  return (
    <View className="p-2" accessibilityLabel="Subagents">
      {subagentSections(props.subagents).map((section) => (
        <WideSection
          key={section.title}
          section={section}
          onSelect={props.onSelect}
          now={props.now}
        />
      ))}
    </View>
  );
}
