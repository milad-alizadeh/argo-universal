import {
  createPlace,
  createPlaceOffer,
  useClaim,
  useClaimed,
  useOfferedPlace,
  type Place,
} from '@repo/kit/place';
import { NativeInspectorPlace } from '@repo/kit/primitives/scaffolds/inspector';
import {
  TitleBarOffer,
  type TitleBarPlaces,
} from '@repo/kit/primitives/scaffolds/screen';
import { use, type ReactNode } from 'react';

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

// The Session whose Workbench and Inspector the band controls, and the title and buttons the shown page draws in the title bar.
export interface WindowBandView {
  session: WindowBandSession | null;
  title?: ReactNode;
  actions?: ReactNode;
}

const WindowBandPlaceOffer = createPlaceOffer<WindowBandSession>();

// The page's claims over the band controls and the title bar's title and buttons.
export interface WindowBandPlaces {
  session: Place<WindowBandSession>;
  titleBar: TitleBarPlaces;
}

export const createWindowBandPlaces = (): WindowBandPlaces => ({
  session: createPlace(),
  titleBar: { title: createPlace(), actions: createPlace() },
});

export function WindowBandProvider({
  places,
  children,
}: {
  places: WindowBandPlaces;
  children: ReactNode;
}): ReactNode {
  const titleBar = use(NativeInspectorPlace) ? undefined : places.titleBar;

  return (
    <WindowBandPlaceOffer value={places.session}>
      <TitleBarOffer value={titleBar}>{children}</TitleBarOffer>
    </WindowBandPlaceOffer>
  );
}

export function useWindowBandView(
  places: WindowBandPlaces,
): WindowBandView | null {
  const session = useClaimed(places.session) ?? null;
  const title = useClaimed(places.titleBar.title);
  const actions = useClaimed(places.titleBar.actions);

  return session || title || actions ? { session, title, actions } : null;
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
