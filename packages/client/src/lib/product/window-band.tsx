import {
  createPlace,
  createPlaceOffer,
  useClaim,
  useClaimed,
  useOfferedPlace,
  type Place,
} from '@repo/kit/place';
import type { ReactNode } from 'react';

/*
 * What the page that owns a Session hands the band: its overview, and how its Inspector opens. The band's controls over
 * the Workbench and the Inspector act on this, so only a page that claims it draws them; Settings, Projects, Agents,
 * Plugins and a Plugin's own screens own no Session, claim nothing here, and the band draws without those controls.
 */
export interface WindowBandSession {
  sessionId?: string;
  workbench?: ReactNode;
  onInspectorToggle?: () => void;
}

// The Session whose Workbench and Inspector the band controls.
export interface WindowBandView {
  session: WindowBandSession | null;
}

const WindowBandPlaceOffer = createPlaceOffer<WindowBandSession>();

// The page's claim over the band controls.
export interface WindowBandPlaces {
  session: Place<WindowBandSession>;
}

export const createWindowBandPlaces = (): WindowBandPlaces => ({
  session: createPlace(),
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
      {children}
    </WindowBandPlaceOffer>
  );
}

export function useWindowBandView(
  places: WindowBandPlaces,
): WindowBandView | null {
  const session = useClaimed(places.session);

  return session ? { session } : null;
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
