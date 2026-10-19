import { useContext, useId, useMemo, type ReactElement } from 'react';
import { useWindowDimensions } from 'react-native';
import { ListContext } from '../../../list-context';
import { useInMenu } from '../../../menu-rows-context';
import { ScrollFadeList } from '../../../scroll-fade/scroll-fade-list';
import type { ScrollFadeListProps } from '../../../scroll-fade/scroll-fade-list-props';
import { childEntries, menuEntries, type ListChild } from './list-children';
import { ListEmpty, useRenderedRows, useListPadding } from './list-data';
import { ListKeyboard } from './list-keyboard';
import { ListMenuRows } from './list-menu-rows';
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

// Its fades blend into the surface behind the list: a popover's card, else the page.
function DataList<Item>(props: ListProps<Item>): ReactElement {
  return (
    <ScrollFadeList
      surfaceClassName={useInMenu() ? 'bg-card' : 'bg-content'}
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
  // Keeps the row's index and highlights from the List's own row.
  const row = useContext(ListContext);

  return (
    <ListContext value={{ ...row, ...childContext(item, appearance) }}>
      {item.content}
    </ListContext>
  );
}

function childContext(
  item: ListChild,
  appearance: ListProps<never>['appearance'],
): React.ContextType<typeof ListContext> {
  return {
    appearance: appearance ?? 'plain',
    position: item.position,
    inList: true,
    selectionMode: item.selectionMode,
    selection: item.selection,
    onSelectionChange: item.onSelectionChange,
  };
}

function useChildEntries(children: ChildrenOptions['children']): ListChild[] {
  const id = useId();
  const menu = useInMenu();

  return useMemo(() => {
    const entries = childEntries(children, id);

    return menu ? menuEntries(entries) : entries;
  }, [children, id, menu]);
}

function ChildrenList({ children, ...props }: ChildrenOptions): ReactElement {
  const items = useChildEntries(children);
  // Fixed children can live inside a scrolling page without a bounded flex height.
  const { height } = useWindowDimensions();

  if (items.length === 0) return <ListEmpty {...props} />;

  return (
    <DataList
      {...props}
      maxHeight={childMaxHeight(props, height)}
      items={items}
      keyExtractor={(item) => item.key}
      renderItem={childRenderer(props.appearance)}
    />
  );
}

function childRenderer(
  appearance: ListProps<never>['appearance'],
): (item: ListChild) => ReactElement {
  return (item) => <ChildRow item={item} appearance={appearance} />;
}

function childMaxHeight(
  props: ChildrenOptions,
  height: number,
): ListProps<never>['maxHeight'] {
  if (props.fit === false) return props.maxHeight;

  return props.maxHeight ?? height;
}

function ListRows<Item>(props: ListProps<Item>): ReactElement {
  if (props.items !== undefined) return <DataList {...props} />;

  return (
    <ListKeyboard fit={props.fit}>
      <ChildrenList {...childrenOptions(props)} />
    </ListKeyboard>
  );
}

export function List<Item>(props: ListProps<Item>): ReactElement {
  return (
    <ListMenuRows>
      <ListRows {...props} />
    </ListMenuRows>
  );
}

List.Section = ListSection;
