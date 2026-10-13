import type { ReactNode } from 'react';
import { View } from 'react-native';
import { Icon } from '#primitives/display/icon/icon';
import { Text } from '#primitives/display/text/text';
import type { IconName } from '../../../../lib/generic/symbols/icon-names';

export function RequestHeading({
  icon,
  title,
  hint,
  trailing,
}: {
  icon: IconName;
  title: string;
  hint?: string;
  trailing?: ReactNode;
}): ReactNode {
  return (
    <View className="flex-row items-start gap-2 px-4 wide:px-3.5">
      <View className="w-0 min-w-0 flex-1 gap-0.5">
        <View className="flex-row items-start gap-2.5">
          <Icon
            name={icon}
            role="body"
            className="shrink-0 text-muted-foreground"
          />
          <Text
            role="heading"
            semanticRole="heading"
            aria-level={2}
            className="min-w-0 flex-1 ios:type-nav-title"
          >
            {title}
          </Text>
        </View>
        {hint && (
          <Text
            role="secondary"
            className="pl-7.5 wide:pl-6.5 text-muted-foreground"
          >
            {hint}
          </Text>
        )}
      </View>
      {trailing}
    </View>
  );
}
