import type * as React from 'react';
import type { PropsWithChildren, ReactNode } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import {
  contentFill,
  ContentWidthProvider,
  WorkbenchDrawnProvider,
} from '#lib/product/content-layout';
import { FramePane } from '../components/frame-pane/frame-pane';
import { useFrameOffset } from '../hooks/use-frame-offset';
import type { FrameMotion } from '../utils/frame-timing';
import { workbenchDrawn } from './frame-layout';
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

export type ScaffoldPageProps = PropsWithChildren<{ parts: ScaffoldParts }>;

// Only a Frame moves the column aside for its Workbench.
const pageContentShift = ({ layout, framed }: ScaffoldParts): number =>
  framed ? layout.contentShift : 0;

// A hidden overflow still scrolls: the web clips instead, so focus inside the sliding content cannot scroll the page sideways.
const pageClip = `${contentFill} overflow-hidden web:overflow-clip`;

// The column takes its place beside the Workbench at once and slides there as the Workbench shows or hides; a resize moves it at once.
function SlidingContent(
  props: PropsWithChildren<{ shift: number; motion: FrameMotion }>,
): React.JSX.Element {
  const offset = -props.shift;
  const slide = useFrameOffset({ ...props.motion, offset, visible: true });

  return (
    <View className={pageClip}>
      <Animated.View className={contentFill} style={slide}>
        {props.children}
      </Animated.View>
    </View>
  );
}

// Only a framed page has the Workbench beside it; a phone's page has none.
const pageWorkbenchDrawn = ({ layout, framed }: ScaffoldParts): boolean =>
  framed && workbenchDrawn(layout.workbench.state);

function PageContent({
  parts,
  children,
}: ScaffoldPageProps): React.JSX.Element {
  const shift = pageContentShift(parts);

  return (
    <ContentWidthProvider wide={usePageContentWide(parts)} shift={shift}>
      <SlidingContent shift={shift} motion={parts.layout.motion}>
        {children}
      </SlidingContent>
    </ContentWidthProvider>
  );
}

// A page: beside the list on a wide window, the whole window on a compact or medium one; the tree is the same at each, so the page never remounts. Its content draws wide from the column the Frame placed.
export function ScaffoldPage({
  parts,
  children,
}: ScaffoldPageProps): React.JSX.Element {
  return (
    <View className="flex-1 flex-row">
      <FramePane testID="desktop-detail" {...pagePlacement(parts)}>
        <WorkbenchDrawnProvider value={pageWorkbenchDrawn(parts)}>
          <PageContent parts={parts}>{children}</PageContent>
        </WorkbenchDrawnProvider>
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
