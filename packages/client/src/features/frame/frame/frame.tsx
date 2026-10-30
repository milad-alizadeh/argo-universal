import { InspectorPlaceOffer } from '@repo/kit/primitives/scaffolds/inspector';
import type { SizeClass } from '@repo/kit/use-size-class/size-class';
import type * as React from 'react';
import type { ReactNode } from 'react';
import {
  WindowBandProvider,
  type WindowBandPlaces,
} from '#lib/product/window-band';
import {
  isCoreSection,
  type Section,
} from '../../../lib/product/navigation/sections';
import { FrameRail } from '../components/frame-rail/frame-rail';
import {
  PhoneDrawerContent,
  type PhoneDrawerContentProps,
} from '../components/phone-drawer-content/phone-drawer-content';
import { useSectionBadgeCounts } from '../hooks/use-section-badge-counts';
import {
  ScaffoldFrame,
  ScaffoldPage,
  type ScaffoldParts,
  type ScaffoldProps,
  ScaffoldSidebar,
  useScaffoldParts,
} from '../scaffold/scaffold';
import { LiveConnectionBanner } from './connection-banner';
import {
  type FrameListDetail,
  FrameListDetailOffers,
  useFrameListDetail,
} from './frame-list-detail';
import { type FrameState, useFrameState } from './frame-state';
import { type FrameSections, SectionListsContext } from './section-lists';
import { sectionScaffold } from './section-scaffold';

export { useFrameState } from './frame-state';

export {
  useSectionList,
  type SectionList,
  type SectionLists,
} from './section-lists';

export interface FrameOptions extends FrameSections {
  sizeClass: SizeClass;
}

// What the Frame and its sidebar and pages are drawn from, which the navigator holds and hands to each.
export interface FrameParts extends FrameSections {
  bandPlaces: WindowBandPlaces;
  scaffold: ScaffoldParts;
  // The column the shown page's Inspector draws in on a wide window.
  inspectorPlace: FrameState['inspectorPlace'];
  // The sidebar a Plugin page's ListDetail holds for its list.
  listDetail: FrameListDetail;
}

// The Scaffold's props: the Frame's sidebar and Inspector state around the shown section's list, with the live Connection banner.
function frameScaffold(
  state: FrameState['scaffold'],
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

const sectionsOf = ({
  section,
  lists,
  items,
}: FrameSections): FrameSections => ({
  section,
  lists,
  items,
});

// What the Frame, its sidebar and its pages are drawn from, for the navigator to hand to each.
export function useFrame(options: FrameOptions): FrameParts {
  const { scaffold, inspectorPlace, bandPlaces } = useFrameState();
  const listDetail = useFrameListDetail(options.section);

  return {
    bandPlaces,
    scaffold: useScaffoldParts(frameScaffold(scaffold, options, listDetail)),
    inspectorPlace,
    ...sectionsOf(options),
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
      <InspectorPlaceOffer value={frame.inspectorPlace}>
        <FrameListDetailOffers listDetail={frame.listDetail}>
          <WindowBandProvider places={frame.bandPlaces}>
            <ScaffoldFrame parts={frame.scaffold}>{children}</ScaffoldFrame>
          </WindowBandProvider>
        </FrameListDetailOffers>
      </InspectorPlaceOffer>
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
      {...useSectionBadgeCounts()}
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

// A section's page in the Frame's page pane, which on a narrow window fills it. The navigator gets this and the sidebar's width, so `FrameParts` keeps the Scaffold's parts to itself.
export function FramePage({
  frame,
  children,
}: FramePageProps): React.JSX.Element {
  return <ScaffoldPage parts={frame.scaffold}>{children}</ScaffoldPage>;
}

// The width of the rail and the list, for the permanent drawer that holds them.
export const frameSidebarWidth = (frame: FrameParts): number =>
  frame.scaffold.layout.sidebarWidth;

export type SectionDrawerProps = Omit<
  PhoneDrawerContentProps,
  'attentionCount' | 'pluginBadges'
>;

// A compact window's drawer of sections, with the live attention and Plugin badge counts; the drawing is `PhoneDrawerContent`.
export function SectionDrawer(props: SectionDrawerProps): React.JSX.Element {
  return <PhoneDrawerContent {...props} {...useSectionBadgeCounts()} />;
}

export { useNeedsAttention } from '../hooks/use-section-badge-counts';
