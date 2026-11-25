import {
  draftRegionLabel,
  draftRegions,
  shownVariant,
  type DraftRegion,
} from '@repo/contracts/plugins/drafts';
import type { PageState } from '@repo/contracts/plugins/page-address';
import { draftPageOf, type DraftEntry } from './draft-bar-model';

export type DraftRegionTag = {
  id: string;
  label: string;
  variant: string;
  letter: string;
  position: number;
  count: number;
};

const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export function draftRegionsOf(
  entry: DraftEntry | null,
  path: string,
  pageState: PageState,
): DraftRegionTag[] | null {
  const regions = draftRegions(draftPageOf(entry, path));

  if (!regions.length) return null;

  return regions.map((region) => tagOf(region, pageState));
}

function tagOf(region: DraftRegion, pageState: PageState): DraftRegionTag {
  const { id, index } = shownVariant(region, pageState);

  return {
    id: region.id,
    label: draftRegionLabel(region.id),
    variant: id,
    letter: letters[index] ?? String(index + 1),
    position: index + 1,
    count: region.variants.length,
  };
}
