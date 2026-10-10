import type * as React from 'react';
import type { ReactNode } from 'react';
import { View } from 'react-native';

export interface ShellHeaderContentProps {
  inset: number;
  animate?: boolean;
  position?: number;
  transitionKey?: string;
  testID: string;
  children: ReactNode;
}

export function ShellHeaderContent({
  inset,
  testID,
  children,
}: ShellHeaderContentProps): React.JSX.Element {
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
