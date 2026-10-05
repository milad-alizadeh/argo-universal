import type { ReactNode } from 'react';
import { View } from 'react-native';

export interface ShellHeaderActionsProps {
  position: number;
  transitionKey: string;
  animate: boolean;
  testID: string;
  children: ReactNode;
}

export function ShellHeaderActions({
  testID,
  children,
}: ShellHeaderActionsProps) {
  return (
    <View testID={testID} className="flex-row items-center gap-0.5">
      {children}
    </View>
  );
}
