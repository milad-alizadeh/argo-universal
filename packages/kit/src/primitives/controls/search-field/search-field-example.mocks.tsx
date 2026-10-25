import type * as React from 'react';
import { useState } from 'react';
import { View } from 'react-native';
import { IconButton } from '#primitives/actions/icon-button';
import { Text } from '#primitives/content/text';
import { SearchField } from './search-field';

// A page title row with one other action, as Agents draws it, for SearchField stories.
export function SearchFieldExample({
  initial = '',
}: {
  initial?: string;
}): React.JSX.Element {
  const [value, setValue] = useState(initial);

  return <SearchRow value={value} onChangeText={setValue} />;
}

type SearchRowProps = Pick<
  React.ComponentProps<typeof SearchField>,
  'value' | 'onChangeText'
>;

function SearchRow(props: SearchRowProps): React.JSX.Element {
  return (
    <View className="w-full flex-row">
      <SearchField
        label="Search Agents"
        {...props}
        title={<AgentsTitle />}
        actions={<AddAction />}
      />
    </View>
  );
}

function AgentsTitle(): React.JSX.Element {
  return (
    <Text role="title" numberOfLines={1}>
      Agents
    </Text>
  );
}

function AddAction(): React.JSX.Element {
  return (
    <IconButton
      icon="add"
      size="sm"
      variant="ghost"
      accessibilityLabel="Add item"
    />
  );
}
