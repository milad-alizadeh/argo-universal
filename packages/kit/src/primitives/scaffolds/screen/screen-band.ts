import { createContext, type ReactNode } from 'react';
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

export type ScreenBandHost = ClaimStore<ScreenBand | null>;

export const createScreenBandHost = (): ScreenBandHost =>
  createClaimStore<ScreenBand | null>(null);

// Offered by the App's Frame, which draws the band; absent in previews and below wide, where the Screen has no band to fill.
export const ScreenBandHostContext = createContext<ScreenBandHost | undefined>(
  undefined,
);
