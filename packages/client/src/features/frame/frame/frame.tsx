import type * as React from 'react';
import { createContext, type ReactNode, use } from 'react';
import type { SizeClass } from '#lib/generic/use-size-class/size-class';
import { HeaderButton } from '#lib/product/header-button';
import {
  type InspectorControl,
  InspectorProvider,
} from '#lib/product/inspector';
import type { FirstPage } from '#lib/product/navigation/navigation';
import type { ScreenHeaderProps } from '#lib/product/navigation/screen-header';
import type { Section } from '../../../lib/product/navigation/sections';
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
import { useFrameState } from './frame-state';

export { useFrameState } from './frame-state';

// What a section hands the Frame: its list, and what goes with it.
export interface SectionList {
  // The list's own part of the sidebar's header row.
  header: ReactNode;
  list: ReactNode;
  // The header over the list when the list is the section's root page, as Android's drawer header and the web's JS header draw it.
  rootHeader: ScreenHeaderProps;
  // The root page's own stock header items and search bar (`Stack.Toolbar`, `Stack.SearchBar`), which iOS shows instead of `rootHeader`'s.
  rootToolbar?: ReactNode;
  /*
   * The page a window with the list beside it opens at the section's root, or undefined while
   * it is still being chosen; without one, the root keeps its own page. Called as a hook.
   */
  useFirstPage?: () => FirstPage | undefined;
}

export type SectionLists = Record<Section, SectionList>;

const SectionListsContext = createContext<SectionLists | null>(null);

export function useSectionList(section: Section): SectionList {
  const lists = use(SectionListsContext);

  if (!lists) throw new Error('Render inside a Frame.');

  return lists[section];
}

export interface FrameOptions {
  sizeClass: SizeClass;
  // The section the navigator shows.
  section: Section;
  lists: SectionLists;
}

// What the Frame and its sidebar and pages are drawn from, which the navigator holds and hands to each.
export interface FrameParts {
  scaffold: ScaffoldParts;
  // For a page's header button, such as Changes, to open and close the Inspector.
  inspector: InspectorControl;
  section: Section;
  lists: SectionLists;
}

type FrameScaffoldState = ReturnType<typeof useFrameState>['scaffold'];

// The Scaffold's props: the Frame's sidebar and Inspector state around the shown section's list, with the live Connection banner.
const frameScaffold = (
  state: FrameScaffoldState,
  { sizeClass, section, lists }: FrameOptions,
): ScaffoldProps => ({
  ...state,
  sizeClass,
  sidebar: null,
  listHeader: lists[section].header,
  list: lists[section].list,
  banner: <LiveConnectionBanner />,
});

// What the Frame, its sidebar and its pages are drawn from, for the navigator to hand to each.
export function useFrame(options: FrameOptions): FrameParts {
  const { scaffold, inspector } = useFrameState();

  return {
    scaffold: useScaffoldParts(frameScaffold(scaffold, options)),
    inspector,
    section: options.section,
    lists: options.lists,
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
      <InspectorProvider value={frame.inspector}>
        <ScaffoldFrame parts={frame.scaffold}>{children}</ScaffoldFrame>
      </InspectorProvider>
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

// Whether any Session needs attention, which ☰ marks with a dot or badge on a narrow section root.
export const useNeedsAttention = (): boolean => useAttentionCount() > 0;

interface SectionMenuButtonProps {
  onOpen: () => void;
}

// ☰ at the leading edge of the web's narrow section root header, with a dot while Sessions need attention; native headers declare a stock item instead.
export function SectionMenuButton({
  onOpen,
}: SectionMenuButtonProps): React.JSX.Element {
  return (
    <HeaderButton
      icon="menu"
      accessibilityLabel="Open navigation"
      dot={useNeedsAttention() ? 'attention' : undefined}
      onPress={onOpen}
    />
  );
}
