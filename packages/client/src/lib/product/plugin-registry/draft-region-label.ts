import { draftRegionLabel } from '@repo/contracts/plugins/drafts';

// The drawing frame's title; the region's own label is the contracts Draft module's.
export const regionLabel = (region: string): string =>
  `Drawing · ${draftRegionLabel(region)}`;
