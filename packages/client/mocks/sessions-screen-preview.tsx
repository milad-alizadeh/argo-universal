import type { ReactNode } from 'react';
import { View } from 'react-native';

export function SessionsScreenPreview({ children }: { children: ReactNode }) {
  return (
    <View className="flex-1 w-full" style={{ minHeight: 0 }}>
      {children}
    </View>
  );
}
