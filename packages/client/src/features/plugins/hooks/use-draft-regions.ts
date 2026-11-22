import { variantStep } from '@repo/contracts/plugins/drafts';
import { draftPageOf } from '../utils/draft-bar-model';
import type { DraftRegionTag } from '../utils/draft-regions-model';
import { draftRegionsOf } from '../utils/draft-regions-model';
import type { PageOpening } from '../utils/page-addresses';
import { useDraftEntry } from './use-draft-entry';
import { usePageAddresses } from './use-page-addresses';

export type DraftRegions = {
  tags: DraftRegionTag[];
  onStep: (regionId: string, direction: 1 | -1) => void;
};

export function useDraftRegions(opening: PageOpening): DraftRegions | null {
  const addresses = usePageAddresses();
  const { entry, pageState } = useDraftEntry(opening);

  const tags = draftRegionsOf(entry, opening.path, pageState);

  if (!tags) return null;

  const declared = draftPageOf(entry, opening.path);

  return {
    tags,
    onStep: (regionId, direction) => {
      const change = variantStep(declared, pageState, regionId, direction);

      if (change) void addresses.change(opening, change);
    },
  };
}
