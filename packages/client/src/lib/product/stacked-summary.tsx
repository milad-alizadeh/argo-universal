import type { ComponentProps, ReactElement } from 'react';
import { View } from 'react-native';
import { Text } from '#primitives/content/text';
import type { IconName } from '../generic/symbols/icon-names';
import { ToneMark } from '../generic/tone-mark';

export interface SummaryMark {
  key: string;
  icon: IconName;
  tone: ComponentProps<typeof ToneMark>['tone'];
  surface?: 'glass';
}

interface Props {
  marks: readonly SummaryMark[];
  label: string;
}

// Paper's group entry: distinct decorative icons and their summary.
export function StackedSummary({ marks, label }: Props): ReactElement {
  return (
    <View className="flex-row items-center gap-2 px-1 py-2">
      <SummaryMarks marks={marks} />
      <View className="min-w-0 flex-1">
        <Text role="body" tone="muted">
          {label}
        </Text>
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
      {uniqueMarks(marks).map((mark, index) => (
        <View key={mark.key} className={index > 0 ? '-ml-1.5' : undefined}>
          <SummaryIcon mark={mark} />
        </View>
      ))}
    </View>
  );
}

function SummaryIcon({ mark }: { mark: SummaryMark }): ReactElement {
  const glyph = summaryGlyph(mark);

  if (mark.surface !== 'glass') return glyph;

  return (
    <View className="size-6 items-center justify-center rounded-full bg-glass wide-type:size-5">
      {glyph}
    </View>
  );
}

function summaryGlyph(mark: SummaryMark): ReactElement {
  return (
    <ToneMark
      icon={mark.icon}
      tone={mark.tone}
      role="control"
      form={mark.surface === 'glass' ? 'bare' : 'disc'}
    />
  );
}

function uniqueMarks(marks: readonly SummaryMark[]): SummaryMark[] {
  const seen = new Set<IconName>();

  return marks.filter(({ icon }) => {
    if (seen.has(icon)) return false;
    seen.add(icon);

    return true;
  });
}
