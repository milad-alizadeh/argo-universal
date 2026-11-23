import {
  coreNavigationSections,
  isCoreSection,
  sectionOf,
  sections,
  usePluginSections,
  useSectionLists,
  type CoreSection,
  type FrameSections,
  type PluginSection,
  type SizeClass,
} from '@repo/client';
import { useSizeClass } from '@repo/client/size-class';
import { usePathname, useSegments } from 'expo-router';
import { createContext, useState } from 'react';

export interface ModalSection {
  title: string;
  list: React.ReactNode;
  backdropRoute: string;
}

export function modalSectionOf(
  name: string | undefined,
): CoreSection | undefined {
  return isCoreSection(name) && sections[name].widePresentation === 'modal'
    ? name
    : undefined;
}

interface Location {
  path: string;
  route: string;
}

const firstLocation: Location = { path: '/sessions', route: 'sessions' };

function useBackdrop(location: Location, showingModal: boolean): Location {
  const [lastPage, remember] = useState(firstLocation);

  if (!showingModal && lastPage.path !== location.path) remember(location);

  return lastPage;
}

export interface FramePresentation {
  frame: FrameSections;
  focused: string | undefined;
  path: string;
  modal: ModalSection | undefined;
  plugins: readonly PluginSection[];
  sizeClass: SizeClass;
}

export const FramePresentationContext = createContext<FramePresentation | null>(
  null,
);

// Both the native sidebar and the routed Frame draw from the same lists and Settings backdrop.
export function useFramePresentation(): FramePresentation {
  const sizeClass = useSizeClass();
  const plugins = usePluginSections();

  const { path, focused } = useFrameLocation();
  const section = sectionOf(path);
  const modalSection = modalSectionOf(section);

  const backdrop = useBackdrop(
    { path, route: focused ?? firstLocation.route },
    Boolean(modalSection),
  );

  const shown = sizeClass === 'wide' ? modalSection : undefined;
  const lists = useSectionLists(shown ? backdrop.path : undefined);

  return {
    sizeClass,
    plugins,
    frame: {
      section: shown ? sectionOf(backdrop.path) : section,
      lists,
      items: [...coreNavigationSections, ...plugins],
    },
    focused,
    path,
    modal: shown && {
      title: sections[shown].title,
      list: lists[shown].list,
      backdropRoute: backdrop.route,
    },
  };
}

function useFrameLocation(): Pick<FramePresentation, 'path' | 'focused'> {
  const path = usePathname();
  const segments: readonly string[] = useSegments();
  const focused = segments[segments.indexOf('(frame)') + 1];

  return { path, focused };
}
