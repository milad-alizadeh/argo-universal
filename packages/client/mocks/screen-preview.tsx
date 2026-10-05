import type { ReactNode } from 'react';
import { View } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

const phoneInsets = { top: 48, bottom: 24, left: 0, right: 0 };

export function ScreenPreview({ children }: { children: ReactNode }) {
  return (
    <SafeAreaInsetsContext.Provider value={phoneInsets}>
      <View className="h-60 w-full border border-border">{children}</View>
    </SafeAreaInsetsContext.Provider>
  );
}
