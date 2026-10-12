import type * as React from 'react';
import { useState } from 'react';
import { View } from 'react-native';
import { IconButton } from '../src/lib/generic/primitives/icon-button';
import { SearchField } from '../src/lib/generic/primitives/search-field';
import { Text } from '../src/lib/generic/primitives/text';

// A page title row with one other action, as Agents draws it, for SearchField stories.
export function SearchFieldExample({
  initial = '',
}: {
  initial?: string;
}): React.JSX.Element {
  const [value, setValue] = useState(initial);
  return (
    <View className="w-full flex-row">
      <SearchField
        label="Search Agents"
        value={value}
        onChangeText={setValue}
        title={
          <Text role="title" numberOfLines={1}>
            Agents
          </Text>
        }
        actions={
          <IconButton
            icon="add"
            size="sm"
            variant="ghost"
            iconClassName="text-muted-foreground"
            accessibilityLabel="Add custom Agent"
          />
        }
      />
    </View>
  );
}
