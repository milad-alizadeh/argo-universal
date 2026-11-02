import type { WireNode } from '@repo/contracts/plugins/wire';
import { createPlace, useClaim, useClaimed } from '@repo/kit/place';
import { ListDetailSidebarPlaceOffer } from '@repo/kit/primitives/scaffolds/list-detail';
import { router, usePathname } from 'expo-router';
import {
  use,
  useMemo,
  useState,
  type PropsWithChildren,
  type ReactNode,
} from 'react';
import { View } from 'react-native';
import {
  FrameListDetailSidebar,
  FrameSectionWithoutList,
} from '#features/frame';
import {
  isCoreSection,
  sectionOf,
} from '../../lib/product/navigation/sections';
import { pageUnavailable } from '../../lib/product/plugin-actions';
import { PluginTree } from '../../lib/product/plugin-registry';
import { pluginPageRoute } from './plugin-page-route';
import {
  SectionPlacesContext,
  useSectionPlaces,
  type SectionPlaces,
  type ShownSectionPage,
} from './plugin-section-places';
import { declaresList, listOnly, withSelectedRow } from './plugin-section-tree';
import {
  usePluginAt,
  usePluginSections,
  type PluginSection,
} from './use-plugin-sections';
import { usePluginView, type PluginView } from './use-plugin-view';

// The list as the section shows it now, its row marked from the pages the section is showing.
function useMarkedList(section: PluginView['root']): PluginView['root'] {
  const pages = useClaimed(useSectionPlaces().shown)?.pages;

  return useMemo(
    () =>
      declaresList(section)
        ? withSelectedRow(listOnly(section), pages ?? [])
        : null,
    [section, pages],
  );
}

// A sidebar tap replaces the section's stack, so no Back shows beside the page it opens; a row into another nav item opens there.
function useOpenFromSidebar(section: PluginSection): (path: string) => void {
  const sections = usePluginSections();
  const { shown } = useSectionPlaces();

  return (path) => {
    const origin = { pluginId: section.pluginId, current: section.id };
    const route = pluginPageRoute(sections, origin, path);

    if (!route) return pageUnavailable(path);

    openRoute(route, section.navId, shown.claims.current());
  };
}

function openRoute(
  route: string[],
  navId: string,
  page: ShownSectionPage | undefined,
): void {
  if (page && route[1] === navId) page.showOnly(route);
  else router.push({ pathname: '/plugins/[...path]', params: { path: route } });
}

const knownWithoutList = (root: PluginView['root']): boolean =>
  Boolean(root) && !declaresList(root);

// The view stays open for as long as the section is the one shown, and the pages beside it reach it through its Place.
function useSectionRootView(section: PluginSection): PluginView {
  const withoutList = use(FrameSectionWithoutList);

  const view = usePluginView({
    pluginId: section.pluginId,
    path: `/${section.navPath.join('/')}`,
  });

  useClaim(useSectionPlaces().root, { section, view });
  useClaim(knownWithoutList(view.root) ? withoutList : undefined, true);

  return view;
}

/*
 * The one live view of a section's root, open while the pages beside it change. Its ListDetail's list goes to the
 * Frame's sidebar, wherever this is drawn. The pane is the section's until the first snapshot says there is no list.
 */
function SectionRootView({ section }: { section: PluginSection }): ReactNode {
  const view = useSectionRootView(section);
  const list = useMarkedList(view.root);

  return list ? (
    <SectionList section={section} view={view} list={list} />
  ) : null;
}

interface SectionListProps {
  section: PluginSection;
  view: PluginView;
  list: WireNode;
}

function SectionList(props: SectionListProps): React.JSX.Element {
  const onOpenPage = useOpenFromSidebar(props.section);

  return (
    <View className="hidden">
      <ListDetailSidebarPlaceOffer value={use(FrameListDetailSidebar)}>
        <PluginTree
          key={props.view.viewId}
          root={props.list}
          onEvent={props.view.dispatch}
          onOpenPage={onOpenPage}
        />
      </ListDetailSidebarPlaceOffer>
    </View>
  );
}

// A path no Plugin answers has no root to ask, so nothing there can say the section has a list. A core section's list is its own.
function SectionWithoutRoot({ path }: { path: string }): null {
  const withoutList = use(FrameSectionWithoutList);

  useClaim(isCoreSection(sectionOf(path)) ? undefined : withoutList, true);

  return null;
}

function ShownSectionRoot(): ReactNode {
  const path = usePathname();
  const { section, loaded } = usePluginAt(path);

  if (section) return <SectionRootView key={section.id} section={section} />;

  return loaded ? <SectionWithoutRoot path={path} /> : null;
}

type PluginSectionListsProps = PropsWithChildren<{
  // Only a wide window has a list beside its pages; below it the root is a page of the stack like any other.
  wide: boolean;
}>;

// The live section list around the Frame's pages; it and the pages reach each other only through these Places.
export function PluginSectionLists({
  wide,
  children,
}: PluginSectionListsProps): React.JSX.Element {
  const [places] = useState<SectionPlaces>(() => ({
    root: createPlace(),
    shown: createPlace(),
  }));

  return (
    <SectionPlacesContext value={places}>
      {wide ? <ShownSectionRoot /> : null}
      {children}
    </SectionPlacesContext>
  );
}
