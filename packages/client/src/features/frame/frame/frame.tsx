import { usePathname } from 'expo-router';
import type * as React from 'react';
import { createContext, type ReactNode, use } from 'react';
import type { SizeClass } from '#lib/generic/use-size-class/size-class';
import { InspectorProvider } from '#lib/product/inspector';
import type { ScreenHeaderProps } from '#lib/product/navigation/screen-header';
import {
  type Section,
  sectionOf,
} from '../../../lib/product/navigation/sections';
import { FrameRail } from '../components/frame-rail/frame-rail';
import {
  PhoneDrawerContent,
  type PhoneDrawerContentProps,
} from '../components/phone-drawer-content/phone-drawer-content';
import { useAttentionCount } from '../hooks/use-attention-count';
import {
  ScaffoldFrame,
  ScaffoldSidebar,
  useScaffoldProps,
} from '../scaffold/scaffold';
import { LiveConnectionBanner } from './connection-banner';
import { type FrameState, useFrameState } from './frame-state';

export { useFrameState } from './frame-state';

// What a section hands the Frame: its list, and what goes with it.
export interface SectionList {
  // The list's own part of the sidebar's header row.
  header: ReactNode;
  list: ReactNode;
  // The header over the list when the list is the section's root page.
  rootHeader: ScreenHeaderProps;
  // The page a window with the list beside it opens at the section's root; without one, the root keeps its own page.
  firstPage?: ReactNode;
}

export type SectionLists = Record<Section, SectionList>;

const SectionListsContext = createContext<SectionLists | null>(null);

export function useSectionList(section: Section): SectionList {
  const lists = use(SectionListsContext);

  if (!lists) throw new Error('Render inside a Frame.');

  return lists[section];
}

export interface FrameProps {
  sizeClass: SizeClass;
  lists: SectionLists;
  // The navigator of sections, which draws `FrameSidebar` and `FramePage` itself.
  children: ReactNode;
}

type FrameScaffoldProps = FrameProps & Pick<FrameState, 'scaffold'>;

// The Scaffold's frame around the navigator, with the shown section's list and the live Connection banner.
function FrameScaffold(props: FrameScaffoldProps): React.JSX.Element {
  const shown = props.lists[sectionOf(usePathname())];

  return (
    <ScaffoldFrame
      {...props.scaffold}
      sizeClass={props.sizeClass}
      listHeader={shown.header}
      list={shown.list}
      banner={<LiveConnectionBanner />}
    >
      {props.children}
    </ScaffoldFrame>
  );
}

// The App's Frame around the navigator of sections, at every Size class: the shown section's list, the live Connection banner, and the sidebar's and the Inspector's state.
export function Frame(props: FrameProps): React.JSX.Element {
  const { scaffold, inspector } = useFrameState();

  return (
    <SectionListsContext value={props.lists}>
      <InspectorProvider value={inspector}>
        <FrameScaffold {...props} scaffold={scaffold} />
      </InspectorProvider>
    </SectionListsContext>
  );
}

export interface FrameSidebarProps {
  // Opens a section through the navigator that holds the sidebar.
  onSectionChange: (section: Section) => void;
}

function LiveRail({ onSectionChange }: FrameSidebarProps): React.JSX.Element {
  const { sidebarShown, onSidebarShownChange } = useScaffoldProps();

  return (
    <FrameRail
      selectedSection={sectionOf(usePathname())}
      attentionCount={useAttentionCount()}
      {...{ sidebarShown, onSidebarShownChange, onSectionChange }}
    />
  );
}

// The rail and the shown section's list, as the permanent drawer of a window with the list beside the pages.
export function FrameSidebar(props: FrameSidebarProps): React.JSX.Element {
  return <ScaffoldSidebar sidebar={<LiveRail {...props} />} />;
}

export {
  ScaffoldPage as FramePage,
  useScaffoldSidebarWidth as useFrameSidebarWidth,
} from '../scaffold/scaffold';

export type SectionDrawerProps = Omit<
  PhoneDrawerContentProps,
  'attentionCount'
>;

// A compact window's drawer of sections, with the live attention count; the drawing is `PhoneDrawerContent`.
export function SectionDrawer(props: SectionDrawerProps): React.JSX.Element {
  return <PhoneDrawerContent {...props} attentionCount={useAttentionCount()} />;
}
