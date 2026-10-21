import type { InspectorHost } from '@repo/kit/primitives/scaffolds/inspector';
import type { SizeClass } from '@repo/kit/use-size-class/size-class';
import type * as React from 'react';
import type { ReactNode } from 'react';
import {
  WindowBandHostContext,
  type WindowBandHost,
} from '#lib/product/window-band';
import {
  isCoreSection,
  type Section,
  type NavigationSection,
} from '../../../lib/product/navigation/sections';
import { FrameRail } from '../components/frame-rail/frame-rail';
import {
  PhoneDrawerContent,
  type PhoneDrawerContentProps,
} from '../components/phone-drawer-content/phone-drawer-content';
import { useAttentionCount } from '../hooks/use-attention-count';
import {
  ScaffoldFrame,
  ScaffoldPage,
  type ScaffoldParts,
  type ScaffoldProps,
  ScaffoldSidebar,
  scaffoldSidebarWidth,
  useScaffoldParts,
} from '../scaffold/scaffold';
import { LiveConnectionBanner } from './connection-banner';
import { FrameInspectorHost } from './frame-inspector';
import {
  type FrameListDetail,
  FrameListDetailSidebar,
  sectionScaffold,
  useFrameListDetail,
} from './frame-list-detail';
import { useFrameState } from './frame-state';
import { SectionListsContext, type SectionLists } from './section-lists';

export { useFrameState } from './frame-state';

export {
  useSectionList,
  type SectionList,
  type SectionLists,
} from './section-lists';

export interface FrameOptions {
  sizeClass: SizeClass;
  // The section the navigator shows.
  section: Section;
  lists: SectionLists;
  items: readonly NavigationSection[];
}

// What the Frame and its sidebar and pages are drawn from, which the navigator holds and hands to each.
export interface FrameParts {
  bandHost: WindowBandHost;
  scaffold: ScaffoldParts;
  // The column the shown page's Inspector draws in on a wide window.
  inspectorHost: InspectorHost;
  section: Section;
  lists: SectionLists;
  items: readonly NavigationSection[];
  // The sidebar a Plugin page's ListDetail holds for its list.
  listDetail: FrameListDetail;
}

type FrameScaffoldState = ReturnType<typeof useFrameState>['scaffold'];

// The Scaffold's props: the Frame's sidebar and Inspector state around the shown section's list, with the live Connection banner.
function frameScaffold(
  state: FrameScaffoldState,
  options: FrameOptions,
  listDetail: FrameListDetail,
): ScaffoldProps {
  return {
    ...state,
    ...sectionScaffold(options, listDetail),
    sizeClass: options.sizeClass,
    sidebar: null,
    banner: <LiveConnectionBanner />,
  };
}

// What the Frame, its sidebar and its pages are drawn from, for the navigator to hand to each.
export function useFrame(options: FrameOptions): FrameParts {
  const { scaffold, inspectorHost, bandHost } = useFrameState();
  const listDetail = useFrameListDetail();

  return {
    bandHost,
    scaffold: useScaffoldParts(frameScaffold(scaffold, options, listDetail)),
    inspectorHost,
    section: options.section,
    lists: options.lists,
    items: options.items,
    listDetail,
  };
}

export interface FrameProps {
  frame: FrameParts;
  // The navigator of sections, which draws `FrameSidebar` and `FramePage` itself.
  children: ReactNode;
}

// The App's Frame around the navigator of sections, at every Size class.
export function Frame({ frame, children }: FrameProps): React.JSX.Element {
  return (
    <SectionListsContext value={frame.lists}>
      <FrameInspectorHost value={frame.inspectorHost}>
        <FrameListDetailSidebar value={frame.listDetail.sidebar}>
          <WindowBandHostContext value={frame.bandHost}>
            <ScaffoldFrame parts={frame.scaffold}>{children}</ScaffoldFrame>
          </WindowBandHostContext>
        </FrameListDetailSidebar>
      </FrameInspectorHost>
    </SectionListsContext>
  );
}

export interface FrameSidebarProps {
  frame: FrameParts;
  // Opens a section through the navigator that holds the sidebar.
  onSectionChange: (section: Section) => void;
}

function LiveRail({
  frame,
  onSectionChange,
}: FrameSidebarProps): React.JSX.Element {
  const { sidebarShown, onSidebarShownChange } = frame.scaffold.scaffold;

  return (
    <FrameRail
      selectedSection={frame.section}
      items={frame.items}
      hasSidebar={isCoreSection(frame.section) || frame.listDetail.held}
      attentionCount={useAttentionCount()}
      {...{ sidebarShown, onSidebarShownChange, onSectionChange }}
    />
  );
}

// The rail and the shown section's list, as the permanent drawer of a window with the list beside the pages.
export function FrameSidebar(props: FrameSidebarProps): React.JSX.Element {
  return (
    <ScaffoldSidebar
      parts={props.frame.scaffold}
      sidebar={<LiveRail {...props} />}
    />
  );
}

export interface FramePageProps {
  frame: FrameParts;
  children: ReactNode;
}

// A section's page in the Frame's page pane, which on a narrow window fills it.
export function FramePage({
  frame,
  children,
}: FramePageProps): React.JSX.Element {
  return <ScaffoldPage parts={frame.scaffold}>{children}</ScaffoldPage>;
}

// The width of the rail and the list, for the permanent drawer that holds them.
export const frameSidebarWidth = (frame: FrameParts): number =>
  scaffoldSidebarWidth(frame.scaffold);

export type SectionDrawerProps = Omit<
  PhoneDrawerContentProps,
  'attentionCount'
>;

// A compact window's drawer of sections, with the live attention count; the drawing is `PhoneDrawerContent`.
export function SectionDrawer(props: SectionDrawerProps): React.JSX.Element {
  return <PhoneDrawerContent {...props} attentionCount={useAttentionCount()} />;
}

export { SectionMenuButton, useNeedsAttention } from './section-menu-button';
