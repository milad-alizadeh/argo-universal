import type { ReactNode } from 'react';
import { Platform, useWindowDimensions, View } from 'react-native';

export function SessionsScreenPreview({ children }: { children: ReactNode }) {
  const { height } = useWindowDimensions();
  return (
    <View
      className="w-full wide:w-shell-list"
      style={{ height: Platform.OS === 'web' ? 844 : height - 160 }}
    >
      {children}
    </View>
  );
}
