import type { Subagent } from '@repo/contracts';
import { tintTransitionClassName } from '@repo/kit/motion';
import { Text } from '@repo/kit/primitives/content/text';
import { cn } from '@repo/kit/utils';
import type { JSX } from 'react';
import { Pressable, View } from 'react-native';
import { workListSections } from '../work-list-sections';
import { subagentSupporting } from './subagent-format';
import type { SubagentListProps } from './subagent-list-types';
import { SubagentMark } from './subagent-mark';

type WideProps = SubagentListProps & { now: number };

type RowProps = {
  subagent: Subagent;
  now: number;
  onSelect: SubagentListProps['onSelect'];
};

const rowClasses = cn(
  'min-h-9 flex-row items-start gap-3 rounded-lg px-3 py-2 web:hover:bg-hover web:active:bg-pressed web:focus-visible:outline-2 web:focus-visible:outline-focus web:focus-visible:-outline-offset-2',
  tintTransitionClassName,
);

function WideRowText({
  subagent,
  now,
}: Pick<RowProps, 'subagent' | 'now'>): JSX.Element {
  return (
    <View className="min-w-0 flex-1 gap-0.5">
      <Text {...titleProps(subagent)}>{subagent.title}</Text>
      <Text {...supportingProps(subagent)}>
        {subagentSupporting(subagent, now)}
      </Text>
    </View>
  );
}

const titleProps = (subagent: Subagent) =>
  ({
    role: 'body',
    tone: subagent.state === 'idle' ? 'muted' : 'neutral',
    numberOfLines: 1,
  }) as const;

function WideRow({ subagent, onSelect, now }: RowProps): JSX.Element {
  return (
    <Pressable
      role="button"
      accessibilityLabel={`${subagent.title}, ${subagentSupporting(subagent, now)}`}
      onPress={onSelect ? () => onSelect(subagent) : undefined}
      disabled={!onSelect}
      className={rowClasses}
    >
      <SubagentMark subagent={subagent} />
      <WideRowText subagent={subagent} now={now} />
    </Pressable>
  );
}

// Static sections share the Inspector's scroll viewport.
export function WideSubagentList(props: WideProps): JSX.Element {
  const row = (subagent: Subagent): JSX.Element => (
    <WideRow key={subagent.sessionId} {...props} subagent={subagent} />
  );

  return (
    <View className="p-2" accessibilityLabel="Agents">
      {workListSections(
        props.subagents,
        (agent) => agent.state !== 'idle',
        row,
      )}
    </View>
  );
}

const supportingProps = (subagent: Subagent) =>
  ({
    role: 'secondary',
    tone: 'muted',
    dimmed: subagent.state === 'idle',
    numberOfLines: 1,
  }) as const;
