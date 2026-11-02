import type { ReactNode } from 'react';
import { View } from 'react-native';

interface LineEndProps {
  end: ReactNode;
  children: ReactNode;
}

// A line of a row's text with an item at its end, 8 after the text, which truncates first.
export function LineEnd({ end, children }: LineEndProps): ReactNode {
  if (end === undefined) return children;

  return (
    <View className="min-w-0 flex-row items-center gap-2">
      <View className="min-w-0 flex-1">{children}</View>
      <View className="shrink-0 flex-row items-center">{end}</View>
    </View>
  );
}
