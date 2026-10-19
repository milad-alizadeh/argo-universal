import type * as React from 'react';
import { View } from 'react-native';
import { Action, ActionList } from '#primitives/actions/action-list';
import { Text } from '#primitives/content/text';
import { Page } from '#primitives/scaffolds/page';

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
function MoreActionsMenu(): React.JSX.Element {
  return (
    <ActionList>
      <Action key="more" label="More actions" icon="more">
        <ActionList.Section key="example">{exampleAction}</ActionList.Section>
      </Action>
    </ActionList>
  );
}

// A stand-in page that names its section, with a header menu.
export function MockPage({ title }: { title: string }): React.JSX.Element {
  return (
    <Page title={`${title} page`} actions={<MoreActionsMenu />}>
      <View className="flex-1 p-4">
        <Text testID="detail-content">{title} detail</Text>
      </View>
    </Page>
  );
}
