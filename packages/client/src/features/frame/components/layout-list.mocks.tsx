import type * as React from 'react';
import { ScrollView } from 'react-native';
import { Text } from '#lib/generic/primitives/text';

// A stand-in for a section's connected list, which the screen passes in the app.
export function LayoutListMock({ name }: { name: string }): React.JSX.Element {
  return (
    <ScrollView contentContainerClassName="px-gutter py-6">
      <Text variant="muted">{name} list</Text>
    </ScrollView>
  );
}
