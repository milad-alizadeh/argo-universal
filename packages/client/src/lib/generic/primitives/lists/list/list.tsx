import { useMemo, type ReactElement } from 'react';
import { ListContext } from '../../../list-context';
import { listTestIdProps } from '../../../list-test-id';
import { ScrollFadeList } from '../../../scroll-fade/scroll-fade-list';
import type { ScrollFadeListProps } from '../../../scroll-fade/scroll-fade-list-props';
import { childEntries, type ListChild } from './list-children';
import { ListEmpty, useRenderedRows, useListPadding } from './list-data';
import type { ListProps } from './list-props';
import { ListSection } from './list-section';

type ChildrenOptions = Omit<
  ListProps<ListChild>,
  'items' | 'renderItem' | 'getSectionKey' | 'keyExtractor' | 'getItemType'
>;

function childrenOptions<Item>({
  items: _items,
  renderItem: _render,
  getSectionKey: _section,
  keyExtractor: _key,
  getItemType: _type,
  ...props
}: ListProps<Item>): ChildrenOptions {
  return props;
}

function scrollEvents<Item>(
  props: ListProps<Item>,
): Partial<ScrollFadeListProps<Item>> {
  return {
    onScroll: props.onScroll,
    onEndReached: props.onEndReached,
    onEndReachedThreshold: props.onEndReachedThreshold,
    contentInsetAdjustmentBehavior: props.contentInsetAdjustmentBehavior,
  };
}

function testProps(
  testID?: string,
): ReturnType<typeof listTestIdProps> | Record<never, never> {
  return testID ? listTestIdProps(testID) : {};
}

function scrollBounds<Item>(
  props: ListProps<Item>,
): Partial<ScrollFadeListProps<Item>> {
  return { edges: props.edges, ref: props.ref, maxHeight: props.maxHeight };
}

function scrollProps<Item>(
  props: ListProps<Item>,
): Partial<ScrollFadeListProps<Item>> {
  return {
    ...scrollEvents(props),
    keyExtractor: props.keyExtractor,
    getItemType: props.getItemType,
    extraData: props.extraData,
    recycleItems: props.recycleItems ?? false,
    estimatedItemSize: props.estimatedItemSize,
    ...testProps(props.testID),
    ...scrollBounds(props),
  };
}

function useDataListProps<Item>(
  props: ListProps<Item>,
): ScrollFadeListProps<Item> {
  const renderItem = useRenderedRows(props);
  const contentContainerStyle = useListPadding(props);

  return {
    ...scrollProps(props),
    data: props.items ?? [],
    renderItem,
    contentContainerStyle,
    ListEmptyComponent: (
      <ListEmpty isLoading={props.isLoading} empty={props.empty} />
    ),
  };
}

function DataList<Item>(props: ListProps<Item>): ReactElement {
  return (
    <ScrollFadeList
      surfaceClassName="bg-content"
      {...useDataListProps(props)}
    />
  );
}

function ChildRow({
  item,
  appearance,
}: {
  item: ListChild;
  appearance: ListProps<never>['appearance'];
}): ReactElement {
  return (
    <ListContext
      value={{ appearance: appearance ?? 'plain', position: item.position }}
    >
      {item.content}
    </ListContext>
  );
}

function ChildrenList(props: ChildrenOptions): ReactElement {
  const items = useMemo(() => childEntries(props.children), [props.children]);

  return (
    <DataList
      {...props}
      items={items}
      keyExtractor={(item) => item.key}
      renderItem={(item) => (
        <ChildRow item={item} appearance={props.appearance} />
      )}
    />
  );
}

export function List<Item>(props: ListProps<Item>): ReactElement {
  if (props.items !== undefined) return <DataList {...props} />;

  return <ChildrenList {...childrenOptions(props)} />;
}

List.Section = ListSection;
