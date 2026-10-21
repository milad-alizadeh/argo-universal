import type { ReactElement, ReactNode } from 'react';
import { View } from 'react-native';
import { Text } from '#primitives/content/text';

export interface SummaryMark {
  key: string;
  node: ReactNode;
}

interface Props {
  marks: readonly SummaryMark[];
  label: string;
}

const visibleMarks = 3;

// Paper's group entry: a bounded stack of decorative marks and its summary.
export function StackedSummary({ marks, label }: Props): ReactElement {
  return (
    <View className="flex-row items-center gap-2 px-1 py-2">
      <SummaryMarks marks={marks} />
      <View className="min-w-0 flex-1">
        <Text tone="muted">{label}</Text>
      </View>
    </View>
  );
}

const markStackProps = {
  'aria-hidden': true,
  accessibilityElementsHidden: true,
  importantForAccessibility: 'no-hide-descendants',
  className: 'min-w-7 shrink-0 flex-row items-center pl-1',
} as const;

function SummaryMarks({ marks }: Pick<Props, 'marks'>): ReactElement {
  return (
    <View {...markStackProps}>
      {marks.slice(0, visibleMarks).map((mark, index) => (
        <View key={mark.key} className={index > 0 ? '-ml-1.5' : undefined}>
          {mark.node}
        </View>
      ))}
    </View>
  );
}
