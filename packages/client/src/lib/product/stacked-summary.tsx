import { Text } from '@repo/kit/primitives/content/text';
import type { IconName } from '@repo/kit/symbols/icon-names';
import { ToneMark } from '@repo/kit/tone-mark';
import type { ComponentProps, ReactElement } from 'react';
import { View } from 'react-native';

export interface StackedSummaryIcon {
  icon: IconName;
  tone: ComponentProps<typeof ToneMark>['tone'];
}

export interface StackedSummaryProps {
  // The decorative marks the summary stacks; repeats collapse into one.
  icons: readonly StackedSummaryIcon[];
  // The counts the summary reads out, joined by commas.
  texts: readonly string[];
}

// Paper's group entry: distinct decorative icons and their summary.
export function StackedSummary({
  icons,
  texts,
}: StackedSummaryProps): ReactElement {
  return (
    <View className="flex-row items-center gap-2 px-1 py-2">
      <SummaryIcons icons={icons} />
      <View className="min-w-0 flex-1">
        <Text role="body" tone="muted">
          {texts.join(', ')}
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

function SummaryIcons({
  icons,
}: Pick<StackedSummaryProps, 'icons'>): ReactElement {
  return (
    <View {...markStackProps}>
      {uniqueIcons(icons).map(({ icon, tone }, index) => (
        <View key={icon} className={index > 0 ? '-ml-1.5' : undefined}>
          <ToneMark icon={icon} tone={tone} size="sm" form="disc" />
        </View>
      ))}
    </View>
  );
}

function uniqueIcons(
  icons: readonly StackedSummaryIcon[],
): StackedSummaryIcon[] {
  const seen = new Set<IconName>();

  return icons.filter(({ icon }) => {
    if (seen.has(icon)) return false;
    seen.add(icon);

    return true;
  });
}
