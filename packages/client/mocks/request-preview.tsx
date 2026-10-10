import type * as React from 'react';
import type { ReactNode } from 'react';
import { View } from 'react-native';
export function RequestFrame({
  children,
}: {
  children: ReactNode;
}): React.JSX.Element {
  return (
    <View className="w-full items-center p-4 wide:px-6">
      <View className="w-full max-w-composer">{children}</View>
    </View>
  );
}
