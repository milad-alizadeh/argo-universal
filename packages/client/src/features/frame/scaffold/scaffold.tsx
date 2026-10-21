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
  type ScaffoldParts,
  scaffoldSidebarWidth,
  useScaffoldParts,
} from './scaffold-frame';

const pagePlacement = ({ layout, framed }: ScaffoldParts): PanePlacement =>
  framed
    ? {
        offset: layout.frame.page.offset,
        width: layout.detailWidth,
        hidden: layout.inspectorExpanded,
        ...layout.motion,
      }
    : { ...layout.motion, offset: 0, width: layout.width, hidden: false };

export interface ScaffoldSidebarProps {
  parts: ScaffoldParts;
  // The sidebar Slot, which the caller may draw apart from the Scaffold's props.
  sidebar: ReactNode;
}

// The glass panel of the sidebar Slot and the list, sized by its content.
function SidebarColumn({
  parts,
  sidebar,
}: ScaffoldSidebarProps): React.JSX.Element {
  return (
    <ScaffoldSidebarColumn
      sidebar={sidebar}
      scaffold={parts.scaffold}
      layout={parts.layout}
    />
  );
}

// The same panel, filling the drawer that holds it: the drawer stacks its content in a column.
export function ScaffoldSidebar(
  props: ScaffoldSidebarProps,
): React.JSX.Element {
  return (
    <View className="flex-1 flex-row">
      <SidebarColumn {...props} />
    </View>
  );
}

export type ScaffoldPageProps = PropsWithChildren<{ parts: ScaffoldParts }>;

// A page: beside the list on a wide window, the whole window on a compact or medium one; the tree is the same at each, so the page never remounts.
export function ScaffoldPage({
  parts,
  children,
}: ScaffoldPageProps): React.JSX.Element {
  return (
    <View className="flex-1 flex-row">
      <FramePane testID="desktop-detail" {...pagePlacement(parts)}>
        <ContentLayout className="overflow-hidden" measured={parts.framed}>
          {children}
        </ContentLayout>
      </FramePane>
    </View>
  );
}

// The phone shell drills in: with no page open, the list is the page.
const shownPage = (
  framed: boolean,
  { page, list }: ScaffoldProps,
): ReactNode => (framed ? page : (page ?? list));

/*
 * Places a screen's panes for its Size class, from props only: on a compact or medium window the
 * page drills in over the list, with the Inspector as a sheet; on a wide one the sidebar and the
 * list sit beside the page, the Inspector gets its own column, and resize handles sit between the panes.
 */
export function Scaffold(props: ScaffoldProps): React.JSX.Element {
  const parts = useScaffoldParts(props);
  const framed = isFramed(props.sizeClass);

  return (
    <ScaffoldFrame parts={parts}>
      <View className="flex-1 flex-row">
        {framed ? (
          <SidebarColumn parts={parts} sidebar={props.sidebar} />
        ) : null}
        <ScaffoldPage parts={parts}>{shownPage(framed, props)}</ScaffoldPage>
      </View>
    </ScaffoldFrame>
  );
}
