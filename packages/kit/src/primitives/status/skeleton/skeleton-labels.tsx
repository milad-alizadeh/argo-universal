import type { ReactElement } from 'react';
import { View } from 'react-native';
import { DrawerItem } from '#primitives/lists/drawer-item';
import { List } from '#primitives/lists/list';
import { ListItem } from '#primitives/lists/list-item';
import { Metadata } from '#primitives/scaffolds/metadata';
import { Skeleton } from './index';
import type { SkeletonProps } from './skeleton-props';

const noop = (): void => {};

// A drawer destination: its label is on the Pressable, not on the words it draws.
function Destination(): ReactElement {
  return (
    <DrawerItem
      label="Placeholder destination"
      icon="activity"
      selected={false}
      onPress={noop}
    />
  );
}

// A metadata field: the group is one element named after the field, and its value is read from the group's label.
function Field(): ReactElement {
  return (
    <Metadata>
      <Metadata.Label title="Placeholder field" text="Placeholder value" />
    </Metadata>
  );
}

// A folded parent row: the row labels itself, and so does the chevron that folds it.
function Tree(): ReactElement {
  return (
    <List appearance="grouped" fit>
      <ListItem title="Placeholder parent">
        <ListItem title="Placeholder child" />
      </ListItem>
    </List>
  );
}

/*
 * Story material: content that labels itself rather than drawing the words. Each of these carries an accessibility
 * label on a container, not on a text leaf, so hiding the leaves a Skeleton draws over leaves the label speaking.
 * A Skeleton holds all of them, so a screen reader says "Loading" and nothing else.
 */
export function SkeletonLabels(
  props: Omit<SkeletonProps, 'children'>,
): ReactElement {
  return (
    <View className="w-full max-w-xl p-4">
      <Skeleton {...props}>
        <View className="gap-4">
          <Destination />
          <Field />
          <Tree />
        </View>
      </Skeleton>
    </View>
  );
}
