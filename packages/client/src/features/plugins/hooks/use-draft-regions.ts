import { matchPagePath } from '@repo/contracts/plugins/page-address';
import { useQuery } from '@tanstack/react-query';
import type { DraftRegionTag } from '../utils/draft-regions-model';
import { draftRegionsOf, stepChange } from '../utils/draft-regions-model';
import type { PageOpening } from '../utils/page-addresses';
import { usePageAddresses } from './use-page-addresses';
import { usePluginEntries } from './use-plugin-entries';

export type DraftRegions = {
  tags: DraftRegionTag[];
  // Redraws the region on the Variant a step away; each App keeps its own pick, as the Page state is.
  onStep: (regionId: string, direction: 1 | -1) => void;
};

/*
 * The tags of a dev Plugin's Draft page, or null when the page has no regions. A pick is Page state, so it is part
 * of the page's address and the Loader draws that Variant of the region.
 */
export function useDraftRegions(opening: PageOpening): DraftRegions | null {
  const addresses = usePageAddresses();
  const { plugins } = usePluginEntries();
  const { data: pageState } = useQuery(addresses.state(opening));

  const entry =
    plugins?.find(({ manifest }) => manifest.id === opening.pluginId) ?? null;

  const tags = draftRegionsOf(entry, opening.path, pageState);

  if (!tags) return null;

  const declared = entry?.manifest.contributes.drafts?.find(
    ({ page }) => matchPagePath(page, opening.path) !== null,
  );

  return {
    tags,
    onStep: (regionId, direction) => {
      const change = stepChange(declared, pageState, regionId, direction);

      if (change) void addresses.change(opening, change);
    },
  };
}
