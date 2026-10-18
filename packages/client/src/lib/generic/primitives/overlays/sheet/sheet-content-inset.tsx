import type { ReactNode, ReactElement } from 'react';
import { View } from 'react-native';

// Sheet / Default: composed content keeps the master's inset and spacing between its body and actions.
export function SheetContent({
  children,
}: {
  children: ReactNode;
}): ReactElement {
  return <View className="gap-6 p-4">{children}</View>;
}
