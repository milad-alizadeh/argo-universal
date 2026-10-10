import type * as React from 'react';
import { ScrollView } from 'react-native';

export function SettingsScroll({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="w-full max-w-2xl self-center p-4 wide:p-8"
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}
