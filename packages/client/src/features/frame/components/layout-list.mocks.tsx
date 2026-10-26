import { Text } from '@repo/kit/primitives/content/text';
import { Screen } from '@repo/kit/primitives/scaffolds/screen';
import type * as React from 'react';
import { ScrollView } from 'react-native';

// A stand-in for a section's connected list under its Screen, which the screen passes in the app.
export function LayoutListMock({ name }: { name: string }): React.JSX.Element {
  return (
    <Screen title={name}>
      <ScrollView contentContainerClassName="px-gutter py-6">
        <Text role="secondary">{name} list</Text>
      </ScrollView>
    </Screen>
  );
}
