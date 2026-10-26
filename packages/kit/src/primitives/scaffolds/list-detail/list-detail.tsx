import type { ReactElement, ReactNode } from 'react';
import { View } from 'react-native';
import { useClaim, useOfferedPlace, type Place } from '#kit/place';
import { useWide } from '#kit/use-wide/use-wide';
import {
  Screen,
  ScreenBesideList,
  ScreenListColumn,
} from '#primitives/scaffolds/screen';
import type { ListDetailProps } from './list-detail-props';
import { ListDetailSidebarPlace } from './list-detail-sidebar';
import { SidebarRows } from './sidebar-rows';

/*
 * Foundations / ListDetail: on a wide window the list sits beside the selected item, in the App's sidebar at a
 * section's root or in a 312 pane of its own; under wide the list is the screen and the item replaces it, as a route
 * pushed over the list does. The caller passes the item the route selects, so a link opens it at any width.
 */
export function ListDetail(props: ListDetailProps): ReactElement {
  const wide = useWide();
  const sidebar = useOfferedPlace(ListDetailSidebarPlace);

  if (wide) return <WithDetail {...props} wide sidebar={sidebar} />;

  if (props.detail == null) return <ListOnly {...props} />;

  return <WithDetail {...props} wide={false} />;
}

// A list with a Screen is the screen's own: its Screen replaces the header an item's Screen left in the navigator, and on a wide window is the heading above the list.
function withScreen(list: ReactNode, props: ListDetailProps): ReactNode {
  const screen = listScreen(props);

  return screen ? <Screen {...screen}>{list}</Screen> : list;
}

const listScreen = (props: ListDetailProps): ListDetailProps['screen'] =>
  props.screen ?? (props.title ? { title: props.title } : undefined);

function ListOnly(props: ListDetailProps): ReactElement {
  return <Pane testID={props.testID}>{withScreen(props.list, props)}</Pane>;
}

/*
 * The detail, with the list in a pane of its own beside it when no sidebar takes the list, or in the App's sidebar
 * for as long as this ListDetail is shown. The detail keeps its place in the tree as the width or the sidebar changes.
 */
type WithDetailProps = ListDetailProps & {
  wide: boolean;
  sidebar?: Place<ReactNode>;
};

function WithDetail({
  wide,
  sidebar,
  ...props
}: WithDetailProps): ReactElement {
  const list = withScreen(<SidebarRows>{props.list}</SidebarRows>, props);
  useClaim(sidebar, list);

  return (
    <View testID={props.testID} className="flex-1 flex-row">
      {wide && !sidebar && <ListPane list={list} />}
      <DetailPane {...props} />
    </View>
  );
}

function ListPane({ list }: { list: ReactNode }): ReactElement {
  return (
    <Pane className="w-frame-list shrink-0">
      {/* The detail's Screen names the screen; a list's Screen only draws its heading. */}
      <ScreenListColumn>{list}</ScreenListColumn>
    </Pane>
  );
}

// The selected item, or the caller's empty state while nothing is selected.
function DetailPane(props: ListDetailProps): ReactElement {
  return (
    <Pane className="min-w-0 flex-1">
      <ScreenBesideList value>{props.detail ?? props.empty}</ScreenBesideList>
    </Pane>
  );
}

// Each side keeps its own place in the tree and fills it; a nested ListDetail splits again.
function Pane(props: {
  testID?: string;
  className?: string;
  children: ReactNode;
}): ReactElement {
  return (
    <View testID={props.testID} className={props.className ?? 'flex-1'}>
      <ListDetailSidebarPlace value={undefined}>
        {props.children}
      </ListDetailSidebarPlace>
    </View>
  );
}
