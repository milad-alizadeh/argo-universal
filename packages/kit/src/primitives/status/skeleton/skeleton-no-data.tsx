import type { ReactElement, ReactNode } from 'react';
import { View } from 'react-native';
import { Text } from '#primitives/content/text';
import { List } from '#primitives/lists/list';
import { ListItem } from '#primitives/lists/list-item';
import { Skeleton } from './index';
import type { SkeletonProps } from './skeleton-props';

const noItems: string[] = [];

const someItems = ['Kept row'];

const renderItem = (item: string): ReactElement => <ListItem title={item} />;

// A title whose words have not arrived: nothing to say, so the line is a bar of the role's width.
function BlankTitle(): ReactElement {
  return <Text role="title">{undefined}</Text>;
}

function Lists(): ReactElement {
  return (
    <View className="gap-4">
      <BlankTitle />
      <List appearance="grouped" fit items={noItems} renderItem={renderItem} />
      <List appearance="cards" fit>
        <List.Section title="Section" />
      </List>
    </View>
  );
}

function Sample(
  props: Omit<SkeletonProps, 'children'> & { children: ReactNode },
): ReactElement {
  return (
    <View className="w-full max-w-xl p-4">
      <Skeleton {...props} />
    </View>
  );
}

/*
 * Story material: content with no data at all. A List of no items, a Section with no rows and a Text with no
 * words each stand in for themselves, so the Skeleton has the shape of the loaded page to measure.
 * What `Skeleton.Ignore` holds stays as drawn, so nothing there stands in for itself.
 */
export function SkeletonNoData(
  props: Omit<SkeletonProps, 'children'>,
): ReactElement {
  return (
    <Sample {...props}>
      <View className="gap-4">
        <ListsIn testID="skeleton-no-data" />
        <Skeleton.Ignore>
          <ListsIn testID="skeleton-ignored" />
        </Skeleton.Ignore>
      </View>
    </Sample>
  );
}

function ListsIn(props: { testID: string }): ReactElement {
  return (
    <View testID={props.testID}>
      <Lists />
    </View>
  );
}

/*
 * Story material: a List whose rows have arrived while the page waits for the rest. It keeps every row it has,
 * and the Skeleton draws over them.
 */
export function SkeletonWithRows(
  props: Omit<SkeletonProps, 'children'>,
): ReactElement {
  return (
    <Sample {...props}>
      <List
        appearance="grouped"
        fit
        items={someItems}
        renderItem={renderItem}
      />
    </Sample>
  );
}
