import type { DraftNote } from '../stores/draft-comments';

type Place = { region: string; variant: string } | null;

/*
 * What a pin is found by: the node's address within the region and Variant it was drawn in, so a note made on one
 * Variant does not show on another that draws a node at the same address.
 */
export const pinKey = (address: string, place: Place): string =>
  `${place?.region ?? ''}\n${place?.variant ?? ''}\n${address}`;

export const pinKeyOf = ({ address, region, variant }: DraftNote): string =>
  pinKey(address, region && variant ? { region, variant } : null);
