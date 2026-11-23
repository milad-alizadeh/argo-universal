import type { ReactElement, ReactNode } from 'react';
import { View } from 'react-native';

const rule = 'h-px flex-1 bg-border';

export function QuietFeedRow({
  children,
}: {
  children: ReactNode;
}): ReactElement {
  return (
    <View className="w-full flex-row items-center gap-3">
      <View className={rule} />
      <View className="min-w-0 shrink">{children}</View>
      <View className={rule} />
    </View>
  );
}
