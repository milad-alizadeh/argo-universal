import type { ReactNode } from 'react';
import { placeOffer } from '#kit/place';

/*
 * What a header-only Screen hands the window's band on a wide window, where a page whose body is not a Screen, such as
 * a Session's, has its title and Actions in the band instead of in its content: what the Screen's header declares,
 * drawn as the band's title and menu.
 */
export interface ScreenBand {
  title: ReactNode;
  menu: ReactNode;
}

// Offered by the App's Frame, which draws the band; absent in previews, where there is no band to fill.
export const ScreenBandPlace = placeOffer<ScreenBand>();
