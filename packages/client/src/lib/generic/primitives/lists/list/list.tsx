import { useContext, useId, useMemo, type ReactElement } from 'react';
import { useWindowDimensions } from 'react-native';
import { ListContext } from '../../../list-context';
import { useInMenu } from '../../../menu-rows-context';
import { RowHighlightProvider } from '../../../row-highlights';
import { ScrollFadeList } from '../../../scroll-fade/scroll-fade-list';
import type { ScrollFadeListProps } from '../../../scroll-fade/scroll-fade-list-props';
import { childIdentity } from './list-child-identity';
import { childEntries, menuEntries, type ListChild } from './list-children';
import { childrenOptions, type ChildrenOptions } from './list-children-options';
import { ListEmpty, useRenderedRows, useListPadding } from './list-data';
import { ListKeyboard } from './list-keyboard';
import { ListMenuRows } from './list-menu-rows';
import type { ListProps } from './list-props';
import { scrollProps } from './list-scroll-props';
import { ListSection } from './list-section';
import { SectionShelves, type ChildDataProps } from './list-section-shelves';
import type { TileListProps } from './list-tile-props';
import { ListTiles } from './list-tiles';

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
function DataList<Item>(props: TileListProps<Item>): ReactElement {
  if (props.layout === 'grid' || props.direction === 'horizontal')
    return (
      <RowHighlightProvider>
        <ListTiles {...props} />
      </RowHighlightProvider>
    );

  return <RowList {...props} />;
}

function RowList<Item>(props: ListProps<Item>): ReactElement {
  return (
    <RowHighlightProvider>
      <ScrollFadeList
        surfaceClassName={useInMenu() ? 'bg-card' : 'bg-content'}
        style={fill}
        {...useDataListProps(props)}
      />
    </RowHighlightProvider>
  );
}

function ChildRow({
  item,
  appearance,
}: {
  item: ListChild;
  appearance: ListProps<never>['appearance'];
}): ReactElement {
  // Keeps the row's index from the List's own row.
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
    <ChildDataList
      {...props}
      maxHeight={childMaxHeight(props, height)}
      items={items}
      {...childIdentity}
      renderItem={childRenderer(props.appearance)}
    />
  );
}

function ChildDataList(props: ChildDataProps): ReactElement {
  if (hasSectionShelves(props)) return <SectionShelves {...props} />;

  return <DataList {...props} />;
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

function hasSectionShelves(props: ChildDataProps): boolean {
  if (props.direction !== 'horizontal') return false;

  return props.items.some((item) => item.fullSpan);
}
