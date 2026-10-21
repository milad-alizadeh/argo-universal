import type { ComponentProps, ReactElement } from 'react';
import { View } from 'react-native';
import { Text } from '#primitives/content/text';
import type { IconName } from '../generic/symbols/icon-names';
import { ToneMark } from '../generic/tone-mark';

export interface StackedSummaryIcon {
  icon: IconName;
  tone: ComponentProps<typeof ToneMark>['tone'];
}

interface Props {
  icons: readonly StackedSummaryIcon[];
  texts: readonly string[];
}

// Paper's group entry: distinct decorative icons and their summary.
export function StackedSummary({ icons, texts }: Props): ReactElement {
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

function SummaryIcons({ icons }: Pick<Props, 'icons'>): ReactElement {
  return (
    <View {...markStackProps}>
      {uniqueIcons(icons).map(({ icon, tone }, index) => (
        <View key={icon} className={index > 0 ? '-ml-1.5' : undefined}>
          <ToneMark icon={icon} tone={tone} role="control" form="disc" />
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
