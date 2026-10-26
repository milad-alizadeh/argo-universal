import {
  createPlace,
  placeOffer,
  useClaim,
  useClaimed,
  useOfferedPlace,
  type Place,
} from '@repo/kit/place';
import {
  ScreenBandPlace,
  type ScreenBand,
} from '@repo/kit/primitives/scaffolds/screen';
import type { ReactNode } from 'react';

// The focused page supplies its overview and how its Inspector opens; the window owns their placement and pane controls. Its title and menu are its Screen's header, which the kit claims for the band.
export interface WindowBandContent {
  workbench?: ReactNode;
  onInspectorToggle?: () => void;
}

// What the band draws: the focused Screen's title and menu, and the focused page's overview.
export type WindowBandView = WindowBandContent & Partial<ScreenBand>;

const WindowBandPlace = placeOffer<WindowBandContent>();

// Both claims into the band: the page's overview, and the kit's Screen header.
export interface WindowBandPlaces {
  content: Place<WindowBandContent>;
  screen: Place<ScreenBand>;
}

export const createWindowBandPlaces = (): WindowBandPlaces => ({
  content: createPlace(),
  screen: createPlace(),
});

export function WindowBandProvider({
  places,
  children,
}: {
  places: WindowBandPlaces;
  children: ReactNode;
}): ReactNode {
  return (
    <WindowBandPlace value={places.content}>
      <ScreenBandPlace value={places.screen}>{children}</ScreenBandPlace>
    </WindowBandPlace>
  );
}

export function useWindowBandView(
  places: WindowBandPlaces,
): WindowBandView | null {
  const content = useClaimed(places.content);
  const screen = useClaimed(places.screen);

  return content || screen ? { ...screen, ...content } : null;
}

// Under wide the page keeps its own native header, and a retained page gives up the band while another is focused.
export function WindowBand(content: WindowBandContent): null {
  useClaim(useOfferedPlace(WindowBandPlace), content);

  return null;
}
