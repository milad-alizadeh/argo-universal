import type { ReactNode } from 'react';
import { placeOffer } from '#kit/place';

/*
 * The App Frame's sidebar, offered to a section's root ListDetail on a wide window so its list sits beside the Rail
 * (Paper ListDetail, wide). The newest claim shows its list. Offered by the App around a section's root pages; absent in
 * previews and nested pages, where ListDetail splits itself.
 */
export const ListDetailSidebarPlace = placeOffer<ReactNode>();
