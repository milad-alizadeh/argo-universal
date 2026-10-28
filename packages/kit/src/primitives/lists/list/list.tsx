import { listDefaults } from '@repo/contracts/kit-tokens';
import type { ReactElement } from 'react';
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
import type { ListProps } from './list-props';
import { ListSection } from './list-section';

// iOS and Android draw a grouped List of FieldGroup rows as their own grouped list, at every width (ADR-0042), unless it sets a prop that list cannot draw.
const drawsNatively = (look: ListLook, props: ListProps<never>): boolean =>
  look.phone !== undefined &&
  asksNothingNativeLacks(props) &&
  holdsNativeRows(props.children);

function ListRows<Item>(props: ListProps<Item>): ReactElement {
  const look = useListLook();

  if (props.items !== undefined) return <ItemRows {...props} />;

  if (drawsNatively(look, props))
    return (
      <NativeGroupedList empty={props.empty}>
        {props.children}
      </NativeGroupedList>
    );

  return <ChildRows {...props} />;
}

// Only a List of children moves its rows: an `items` List draws rows its `renderItem` makes, with no ids to move.
function ItemRows<Item>(props: ListProps<Item>): ReactElement {
  if (props.onMove && process.env.NODE_ENV !== 'production')
    console.error(
      'List: `onMove` moves rows passed as children; a List of `items` cannot move its rows.',
    );

  return <DataList {...props} />;
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
