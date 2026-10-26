import { createContext, type Context, type ReactNode } from 'react';
import { type ClaimStore, createClaimStore } from '#kit/claim-store';

/*
 * What a header-only Screen hands the window's band on a wide window, where a page whose body is not a Screen, such as
 * a Session's, has its title and Actions in the band instead of in its content: what the Screen's header declares,
 * drawn as the band's title and menu.
 */
export interface ScreenBand {
  title: ReactNode;
  menu: ReactNode;
}

// A place in the window's band that the focused page fills, empty until a claim shows a value.
export type BandHost<Value> = ClaimStore<Value | null>;

export const createBandHost = <Value>(): BandHost<Value> =>
  createClaimStore<Value | null>(null);

// Offered by the App's Frame, which draws the band; absent in previews and below wide, where there is no band to fill.
export const createBandHostContext = <Value>(): Context<
  BandHost<Value> | undefined
> => createContext<BandHost<Value> | undefined>(undefined);

export type ScreenBandHost = BandHost<ScreenBand>;

export const createScreenBandHost = createBandHost<ScreenBand>;

export const ScreenBandHostContext = createBandHostContext<ScreenBand>();
