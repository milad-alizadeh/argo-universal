import type * as React from 'react';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { Text } from '#lib/generic/primitives/display/text/text';

const phoneInsets = { top: 48, bottom: 24, left: 0, right: 0 };

export function ScreenPreview({
  children,
}: {
  children: ReactNode;
}): React.JSX.Element {
  return (
    <SafeAreaInsetsContext.Provider value={phoneInsets}>
      <View className="h-60 w-full border border-border">{children}</View>
    </SafeAreaInsetsContext.Provider>
  );
}

export function ScreenPreviewContent(): React.JSX.Element {
  return (
    <View className="flex-1 items-center justify-center bg-background">
      <Text>Screen content</Text>
    </View>
  );
}
