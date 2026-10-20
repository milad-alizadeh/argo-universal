import type { ReactNode } from 'react';
import { View } from 'react-native';
import { Text } from '#primitives/content/text';

type HeaderTitleLineProps = {
  title: ReactNode;
  count?: number;
};

export function HeaderTitleLine({
  title,
  count,
}: HeaderTitleLineProps): ReactNode {
  if (count === undefined) return title;

  return (
    <View className="flex-row items-baseline gap-1.5">
      {title}
      <Text role="secondary" tone="muted">
        {count}
      </Text>
    </View>
  );
}
