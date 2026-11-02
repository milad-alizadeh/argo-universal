import { createPlace, useClaim, useClaimed, type Place } from '@repo/kit/place';
import { ListDetailSidebarPlaceOffer } from '@repo/kit/primitives/scaffolds/list-detail';
import { useWide } from '@repo/kit/use-wide/use-wide';
import { router, usePathname } from 'expo-router';
import {
  createContext,
  use,
  useMemo,
  useState,
  type PropsWithChildren,
  type ReactNode,
} from 'react';
import { View } from 'react-native';
import { FrameListDetailSidebar } from '#features/frame';
import { pageUnavailable } from '../../lib/product/plugin-actions';
import { PluginTree } from '../../lib/product/plugin-registry';
import { pluginPageRoute } from './plugin-page-route';
import { declaresList, listOnly, withSelectedRow } from './plugin-section-tree';
import {
  usePluginAt,
  usePluginSections,
  type PluginSection,
} from './use-plugin-sections';
import { usePluginView, type PluginView } from './use-plugin-view';

// What the shown page tells its section's list: the section's stack, shown page first, and how to make one page the whole of it.
export interface ShownSectionPage {
  pages: readonly string[];
  showOnly: (route: readonly string[]) => void;
}

// The live root view, for the root's own page to draw instead of opening a second view of the same path.
export interface SectionRoot {
  section: PluginSection;
  view: PluginView;
}

interface SectionPlaces {
  root: Place<SectionRoot>;
  shown: Place<ShownSectionPage>;
}

const SectionPlacesContext = createContext<SectionPlaces | undefined>(
  undefined,
);

function useSectionPlaces(): SectionPlaces {
  const places = use(SectionPlacesContext);

  if (!places) throw new Error('A Plugin page sits outside PluginSectionLists');

  return places;
}

export const useShownPagePlace = (): Place<ShownSectionPage> =>
  useSectionPlaces().shown;

// The section's live root view, while that section is the one a wide window shows.
export function useSectionRoot(section: PluginSection): PluginView | undefined {
  const shown = useClaimed(useSectionPlaces().root);

  return shown?.section.id === section.id ? shown.view : undefined;
}

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

    const page = shown.claims.current();

    if (page && route[1] === section.navId) page.showOnly(route);
    else
      router.push({ pathname: '/plugins/[...path]', params: { path: route } });
  };
}

/*
 * The one live view of a section's root, open while the pages beside it change. Its ListDetail's list goes to the
 * Frame's sidebar, wherever this is drawn. The sidebar is held from the start, so its pane stays while the first
 * snapshot says whether there is a list at all, and while the ListDetail's own claim waits to know its page's focus.
 */
function SectionRootView({ section }: { section: PluginSection }): ReactNode {
  const sidebar = use(FrameListDetailSidebar);
  const view = usePluginView({
    pluginId: section.pluginId,
    path: `/${section.navPath.join('/')}`,
  });

  useClaim(useSectionPlaces().root, { section, view });
  useClaim(view.root && !declaresList(view.root) ? undefined : sidebar, null);

  const list = useMarkedList(view.root);
  const onOpenPage = useOpenFromSidebar(section);

  if (!list) return null;

  return (
    <View className="hidden">
      <ListDetailSidebarPlaceOffer value={sidebar}>
        <PluginTree
          key={view.viewId}
          root={list}
          onEvent={view.dispatch}
          onOpenPage={onOpenPage}
        />
      </ListDetailSidebarPlaceOffer>
    </View>
  );
}

// Only a wide window has a list beside its pages; below it the root is a page of the stack like any other.
function ShownSectionRoot(): ReactNode {
  const { section } = usePluginAt(usePathname());

  if (!useWide() || !section) return null;

  return <SectionRootView key={section.id} section={section} />;
}

// The live section list around the Frame's pages; it and the pages reach each other only through these Places.
export function PluginSectionLists({
  children,
}: PropsWithChildren): React.JSX.Element {
  const [places] = useState<SectionPlaces>(() => ({
    root: createPlace(),
    shown: createPlace(),
  }));

  return (
    <SectionPlacesContext value={places}>
      <ShownSectionRoot />
      {children}
    </SectionPlacesContext>
  );
}
