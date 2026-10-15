import type * as React from 'react';
import type { PropsWithChildren, ReactNode } from 'react';
import { View } from 'react-native';
import { ContentLayout } from '#lib/product/content-layout';
import { FramePane } from '../components/frame-pane/frame-pane';
import {
  isFramed,
  type PanePlacement,
  ScaffoldFrame,
  type ScaffoldParts,
  useScaffoldParts,
} from './scaffold-frame';
import { ScaffoldSidebarColumn } from './scaffold-sidebar';
import type { ScaffoldProps } from './use-scaffold-layout';

export type { InspectorState } from './scaffold-geometry';

export type { ScaffoldProps } from './use-scaffold-layout';

export {
  ScaffoldFrame,
  useScaffoldProps,
  useScaffoldSidebarWidth,
} from './scaffold-frame';

const pagePlacement = ({ layout, framed }: ScaffoldParts): PanePlacement =>
  framed
    ? {
        offset: layout.shownListWidth,
        width: layout.detailWidth,
        hidden: layout.inspectorExpanded,
        ...layout.motion,
      }
    : { ...layout.motion, offset: 0, width: layout.width, hidden: false };

interface SidebarSlot {
  sidebar: ReactNode;
}

// The glass panel of the sidebar Slot and the list, sized by its content.
function SidebarColumn({ sidebar }: SidebarSlot): React.JSX.Element {
  const { scaffold, layout } = useScaffoldParts();

  return (
    <ScaffoldSidebarColumn
      sidebar={sidebar}
      scaffold={scaffold}
      layout={layout}
    />
  );
}

// The same panel, filling the drawer that holds it: the drawer stacks its content in a column.
export function ScaffoldSidebar({ sidebar }: SidebarSlot): React.JSX.Element {
  return (
    <View className="flex-1 flex-row">
      <SidebarColumn sidebar={sidebar} />
    </View>
  );
}

function PagePane({ children }: PropsWithChildren): React.JSX.Element {
  const parts = useScaffoldParts();

  return (
    <FramePane testID="desktop-detail" {...pagePlacement(parts)}>
      <ContentLayout className="overflow-hidden" measured={parts.framed}>
        {children}
      </ContentLayout>
    </FramePane>
  );
}

// A page: beside the list on a medium or wide window, the whole window on a compact one; the tree is the same at each, so the page never remounts.
export function ScaffoldPage({
  children,
}: PropsWithChildren): React.JSX.Element {
  return (
    <View className="flex-1 flex-row">
      <PagePane>{children}</PagePane>
    </View>
  );
}

// A compact window drills in: with no page open, the list is the page.
const shownPage = (
  framed: boolean,
  { page, list }: ScaffoldProps,
): ReactNode => (framed ? page : (page ?? list));

/*
 * Places a screen's panes for its Size class, from props only: on a compact window the page
 * drills in over the list; on a medium one the sidebar and the list sit beside the page; on a
 * wide one the Inspector gets its own column too, with resize handles between the panes.
 */
export function Scaffold(props: ScaffoldProps): React.JSX.Element {
  const framed = isFramed(props.sizeClass);

  return (
    <ScaffoldFrame {...props}>
      <View className="flex-1 flex-row">
        {framed ? <SidebarColumn sidebar={props.sidebar} /> : null}
        <ScaffoldPage>{shownPage(framed, props)}</ScaffoldPage>
      </View>
    </ScaffoldFrame>
  );
}
