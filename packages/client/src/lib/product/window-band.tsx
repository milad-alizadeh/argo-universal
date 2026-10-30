import {
  createPlace,
  createPlaceOffer,
  useClaim,
  useClaimed,
  useOfferedPlace,
  type Place,
} from '@repo/kit/place';
import {
  ScreenBandPlaceOffer,
  type ScreenBand,
} from '@repo/kit/primitives/scaffolds/screen';
import type { ReactNode } from 'react';

/*
 * What the page that owns a Session hands the band: its overview, and how its Inspector opens. The band's controls over
 * the Workbench and the Inspector act on this, so only a page that claims it draws them; Settings, Projects, Agents,
 * Plugins and a Plugin's own screens own no Session, claim nothing here, and the band draws without those controls.
 */
export interface WindowBandSession {
  workbench?: ReactNode;
  onInspectorToggle?: () => void;
}

// What the band draws: the focused Screen's title and menu, and the Session the page owns, when it owns one.
export interface WindowBandView extends Partial<ScreenBand> {
  session: WindowBandSession | null;
}

const WindowBandPlaceOffer = createPlaceOffer<WindowBandSession>();

// Both claims into the band: the page's Session, and the kit's Screen header.
export interface WindowBandPlaces {
  session: Place<WindowBandSession>;
  screen: Place<ScreenBand>;
}

export const createWindowBandPlaces = (): WindowBandPlaces => ({
  session: createPlace(),
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
    <WindowBandPlaceOffer value={places.session}>
      <ScreenBandPlaceOffer value={places.screen}>
        {children}
      </ScreenBandPlaceOffer>
    </WindowBandPlaceOffer>
  );
}

const bandOf = (
  session: WindowBandSession | undefined,
  screen: ScreenBand | undefined,
): WindowBandView => ({ ...screen, session: session ?? null });

export function useWindowBandView(
  places: WindowBandPlaces,
): WindowBandView | null {
  const session = useClaimed(places.session);
  const screen = useClaimed(places.screen);

  return session || screen ? bandOf(session, screen) : null;
}

// The overview the Session the page owns contributes, which the Workbench column draws and the band's toggle shows.
export const bandWorkbench = (
  band: WindowBandView | null | undefined,
): ReactNode => band?.session?.workbench;

// Under wide the page keeps its own native header, and a retained page gives up the band while another is focused.
export function WindowBand(session: WindowBandSession): null {
  useClaim(useOfferedPlace(WindowBandPlaceOffer), session);

  return null;
}
