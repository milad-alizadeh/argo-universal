import type { Subagent } from '@repo/contracts';
import type { JSX } from 'react';
import { Pressable, View } from 'react-native';
import { tintTransitionClassName } from '#lib/generic/motion';
import { cn } from '#lib/generic/utils';
import { Text } from '#primitives/content/text';
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

// Keep the Server's spawn order as rows change state; never regroup them.
export function WideSubagentList(props: WideProps): JSX.Element {
  return (
    <View className="p-2" accessibilityLabel="Subagents">
      {props.subagents.map((subagent) => (
        <WideRow
          key={subagent.sessionId}
          subagent={subagent}
          onSelect={props.onSelect}
          now={props.now}
        />
      ))}
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
