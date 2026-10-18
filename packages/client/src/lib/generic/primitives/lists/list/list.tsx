import { useMemo, type ReactElement } from 'react';
import { useWindowDimensions } from 'react-native';
import { ListContext } from '../../../list-context';
import { ScrollFadeList } from '../../../scroll-fade/scroll-fade-list';
import type { ScrollFadeListProps } from '../../../scroll-fade/scroll-fade-list-props';
import { childEntries, type ListChild } from './list-children';
import { ListEmpty, useRenderedRows, useListPadding } from './list-data';
import type { ListProps } from './list-props';
import { scrollProps } from './list-scroll-props';
import { ListSection } from './list-section';

type ChildrenOptions = Omit<
  ListProps<ListChild>,
  | 'items'
  | 'renderItem'
  | 'getSectionKey'
  | 'keyExtractor'
  | 'getItemType'
  | 'maintainVisibleContentPosition'
>;

function childrenOptions<Item>({
  items: _items,
  renderItem: _render,
  getSectionKey: _section,
  keyExtractor: _key,
  getItemType: _type,
  maintainVisibleContentPosition: _position,
  ...props
}: ListProps<Item>): ChildrenOptions {
  return props;
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

const fill = { flex: 1, minWidth: '100%' } as const;

function DataList<Item>(props: ListProps<Item>): ReactElement {
  return (
    <ScrollFadeList
      surfaceClassName="bg-content"
      style={fill}
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
  const context = {
    appearance: appearance ?? 'plain',
    position: item.position,
    selectionMode: item.selectionMode,
  };

  return <ListContext value={context}>{item.content}</ListContext>;
}

function ChildrenList(props: ChildrenOptions): ReactElement {
  const items = useMemo(() => childEntries(props.children), [props.children]);
  // Fixed children can live inside a scrolling page without a bounded flex height.
  const { height } = useWindowDimensions();
  const { appearance } = props;

  if (items.length === 0) return <ListEmpty {...props} />;

  return (
    <DataList
      {...props}
      maxHeight={props.maxHeight ?? height}
      items={items}
      keyExtractor={(item) => item.key}
      renderItem={(item) => <ChildRow item={item} appearance={appearance} />}
    />
  );
}

export function List<Item>(props: ListProps<Item>): ReactElement {
  if (props.items !== undefined) return <DataList {...props} />;

  return <ChildrenList {...childrenOptions(props)} />;
}

List.Section = ListSection;
