import type { SizeClass } from '@repo/kit/use-size-class/size-class';
import type * as React from 'react';
import type { ReactNode } from 'react';
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
  type ScaffoldProps,
  ScaffoldSidebar,
  useScaffoldParts,
} from '../scaffold/scaffold';
import { LiveConnectionBanner } from './connection-banner';
import { type FrameListDetail, useFrameListDetail } from './frame-list-detail';
import { FrameOffers, type FrameParts, useFrameParts } from './frame-offers';
import { type FrameState, useFrameState } from './frame-state';
import type { FrameSections } from './section-lists';
import { sectionScaffold } from './section-scaffold';

export { useFrameState } from './frame-state';

export { useFrameSidebarWidth } from './frame-offers';

export {
  useSectionList,
  type FrameSections,
  type SectionList,
  type SectionLists,
} from './section-lists';

interface FrameOptions extends FrameSections {
  sizeClass: SizeClass;
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

// What the Frame, its sidebar and its pages are drawn from.
function useFrame(options: FrameOptions): FrameParts {
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

export interface FrameProps extends FrameOptions {
  // The navigator of sections, which draws `FrameSidebar` and `FramePage` itself.
  children: ReactNode;
}

// The App's Frame around the navigator of sections, at every Size class.
export function Frame({ children, ...options }: FrameProps): React.JSX.Element {
  const frame = useFrame(options);

  return (
    <FrameOffers frame={frame}>
      <ScaffoldFrame parts={frame.scaffold}>{children}</ScaffoldFrame>
    </FrameOffers>
  );
}

export interface FrameSidebarProps {
  // Opens a section through the navigator that holds the sidebar.
  onSectionChange: (section: Section) => void;
}

function LiveRail({ onSectionChange }: FrameSidebarProps): React.JSX.Element {
  const frame = useFrameParts();
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
      parts={useFrameParts().scaffold}
      sidebar={<LiveRail {...props} />}
    />
  );
}

export interface FramePageProps {
  children: ReactNode;
}

// A section's page in the Frame's page pane, which on a narrow window fills it.
export function FramePage({ children }: FramePageProps): React.JSX.Element {
  return (
    <ScaffoldPage parts={useFrameParts().scaffold}>{children}</ScaffoldPage>
  );
}

export type SectionDrawerProps = Omit<
  PhoneDrawerContentProps,
  'attentionCount' | 'pluginBadges'
>;

// A compact window's drawer of sections, with the live attention and Plugin badge counts; the drawing is `PhoneDrawerContent`.
export function SectionDrawer(props: SectionDrawerProps): React.JSX.Element {
  return <PhoneDrawerContent {...props} {...useSectionBadgeCounts()} />;
}

export { useNeedsAttention } from '../hooks/use-section-badge-counts';
