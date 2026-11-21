import { matchPagePath } from '@repo/contracts/plugins/page-address';
import type { DraftRegionTag } from '../utils/draft-regions-model';
import { draftRegionsOf, stepChange } from '../utils/draft-regions-model';
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

  const declared = entry?.manifest.contributes.drafts?.find(
    ({ page }) => matchPagePath(page, opening.path) !== null,
  );

  return {
    tags,
    onStep: (regionId, direction) => {
      const change = stepChange({ declared, pageState }, regionId, direction);

      if (change) void addresses.change(opening, change);
    },
  };
}
