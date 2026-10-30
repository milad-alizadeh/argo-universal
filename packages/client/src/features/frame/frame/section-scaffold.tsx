import { useClaimed, type Place } from '@repo/kit/place';
import type { SizeClass } from '@repo/kit/use-size-class/size-class';
import type { ReactNode } from 'react';
import { isCoreSection } from '../../../lib/product/navigation/sections';
import { isFramed } from '../scaffold/is-framed';
import type { ScaffoldProps } from '../scaffold/scaffold';
import type { FrameListDetail } from './frame-list-detail';
import type { FrameSections } from './section-lists';

// The list a Plugin page's ListDetail holds the Frame's sidebar with.
function ClaimedList(props: {
  sidebar: Place<ReactNode>;
  kept?: ReactNode;
}): ReactNode {
  return useClaimed(props.sidebar) ?? props.kept;
}

type SectionScaffold = Pick<ScaffoldProps, 'list'> &
  Partial<Pick<ScaffoldProps, 'sidebarShown' | 'inspectorState'>>;

// What the Frame's shown section is read from: which section, its core lists, and the window it is drawn in.
export type SectionShown = Pick<FrameSections, 'section' | 'lists'> & {
  sizeClass: SizeClass;
};

const noList: SectionScaffold = {
  list: null,
  sidebarShown: false,
  inspectorState: 'closed',
};

// A core section's own list; a Plugin section's only while its page's ListDetail holds the sidebar with its own.
export function sectionScaffold(
  shown: SectionShown,
  listDetail: FrameListDetail,
): SectionScaffold {
  const { section, lists, sizeClass } = shown;

  if (!isCoreSection(section))
    return pluginSectionScaffold(listDetail, isFramed(sizeClass));

  return { list: lists[section].list };
}

// The list's own Screen, claimed with it, draws its heading, as a core section's list does. Only a wide window has a sidebar beside the pages, and only its shown page claims one, so a narrower one draws no list here.
function pluginSectionScaffold(
  { sidebar, held, kept }: FrameListDetail,
  framed: boolean,
): SectionScaffold {
  if (!framed || !held) return noList;

  return {
    list: <ClaimedList sidebar={sidebar} kept={kept} />,
    inspectorState: 'closed',
  };
}
