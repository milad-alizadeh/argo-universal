// Who draws a phone Page's header: no navigator (a preview), the drawer at a narrow drawer root, or the Page's stack.
export type PageHeaderHost = 'none' | 'drawer' | 'stack';

export interface PagePlace {
  navigator: boolean;
  atDrawerRoot: boolean;
  wide: boolean;
}

// A wide window hides the drawer's header and draws the Page's own heading, so only a narrow drawer root hands it over.
export function pageHeaderHost(place: PagePlace): PageHeaderHost {
  if (!place.navigator) return 'none';

  return drawsInDrawer(place) ? 'drawer' : 'stack';
}

function drawsInDrawer(place: PagePlace): boolean {
  return place.atDrawerRoot && !place.wide;
}

export interface HeaderClaims {
  // The Page now writing the header of the navigator route `route` takes it over.
  claim: (route: string, page: symbol) => void;
  // Whether `page` still holds the route's header, which it then gives up; a Page another has taken over from must leave it.
  release: (route: string, page: symbol) => boolean;
}

/*
 * Which Page last wrote each navigator route's header. Pages stay mounted behind the focused one, and a leaving Page's
 * cleanup can run after the arriving Page wrote its header, so only the Page that still holds it clears it.
 */
export function headerClaims(): HeaderClaims {
  const holders = new Map<string, symbol>();

  return {
    claim: (route, page) => void holders.set(route, page),
    release: (route, page) =>
      holders.get(route) === page && holders.delete(route),
  };
}
