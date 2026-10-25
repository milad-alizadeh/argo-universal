import { Action } from '@repo/kit/primitives/actions/action';
import { Text } from '@repo/kit/primitives/content/text';
import { Screen } from '@repo/kit/primitives/scaffolds/screen';
import type * as React from 'react';
import { View } from 'react-native';

export function MockText({
  testID,
  text,
}: {
  testID: string;
  text: string;
}): React.JSX.Element {
  return (
    <View className="p-4">
      <Text testID={testID}>{text}</Text>
    </View>
  );
}

const exampleAction = (
  <Action
    key="example"
    label="Example action"
    icon="archive"
    onPress={() => {}}
  />
);

// A header menu of its own, so a story can open it without opening the Inspector.
const moreActions = (
  <Action key="more" label="More actions" icon="more">
    <Action.Section key="example">{exampleAction}</Action.Section>
  </Action>
);

// A stand-in page that names its section, with a header menu.
export function MockPage({ title }: { title: string }): React.JSX.Element {
  return (
    <Screen title={`${title} page`} actions={moreActions}>
      <View className="flex-1 p-4">
        <Text testID="detail-content">{title} detail</Text>
      </View>
    </Screen>
  );
}
