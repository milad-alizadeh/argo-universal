import type { ReactNode } from 'react';
import { View } from 'react-native';

export interface ShellHeaderContentProps {
  inset: number;
  testID: string;
  children: ReactNode;
}

export function ShellHeaderContent({
  inset,
  testID,
  children,
}: ShellHeaderContentProps) {
  return (
    <View
      testID={testID}
      className="min-w-0 flex-1"
      style={{ marginLeft: inset }}
    >
      {children}
    </View>
  );
}
