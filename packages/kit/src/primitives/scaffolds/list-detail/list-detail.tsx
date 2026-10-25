import { use, type ReactElement, type ReactNode } from 'react';
import { View } from 'react-native';
import { useClaim } from '#kit/claim-store';
import { useWide } from '#kit/use-wide/use-wide';
import {
  Screen,
  ScreenBesideList,
  ScreenNavigationEnabled,
} from '#primitives/scaffolds/screen';
import type { ListDetailProps } from './list-detail-props';
import {
  ListDetailSidebarContext,
  type ListDetailSidebar,
} from './list-detail-sidebar';
import { SidebarRows } from './sidebar-rows';

/*
 * Foundations / ListDetail: on a wide window the list sits beside the selected item, in the App's sidebar at a
 * section's root or in a 312 pane of its own; under wide the list is the screen and the item replaces it, as a route
 * pushed over the list does. The caller passes the item the route selects, so a link opens it at any width.
 */
export function ListDetail(props: ListDetailProps): ReactElement {
  const wide = useWide();
  const sidebar = use(ListDetailSidebarContext);

  if (wide) return <WithDetail {...props} wide sidebar={sidebar} />;

  if (props.detail == null) return <ListOnly {...props} />;

  return <WithDetail {...props} wide={false} />;
}

// A titled list is the screen's own: its Screen replaces the header an item's Screen left in the navigator.
function ListOnly(props: ListDetailProps): ReactElement {
  const { title, list } = props;

  return (
    <Pane testID={props.testID}>
      {title ? <Screen title={title}>{list}</Screen> : list}
    </Pane>
  );
}

/*
 * The detail, with the list in a pane of its own beside it when no sidebar takes the list, or in the App's sidebar
 * for as long as this ListDetail is shown. The detail keeps its place in the tree as the width or the sidebar changes.
 */
type WithDetailProps = ListDetailProps & {
  wide: boolean;
  sidebar?: ListDetailSidebar;
};

function WithDetail({
  wide,
  sidebar,
  ...props
}: WithDetailProps): ReactElement {
  const list = <SidebarRows>{props.list}</SidebarRows>;
  useClaim(sidebar, list);

  return (
    <View testID={props.testID} className="flex-1 flex-row">
      {wide && !sidebar && <ListPane list={list} />}
      <DetailPane {...props} />
    </View>
  );
}

function ListPane({ list }: Pick<ListDetailProps, 'list'>): ReactElement {
  return (
    <Pane className="w-frame-list shrink-0">
      {/* The detail's Screen names the screen; a list's Screen only draws its heading. */}
      <ScreenNavigationEnabled value={false}>{list}</ScreenNavigationEnabled>
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
      <ListDetailSidebarContext value={undefined}>
        {props.children}
      </ListDetailSidebarContext>
    </View>
  );
}
