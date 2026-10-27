import { listDefaults } from '@repo/contracts/kit-tokens';
import type { ReactElement } from 'react';
import { useWindowDimensions } from 'react-native';
import type { ListLook } from '../../../list-look';
import {
  ListLookContext,
  useDeclaredListLook,
  useListLook,
} from '../../../list-look-context';
import { RowHighlightProvider } from '../../../row-highlights';
import { ScrollFadeList } from '../../../scroll-fade/scroll-fade-list';
import type { ScrollFadeListProps } from '../../../scroll-fade/scroll-fade-list-props';
import { ListBehaviours } from './list-behaviours';
import { childIdentity } from './list-child-identity';
import { usePreparedChildren } from './list-children';
import { childrenOptions, type ChildrenOptions } from './list-children-options';
import { ListEmpty, useRenderedRows, useListPadding } from './list-data';
import { childRenderer, ListGrouping } from './list-grouping';
import { ListKeyboard } from './list-keyboard';
import { ListMenuRows } from './list-menu-rows';
import { NativeGroupedList } from './list-native-grouped';
import { asksNothingNativeLacks, holdsNativeRows } from './list-native-rows';
import type { ListProps } from './list-props';
import { scrollProps } from './list-scroll-props';
import { ListSection } from './list-section';
import type { ListBlock } from './list-section-model';
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
    <ListGrouping list={props}>
      <RowHighlightProvider>
        <ScrollFadeList
          surfaceClassName={useListLook().menu ? 'bg-card' : 'bg-content'}
          style={fill}
          {...useDataListProps(props)}
        />
      </RowHighlightProvider>
    </ListGrouping>
  );
}

function ChildrenList({ children, ...props }: ChildrenOptions): ReactElement {
  const prepared = usePreparedChildren({ children, ...props });
  // Fixed children can live inside a scrolling page without a bounded flex height.
  const { height } = useWindowDimensions();

  if (prepared.items.length === 0 && !prepared.shelves)
    return <ListEmpty {...props} />;

  return (
    <ChildDataList
      {...props}
      {...prepared}
      maxHeight={childMaxHeight(props, height)}
      maintainVisibleContentPosition={childAnchor(props.anchor)}
    />
  );
}

function ChildDataList({
  blocks,
  shelves,
  ...props
}: Omit<ChildDataProps, 'renderItem'> & {
  blocks: ListBlock[];
  shelves: boolean;
}): ReactElement {
  if (shelves)
    return <SectionShelves {...props} {...childDrawing} blocks={blocks} />;

  return <DataList {...props} {...childDrawing} />;
}

function childMaxHeight(
  props: ChildrenOptions,
  height: number,
): ListProps<never>['maxHeight'] {
  if (props.fit === false) return props.maxHeight;

  return props.maxHeight ?? height;
}

// iOS and Android draw a grouped List of FieldGroup rows as their own grouped list, at every width (ADR-0042), unless it sets a prop that list cannot draw.
const drawsNatively = (look: ListLook, props: ListProps<never>): boolean =>
  look.phone !== undefined &&
  asksNothingNativeLacks(props) &&
  holdsNativeRows(props.children);

function ListRows<Item>(props: ListProps<Item>): ReactElement {
  const look = useListLook();

  if (props.items !== undefined) return <DataList {...props} />;

  if (drawsNatively(look, props))
    return (
      <NativeGroupedList empty={props.empty}>
        {props.children}
      </NativeGroupedList>
    );

  return (
    <ListKeyboard fit={props.fit}>
      <ChildrenList {...childrenOptions(props)} />
    </ListKeyboard>
  );
}

const useLook = <Item,>(props: ListProps<Item>): ListLook =>
  useDeclaredListLook({
    ...props,
    appearance: props.appearance ?? listDefaults.appearance,
    density: props.density ?? listDefaults.density,
  });

const renderRows = <Item,>(prepared: ListProps<Item>): ReactElement => (
  <ListMenuRows>
    <ListRows {...prepared} />
  </ListMenuRows>
);

export function List<Item>(props: ListProps<Item>): ReactElement {
  return (
    <ListLookContext value={useLook(props)}>
      <ListBehaviours list={props} render={renderRows} />
    </ListLookContext>
  );
}

List.Section = ListSection;

const childDrawing: Pick<
  ChildDataProps,
  'keyExtractor' | 'fullSpan' | 'getItemType' | 'renderItem'
> = { ...childIdentity, renderItem: childRenderer };

function childAnchor(anchor: ListProps<never>['anchor']): true | undefined {
  return anchor === 'end' ? true : undefined;
}
