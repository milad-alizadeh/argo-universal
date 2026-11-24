import {
  isCoreSection,
  isPage,
  NativeSidebarListPlace,
  sectionOf,
  sectionOrder,
  sections,
  type Section,
  type FrameSections,
  type PluginSection,
} from '@repo/client';
import {
  NativePluginSidebar,
  NativeSidebarHeader,
  type SidebarHeaderProps,
} from '@repo/kit/native-sidebar';
import { createPlace, useClaimed, type Place } from '@repo/kit/place';
import {
  InspectorPane,
  NativeInspectorPlace,
  type InspectorProps,
} from '@repo/kit/primitives/scaffolds/inspector';
import { ScreenListColumn } from '@repo/kit/primitives/scaffolds/screen';
import {
  useRouter,
  useSegments,
  useUnstableGlobalHref,
  type Href,
} from 'expo-router';
import { SplitView } from 'expo-router/unstable-split-view';
import { useEffect, useRef, useState, type JSX, type ReactNode } from 'react';
import { SafeAreaView } from 'react-native-screens/experimental';
import {
  FramePresentationContext,
  useFramePresentation,
} from './frame-presentation';
import { IPadSidebarHeader } from './ipad-sidebar-header';
import { splitSectionHref } from './ipad-split-view';

type SplitCommands = NonNullable<React.ComponentRef<typeof SplitView>>;

const coreIcons = {
  sessions: 'bubble.left.and.bubble.right',
  scheduled: 'clock',
  settings: 'gearshape',
} as const;

const coreChoices = sectionOrder.map((id) => ({
  id,
  title: sections[id].title,
  icon: coreIcons[id],
  href: `/${id}` satisfies Href,
}));

interface SectionPickerProps {
  section: Section;
  plugins: readonly PluginSection[];
  lastPages: React.RefObject<Map<string, Href>>;
  chrome?: SidebarHeaderProps;
}

function SectionPicker({
  section,
  plugins,
  lastPages,
  chrome,
}: SectionPickerProps): JSX.Element {
  const router = useRouter();

  const items = [
    ...coreChoices,
    ...plugins.map((plugin) => ({
      ...plugin,
      href: plugin.rootPath,
      icon: 'puzzlepiece.extension' as const,
    })),
  ];

  const pick = (next: string): void => {
    const href = splitSectionHref(section, next, {
      choices: items,
      lastPages: lastPages.current,
    });

    if (href) router.navigate(href);
  };

  return (
    <IPadSidebarHeader
      {...chrome}
      section={section}
      choices={items}
      coreCount={coreChoices.length}
      onPick={pick}
    />
  );
}

// Remember the router's own visible URL, including any query, for each section.
function useSectionPages(
  section: Section,
  inFrame: boolean,
): React.RefObject<Map<string, Href>> {
  const lastPages = useRef(new Map<string, Href>());
  const href = useUnstableGlobalHref();

  useEffect(() => {
    if (inFrame && sectionOf(href.split('?')[0]) === section)
      lastPages.current.set(section, href);
  }, [href, section, inFrame]);

  return lastPages;
}

interface SidebarColumnProps extends SectionPickerProps {
  lists: FrameSections['lists'];
  listPlace: Place<ReactNode>;
}

function SidebarColumn({
  listPlace,
  lists,
  ...picker
}: SidebarColumnProps): JSX.Element {
  const pluginList = useClaimed(listPlace);
  const { section } = picker;
  const list = isCoreSection(section) ? lists[section].list : pluginList;

  const header = (chrome: SidebarHeaderProps): JSX.Element => (
    <SectionPicker {...picker} chrome={chrome} />
  );

  return (
    <SafeAreaView edges={{ left: true, top: true }} style={{ flex: 1 }}>
      <NativeSidebarHeader value={header}>
        {section !== 'sessions' && section !== 'scheduled' && (
          <SectionPicker {...picker} />
        )}
        {list && (
          <ScreenListColumn>
            <NativePluginSidebar value={!isCoreSection(section)}>
              {list}
            </NativePluginSidebar>
          </ScreenListColumn>
        )}
      </NativeSidebarHeader>
    </SafeAreaView>
  );
}

function SplitViewWithInspector({
  place,
  listPlace,
}: {
  listPlace: Place<ReactNode>;
  place: Place<InspectorProps>;
}): JSX.Element {
  const inspector = useClaimed(place);
  const presentation = useFramePresentation();
  const { frame, plugins } = presentation;
  const segments: readonly string[] = useSegments();
  const inFrame = segments.includes('(frame)');
  const detail = useSplitDetail(presentation.path, inFrame, frame.section);
  const lastPages = useSectionPages(frame.section, inFrame);

  return (
    <FramePresentationContext value={presentation}>
      <SplitView
        {...detail}
        presentsWithGesture={inFrame}
        displayModeButtonVisibility={inFrame ? 'automatic' : 'never'}
        topColumnForCollapsing={inFrame ? undefined : 'secondary'}
        showInspector={inFrame && inspector?.open === true}
        onInspectorHide={() => inspector?.onOpenChange(false)}
        preferredSplitBehavior="tile"
        columnMetrics={{
          preferredPrimaryColumnWidthOrFraction: 356,
          preferredInspectorColumnWidthOrFraction: 360,
        }}
        preferredDisplayMode={inFrame ? 'automatic' : 'secondaryOnly'}
      >
        <SplitView.Column>
          {inFrame && (
            <SidebarColumn
              listPlace={listPlace}
              lists={frame.lists}
              section={frame.section}
              plugins={plugins}
              lastPages={lastPages}
            />
          )}
        </SplitView.Column>
        <SplitView.Inspector>
          <SafeAreaView edges={{ top: true, right: true }} style={{ flex: 1 }}>
            {inspector && <InspectorPane {...inspector} />}
          </SafeAreaView>
        </SplitView.Inspector>
      </SplitView>
    </FramePresentationContext>
  );
}

// A collapsed split keeps its sidebar for core lists. Page links bring its detail forward.
function useSplitDetail(
  path: string,
  inFrame: boolean,
  section: Section,
): Pick<
  React.ComponentProps<typeof SplitView>,
  'ref' | 'onCollapse' | 'onExpand'
> {
  const ref = useRef<SplitCommands>(null);
  const collapsed = useRef(false);

  useEffect(() => {
    if (
      collapsed.current &&
      (!inFrame || isPage(path) || !isCoreSection(section))
    )
      ref.current?.show('secondary');
  }, [path, inFrame, section]);

  return {
    ref,
    onCollapse: () => {
      collapsed.current = true;
    },
    onExpand: () => {
      collapsed.current = false;
    },
  };
}

export function SplitViewRoot(): JSX.Element {
  const [place] = useState(() => createPlace<InspectorProps>());

  const [listPlace] = useState(() => createPlace<ReactNode>());

  return (
    <NativeInspectorPlace value={place}>
      <NativeSidebarListPlace value={listPlace}>
        <SplitViewWithInspector place={place} listPlace={listPlace} />
      </NativeSidebarListPlace>
    </NativeInspectorPlace>
  );
}
