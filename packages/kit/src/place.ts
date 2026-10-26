import {
  createContext,
  use,
  useLayoutEffect,
  useRef,
  useSyncExternalStore,
  type Context,
} from 'react';
import {
  createClaimStore,
  type Claim,
  type ClaimStore,
  type Precedence,
} from './claim-store';
import { useIsShownPage } from './use-shown-page';

/*
 * A Place is somewhere in the App that a part elsewhere in the tree fills: the window's band, the Frame's sidebar or
 * its Inspector column. The part that draws it creates the Place and offers it to the pages under it; a page claims it
 * with the value to draw. The newest claim shows, and a claim that lets go does not hand the Place back to an older one.
 *
 * Only the shown page may hold a Place that is offered through `createPlaceOffer`, and only on a wide window, so a page the
 * navigator keeps behind the shown one gives up the Place itself and no caller has to remember to.
 */
export interface Place<Value> {
  readonly claims: ClaimStore<Value>;
}

// A Place whose claims queue, the first holding it, instead of the newest taking it; `precedence` lets a claim jump the queue.
export function createPlace<Value>(
  precedence?: Precedence<Value>,
): Place<Value> {
  return { claims: createClaimStore(precedence) };
}

// The context that offers one kind of Place to the pages under the part that draws it, held at module level: that part provides the Place and the claimers read it.
export const createPlaceOffer = <Value>(): Context<Place<Value> | undefined> =>
  createContext<Place<Value> | undefined>(undefined);

// The Place offered to this page, if any: none in a preview, below wide, or while another page is the shown one.
export function useOfferedPlace<Value>(
  offer: Context<Place<Value> | undefined>,
): Place<Value> | undefined {
  const place = use(offer);

  return useIsShownPage() ? place : undefined;
}

const claimIn = <Value>(place?: Place<Value>): Claim<Value> | null =>
  place?.claims.claim() ?? null;

// Holds the Place while mounted, showing the value as each render has it. A missing Place is nothing to hold.
export function useClaim<Value>(
  place: Place<Value> | undefined,
  value: Value,
): void {
  const claim = useRef<Claim<Value>>(null);

  useLayoutEffect(() => {
    claim.current = claimIn(place);

    return claim.current?.release;
  }, [place]);

  // Runs after the claim above, in the same commit.
  useLayoutEffect(() => claim.current?.show(value), [place, value]);
}

// The holding claim's value, for the part that draws the Place.
export function useClaimed<Value>(place: Place<Value>): Value | undefined {
  return useSyncExternalStore(place.claims.subscribe, place.claims.current);
}

// Whether any claim holds the Place; changes only when one starts or ends.
export function usePlaceHeld<Value>(place: Place<Value>): boolean {
  return useSyncExternalStore(place.claims.subscribe, place.claims.isHeld);
}
