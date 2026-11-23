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
import { createPlace, useClaimed, type Place } from '@repo/kit/place';
import { Menu } from '@repo/kit/primitives/overlays/menu';
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
import { splitSectionHref } from './ipad-split-view';

type SplitCommands = NonNullable<React.ComponentRef<typeof SplitView>>;

const coreChoices = sectionOrder.map((id) => ({
  id,
  title: sections[id].title,
  href: `/${id}` satisfies Href,
}));

interface SectionPickerProps {
  section: Section;
  plugins: readonly PluginSection[];
  lastPages: React.RefObject<Map<string, Href>>;
}

function SectionPicker({
  section,
  plugins,
  lastPages,
}: SectionPickerProps): JSX.Element {
  const router = useRouter();

  const items = [
    ...coreChoices,
    ...plugins.map((plugin) => ({ ...plugin, href: plugin.rootPath })),
  ];

  const pick = (next: string): void => {
    const href = splitSectionHref(section, next, {
      choices: items,
      lastPages: lastPages.current,
    });

    if (href) router.navigate(href);
  };

  return (
    <Menu
      trigger="Sections"
      accessibilityLabel="Choose section"
      value={section}
      options={items.map(({ id, title }) => ({ value: id, label: title }))}
      onValueChange={pick}
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

  return (
    <SafeAreaView edges={{ left: true, top: true }} style={{ flex: 1 }}>
      <SectionPicker {...picker} />
      {list && <ScreenListColumn>{list}</ScreenListColumn>}
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
