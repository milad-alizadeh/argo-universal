import type * as React from 'react';
import { useState } from 'react';
import { View } from 'react-native';
import { IconButton } from '#primitives/actions/icon-button';
import { Text } from '#primitives/content/text';
import { SearchField } from './search-field';

export const sidebarSearchLabel = 'Search items';

export const narrowColumnLabel = 'Narrow the column';

export const lastActionLabel = 'Add item';

/*
 * The two widths the column is drawn at here: the one it first paints at, and the narrower one it settles to. The step
 * between them is wider than the actions after the search button, so a stale measurement puts the glyph over them.
 */
export const sidebarColumnWidths = { opening: 320, settled: 232 } as const;

/*
 * A list column's heading row, as the Frame's sidebar draws it: the search button first, then the column's actions.
 * Narrowing the column moves the button without resizing it, as the Frame does when a tab's sidebar settles.
 */
export function SidebarSearchExample(): React.JSX.Element {
  const [width, setWidth] = useState<number>(sidebarColumnWidths.opening);

  return (
    <View>
      <NarrowColumn onPress={() => setWidth(sidebarColumnWidths.settled)} />
      <View className="flex-row" style={{ width }}>
        <ColumnHeading />
      </View>
    </View>
  );
}

function NarrowColumn(props: { onPress: () => void }): React.JSX.Element {
  return (
    <IconButton
      icon="collapse"
      variant="ghost"
      accessibilityLabel={narrowColumnLabel}
      onPress={props.onPress}
    />
  );
}

function ColumnHeading(): React.JSX.Element {
  const [value, setValue] = useState('');

  return (
    <SearchField
      sidebar
      label={sidebarSearchLabel}
      value={value}
      onChangeText={setValue}
      title={<ExampleTitle />}
      actions={<ExampleActions />}
    />
  );
}

function ExampleTitle(): React.JSX.Element {
  return (
    <Text role="title" numberOfLines={1}>
      Items
    </Text>
  );
}

const columnAction = { size: 'sm', variant: 'ghost' } as const;

function ExampleActions(): React.JSX.Element {
  return (
    <>
      <IconButton
        {...columnAction}
        icon="filters"
        accessibilityLabel="Filter items"
      />
      <IconButton {...columnAction} icon="add" accessibilityLabel="Add item" />
    </>
  );
}
