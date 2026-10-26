import { createPlaceOffer } from '#kit/place';
import type { InspectorProps } from './inspector-props';

/*
 * The App Frame's Inspector column, flush with the window's right edge, offered to the shown page on a wide window:
 * the page's Inspector draws there, and the Frame gives the page the rest of the width. Offered by the App to the
 * shown page; absent in previews, where a wide Inspector draws its column in place.
 */
export const InspectorPlaceOffer = createPlaceOffer<InspectorProps>();
