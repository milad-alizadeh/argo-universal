import type { PluginDrafts } from '@repo/contracts/plugins/drafts';
import { draftVariantKey } from '@repo/contracts/plugins/drafts';
import type { PageState } from '@repo/contracts/plugins/page-address';
import { matchPagePath } from '@repo/contracts/plugins/page-address';
import type { DraftEntry } from './draft-bar-model';

type Region = NonNullable<PluginDrafts[number]['regions']>[number];

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
  const regions = entry?.dev === true ? declaredRegions(entry, path) : null;

  if (!regions?.length) return null;

  return regions.map((region) => tagOf(region, pageState));
}

function declaredRegions(
  entry: DraftEntry,
  path: string,
): readonly Region[] | undefined {
  return entry.manifest.contributes.drafts?.find(
    ({ page }) => matchPagePath(page, path) !== null,
  )?.regions;
}

function tagOf(region: Region, pageState: PageState): DraftRegionTag {
  const index = Math.max(0, pickedIndex(region, pageState));

  return {
    id: region.id,
    label: capitalised(region.id),
    variant: region.variants[index]?.id ?? '',
    letter: letters[index] ?? String(index + 1),
    position: index + 1,
    count: region.variants.length,
  };
}

/*
 * A pick the Draft no longer declares, as after its Variant was removed, rests on the first Variant in the tag. The
 * Loader still gets the stale id, so a Draft that draws only the Variants it declares fails that draw, as it does for an
 * unknown state, rather than quietly drawing another Variant.
 */
const pickedIndex = (region: Region, pageState: PageState): number =>
  region.variants.findIndex(
    ({ id }) => id === pageState[draftVariantKey(region.id)],
  );

const capitalised = (id: string): string =>
  `${id.charAt(0).toUpperCase()}${id.slice(1)}`;

// The Variant a step lands on from the one drawn now; the controls wrap, so no end of the list is a dead control.
export function steppedVariant(
  region: Region,
  current: string,
  direction: 1 | -1,
): string {
  const count = region.variants.length;

  const from = Math.max(
    0,
    region.variants.findIndex(({ id }) => id === current),
  );

  return region.variants[(from + direction + count) % count]?.id ?? current;
}

export function stepChange(
  {
    declared,
    pageState,
  }: { declared?: PluginDrafts[number]; pageState: PageState },
  regionId: string,
  direction: 1 | -1,
): PageState | null {
  const region = declared?.regions?.find(({ id }) => id === regionId);

  if (!region) return null;

  const key = draftVariantKey(regionId);
  const current = pageState[key];

  return {
    [key]: steppedVariant(
      region,
      typeof current === 'string' ? current : '',
      direction,
    ),
  };
}
