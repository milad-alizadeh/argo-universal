import { InspectorPlaceOffer } from '@repo/kit/primitives/scaffolds/inspector';
import type * as React from 'react';
import { createContext, use, type ReactNode } from 'react';
import {
  WindowBandProvider,
  type WindowBandPlaces,
} from '#lib/product/window-band';
import type { ScaffoldParts } from '../scaffold/scaffold';
import {
  type FrameListDetail,
  FrameListDetailOffers,
} from './frame-list-detail';
import type { FrameState } from './frame-state';
import { type FrameSections, SectionListsContext } from './section-lists';

// What the Frame and its sidebar and pages are drawn from.
export interface FrameParts extends FrameSections {
  bandPlaces: WindowBandPlaces;
  scaffold: ScaffoldParts;
  // The column the shown page's Inspector draws in on a wide window.
  inspectorPlace: FrameState['inspectorPlace'];
  // The sidebar a Plugin page's ListDetail holds for its list.
  listDetail: FrameListDetail;
}

/*
 * The Frame's parts reach its sidebar and its pages through context, not through the navigator: a page's claim redraws
 * the Frame on each of its renders, and a navigator handed the parts would redraw every section's pages with it.
 */
const FramePartsContext = createContext<FrameParts | null>(null);

// Apart from the parts, so the navigator that sizes its drawer redraws only when the width changes.
const FrameSidebarWidthContext = createContext(0);

export function useFrameParts(): FrameParts {
  const frame = use(FramePartsContext);

  if (!frame) throw new Error('Render inside a Frame.');

  return frame;
}

// The width of the rail and the list, for the permanent drawer that holds them.
export const useFrameSidebarWidth = (): number => use(FrameSidebarWidthContext);

interface FrameOffersProps {
  frame: FrameParts;
  children: ReactNode;
}

// The Places the Frame's pages fill.
function FramePlaceOffers({
  frame,
  children,
}: FrameOffersProps): React.JSX.Element {
  return (
    <InspectorPlaceOffer value={frame.inspectorPlace}>
      <FrameListDetailOffers listDetail={frame.listDetail}>
        <WindowBandProvider places={frame.bandPlaces}>
          {children}
        </WindowBandProvider>
      </FrameListDetailOffers>
    </InspectorPlaceOffer>
  );
}

// What the Frame hands the navigator under it: its parts, its sidebar's width, each section's list and its Places.
export function FrameOffers({
  frame,
  children,
}: FrameOffersProps): React.JSX.Element {
  return (
    <FramePartsContext value={frame}>
      <FrameSidebarWidthContext value={frame.scaffold.layout.sidebarWidth}>
        <SectionListsContext value={frame.lists}>
          <FramePlaceOffers frame={frame}>{children}</FramePlaceOffers>
        </SectionListsContext>
      </FrameSidebarWidthContext>
    </FramePartsContext>
  );
}
