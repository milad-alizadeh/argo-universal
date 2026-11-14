import { listDefaults } from '@repo/contracts/kit-tokens';
import type { ReactElement } from 'react';
import { View } from 'react-native';
import { useSkeletonLoading } from '#primitives/status/skeleton';
import type { ListLook } from '../../list-look';
import {
  ListLookContext,
  useDeclaredListLook,
  useListLook,
} from '../../list-look-context';
import { ListBehaviours } from './list/list-behaviours';
import { ChildRows } from './list/list-child-rows';
import { DataList } from './list/list-data-list';
import { ListMenuRows } from './list/list-menu-rows';
import { NativeGroupedList } from './list/list-native-grouped';
import { drawsNativeGroupedList } from './list/list-native-rows';
import { hasNoRows, placeholderChildren } from './list/list-placeholder';
import type { ListProps, MovesOrItems } from './list/list-props';
import { ListSection } from './list/list-section';

function ListRows<Item>(props: ListProps<Item>): ReactElement {
  const look = useListLook();

  if (props.items !== undefined) return <DataList {...props} />;

  if (drawsNativeGroupedList(look, props))
    return <NativeGroupedList {...props}>{props.children}</NativeGroupedList>;

  return <ChildRows {...props} />;
}

// A loading List with nothing at all of its own: one empty Section, which draws the placeholder rows.
const bareSection = <ListSection />;

const hasNothing = <Item,>(props: ListProps<Item>): boolean =>
  props.items === undefined ? hasNoRows(props) : props.items.length === 0;

/*
 * A List with nothing at all, drawn as one Section of placeholder rows. They stand in for data that has not
 * arrived, so they are children rather than items and they do not move.
 */
function bareList<Item>({
  items: _items,
  renderItem: _renderItem,
  onMove: _onMove,
  ...rest
}: ListProps<Item>): ListProps<Item> {
  return { ...rest, children: placeholderChildren(bareSection) };
}

type ChildList<Item> = ListProps<Item> & { items?: undefined };

// Each Section with no rows of its own takes placeholder rows; the Sections that have rows keep them.
const partlyFilledList = <Item,>(props: ChildList<Item>): ListProps<Item> => ({
  ...props,
  children: placeholderChildren(props.children),
});

/*
 * What a loading List draws. A List that already has rows or items keeps every one of them: the Skeleton draws
 * over the content it finds, and only what has nothing of its own stands in for itself.
 */
function loadingList<Item>(props: ListProps<Item>): ListProps<Item> {
  if (hasNothing(props)) return bareList(props);

  return props.items === undefined ? partlyFilledList(props) : props;
}

const useListContent = <Item,>(props: ListProps<Item>): ListProps<Item> =>
  useSkeletonLoading() ? loadingList(props) : props;

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

// A card's rows carry 4 of their own inside their hover tile; pulling the List out by that puts their marks on the card's edge.
const CardEdge = ({
  card,
  children,
}: {
  card: boolean;
  children: ReactElement;
}): ReactElement =>
  card ? <View className="-mx-1">{children}</View> : children;

// A Plugin's List, whose props its wire checked: plugin-kit's types keep `onMove` off a List of `items` there.
export function PluginList<Item>(props: ListProps<Item>): ReactElement {
  const list = useListContent(props);
  const look = useLook(list);

  return (
    <ListLookContext value={look}>
      <CardEdge card={look.card}>
        <ListBehaviours list={list} render={renderRows} />
      </CardEdge>
    </ListLookContext>
  );
}

// `onMove` moves rows passed as children, so a List of `items` cannot take it.
export function List<Item>(
  props: ListProps<Item> & MovesOrItems,
): ReactElement {
  return <PluginList {...props} />;
}

List.Section = ListSection;
