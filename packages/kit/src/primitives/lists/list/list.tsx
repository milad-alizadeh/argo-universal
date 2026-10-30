import { listDefaults } from '@repo/contracts/kit-tokens';
import type { ReactElement } from 'react';
import { useSkeletonLoading } from '#primitives/status/skeleton';
import type { ListLook } from '../../../list-look';
import {
  ListLookContext,
  useDeclaredListLook,
  useListLook,
} from '../../../list-look-context';
import { ListBehaviours } from './list-behaviours';
import { ChildRows } from './list-child-rows';
import { DataList } from './list-data-list';
import { ListMenuRows } from './list-menu-rows';
import { NativeGroupedList } from './list-native-grouped';
import { asksNothingNativeLacks, holdsNativeRows } from './list-native-rows';
import { hasNoRows, placeholderChildren } from './list-placeholder';
import type { ListProps, MovesOrItems } from './list-props';
import { ListSection } from './list-section';

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
      <NativeGroupedList empty={props.empty} onMove={props.onMove}>
        {props.children}
      </NativeGroupedList>
    );

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

// A Plugin's List, whose props its wire checked: plugin-kit's types keep `onMove` off a List of `items` there.
export function PluginList<Item>(props: ListProps<Item>): ReactElement {
  const list = useListContent(props);

  return (
    <ListLookContext value={useLook(list)}>
      <ListBehaviours list={list} render={renderRows} />
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
