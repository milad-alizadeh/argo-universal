import { use, type ReactElement, type ReactNode } from 'react';
import { View } from 'react-native';
import { useClaim } from '#lib/generic/claim-store';
import { useWide } from '#lib/generic/use-wide/use-wide';
import {
  PageBesideList,
  PageNavigationEnabled,
} from '#primitives/scaffolds/page';
import type { ListDetailProps } from './list-detail-props';
import {
  ListDetailSidebarContext,
  type ListDetailSidebar,
} from './list-detail-sidebar';

/*
 * Foundations / ListDetail: on a wide window the list sits beside the selected item, in the App's sidebar at a
 * section's root or in a 312 pane of its own; under wide the list is the screen and the item replaces it, as a route
 * pushed over the list does. The caller passes the item the route selects, so a link opens it at any width.
 */
export function ListDetail(props: ListDetailProps): ReactElement {
  const wide = useWide();
  const sidebar = use(ListDetailSidebarContext);

  if (!wide) return <Drilled {...props} />;

  if (sidebar) return <BesideSidebar {...props} sidebar={sidebar} />;

  return <Split {...props} />;
}

function Drilled(props: ListDetailProps): ReactElement {
  return <Pane testID={props.testID}>{props.detail ?? props.list}</Pane>;
}

// The selected item, or the caller's empty state while nothing is selected.
function DetailPane(props: ListDetailProps): ReactElement {
  return (
    <Pane className="min-w-0 flex-1">
      <PageBesideList value>{props.detail ?? props.empty}</PageBesideList>
    </Pane>
  );
}

function Split(props: ListDetailProps): ReactElement {
  return (
    <View testID={props.testID} className="flex-1 flex-row">
      <Pane className="w-frame-list shrink-0">
        {/* The detail's Page names the screen; a list's Page only draws its heading. */}
        <PageNavigationEnabled value={false}>
          {props.list}
        </PageNavigationEnabled>
      </Pane>
      <DetailPane {...props} />
    </View>
  );
}

// The detail fills the page; the list goes to the App's sidebar for as long as this ListDetail is shown.
function BesideSidebar(
  props: ListDetailProps & { sidebar: ListDetailSidebar },
): ReactElement {
  useClaim(props.sidebar, props.list);

  return (
    <View testID={props.testID} className="flex-1">
      <DetailPane {...props} />
    </View>
  );
}

// Each side keeps its own place in the tree and fills it; nested ListDetails split again (SettingsLayout's Projects).
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
