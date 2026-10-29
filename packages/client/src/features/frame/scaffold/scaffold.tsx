import type * as React from 'react';
import type { PropsWithChildren, ReactNode } from 'react';
import { View, type ViewProps } from 'react-native';
import { contentFill, ContentWidthProvider } from '#lib/product/content-layout';
import { FramePane } from '../components/frame-pane/frame-pane';
import {
  type PanePlacement,
  ScaffoldFrame,
  type ScaffoldParts,
  useScaffoldParts,
} from './scaffold-frame';
import type { ScaffoldProps } from './scaffold-props';
import { ScaffoldSidebarColumn } from './scaffold-sidebar';
import { usePageContentWide } from './use-page-content-wide';

export type { InspectorState, WorkbenchIntent } from './frame-layout';

export type { ScaffoldProps } from './scaffold-props';

export {
  ScaffoldFrame,
  type ScaffoldParts,
  useScaffoldParts,
} from './scaffold-frame';

const pagePlacement = ({ layout, framed }: ScaffoldParts): PanePlacement =>
  framed
    ? { ...layout.page, ...layout.motion }
    : { ...layout.motion, offset: 0, width: layout.width, hidden: false };

export interface ScaffoldSidebarProps {
  parts: ScaffoldParts;
  // The sidebar Slot, which the caller may draw apart from the Scaffold's props.
  sidebar: ReactNode;
}

// The same panel, filling the drawer that holds it: the drawer stacks its content in a column.
export function ScaffoldSidebar({
  parts,
  sidebar,
}: ScaffoldSidebarProps): React.JSX.Element {
  return (
    <View className="flex-1 flex-row">
      <ScaffoldSidebarColumn
        sidebar={sidebar}
        list={parts.scaffold.list}
        layout={parts.layout}
      />
    </View>
  );
}

// Replacing the primary view hides it immediately, before pane motion can cross the cards.
function pageViewport({ framed, layout }: ScaffoldParts): ViewProps {
  const hidden = framed && layout.workbench.state === 'dedicated';

  return { className: 'flex-1 flex-row', style: { opacity: Number(!hidden) } };
}

export type ScaffoldPageProps = PropsWithChildren<{ parts: ScaffoldParts }>;

// A page: beside the list on a wide window, the whole window on a compact or medium one; the tree is the same at each, so the page never remounts. Its content draws wide from the column the Frame placed.
export function ScaffoldPage({
  parts,
  children,
}: ScaffoldPageProps): React.JSX.Element {
  const contentWide = usePageContentWide(parts);

  return (
    <View {...pageViewport(parts)}>
      <FramePane testID="desktop-detail" {...pagePlacement(parts)}>
        <ContentWidthProvider wide={contentWide}>
          <View className={`${contentFill} overflow-hidden`}>{children}</View>
        </ContentWidthProvider>
      </FramePane>
    </View>
  );
}

// The phone shell drills in: with no page open, the list is the page.
const shownPage = (
  framed: boolean,
  { page, list }: ScaffoldProps,
): ReactNode => (framed ? page : (page ?? list));

// The sidebar's glass beside the page, on a framed window only.
const sidebarColumn = (
  { framed, layout }: ScaffoldParts,
  { sidebar, list }: ScaffoldProps,
): ReactNode =>
  framed ? (
    <ScaffoldSidebarColumn sidebar={sidebar} list={list} layout={layout} />
  ) : null;

/*
 * Places a screen's panes for its Size class, from props only: on a compact or medium window the
 * page drills in over the list, with the Inspector as a sheet; on a wide one the sidebar and the
 * list sit beside the page, the Inspector gets its own column, and resize handles sit between the panes.
 */
export function Scaffold(props: ScaffoldProps): React.JSX.Element {
  const parts = useScaffoldParts(props);

  return (
    <ScaffoldFrame parts={parts}>
      <View className="flex-1 flex-row">
        {sidebarColumn(parts, props)}
        <ScaffoldPage parts={parts}>
          {shownPage(parts.framed, props)}
        </ScaffoldPage>
      </View>
    </ScaffoldFrame>
  );
}
