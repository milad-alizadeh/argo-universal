import { z } from 'zod';
import { PluginPath } from './manifest-fields';
import { matchPagePath, type PageState } from './page-address';
import { PluginIdentifier } from './plugin-identifier';

/*
 * The states every Draft page draws (ADR-0057): loading, empty, error, signed out or refused, pending
 * and populated. One list for the Draft bar, the State menu and `argo plugin validate`.
 */
export const draftStateIds = [
  'loading',
  'empty',
  'error',
  'signed-out',
  'pending',
  'populated',
] as const;

export const DraftStateId = z.enum(draftStateIds);

export type DraftStateId = z.infer<typeof DraftStateId>;

export const draftStateLabels: Readonly<Record<DraftStateId, string>> = {
  loading: 'Loading',
  empty: 'Empty',
  error: 'Error',
  'signed-out': 'Signed out',
  pending: 'Pending',
  populated: 'Populated',
};

// The Page state key a Draft's chosen state travels under, so it is part of the Page address and each App keeps its own.
export const draftStateKey = 'draftState';

// The Page state key a region's picked Variant travels under; like the chosen state it is part of the Page address, and each App keeps its own.
export const draftVariantKey = (regionId: string): string =>
  `draftVariant.${regionId}`;

// The minimum states a Draft page does not declare, in minimum order.
export const missingDraftStates = (
  declared: readonly DraftStateId[],
): DraftStateId[] => draftStateIds.filter((id) => !declared.includes(id));

const distinct = (ids: readonly string[]): boolean =>
  new Set(ids).size === ids.length;

const Variant = z.strictObject({
  id: PluginIdentifier,
  name: z.string().trim().min(1),
});

// A region of a Draft page, named by the key of the node that draws it, with the Variants the author picks between.
const DraftRegion = z.strictObject({
  id: PluginIdentifier,
  variants: z
    .array(Variant)
    .min(1)
    .refine((variants) => distinct(variants.map(({ id }) => id)), {
      message: 'Variant ids must be unique',
    }),
});

const DraftPage = z.strictObject({
  page: PluginPath,
  states: z
    .array(DraftStateId)
    .min(1)
    .refine(distinct, { message: 'Draft states must be unique' }),
  regions: z
    .array(DraftRegion)
    .refine((regions) => distinct(regions.map(({ id }) => id)), {
      message: 'Region ids must be unique',
    })
    .optional(),
});

/*
 * The dev-only manifest key `contributes.drafts` (ADR-0057): each Loader page that is a Draft, the states
 * it draws and its regions with their Variants. `validate` refuses a shipped Plugin that still declares it.
 */
export const PluginDrafts = z
  .array(DraftPage)
  .refine((pages) => distinct(pages.map(({ page }) => page)), {
    message: 'A page may be declared as a Draft once',
  });

export type PluginDrafts = z.infer<typeof PluginDrafts>;

export type DraftPage = PluginDrafts[number];

export type DraftRegion = NonNullable<DraftPage['regions']>[number];

// A region and the Variant of it that is picked or drawn; the shape a pick and a comment's place share.
type RegionVariant = { region: string; variant: string };

type CommentPlace = { nodeKey: string; region?: string; variant?: string };

// The Draft pages a Plugin declares, none when its manifest declares no `contributes.drafts`.
export const draftPages = (drafts: PluginDrafts | undefined): DraftPage[] =>
  drafts ?? [];

// The Draft page whose pattern matches the path, or null when the path is not a Draft.
export const draftPageAt = (
  drafts: PluginDrafts | undefined,
  path: string,
): DraftPage | null =>
  draftPages(drafts).find(({ page }) => matchPagePath(page, path) !== null) ??
  null;

// The regions a Draft page declares, none when it declares none.
export const draftRegions = (page: DraftPage | null): readonly DraftRegion[] =>
  page?.regions ?? [];

/*
 * A region's label is its id, capitalised ("Side-bar"): the region tag, the drawing frame and the docs all say
 * it this way.
 */
export const draftRegionLabel = (regionId: string): string =>
  `${regionId.charAt(0).toUpperCase()}${regionId.slice(1)}`;

/*
 * The Variant a region draws for a Page state: the picked one, or the first when nothing is picked or the pick is
 * one the Draft no longer declares, as after its Variant was removed. The Loader still gets the stale id, so a Draft
 * that draws only the Variants it declares fails that draw, as it does for an unknown state, rather than quietly
 * drawing another Variant.
 */
export function shownVariant(
  region: DraftRegion,
  pageState: PageState,
): { id: string; index: number } {
  const picked = pageState[draftVariantKey(region.id)];
  const found = region.variants.findIndex(({ id }) => id === picked);
  const index = Math.max(0, found);

  return { id: region.variants[index]?.id ?? '', index };
}

// What a Choose would send for a Page state: each region of the page with the Variant it draws, none for a page without regions.
export const shownPicks = (
  page: DraftPage | null,
  pageState: PageState,
): RegionVariant[] =>
  draftRegions(page).map((region) => ({
    region: region.id,
    variant: shownVariant(region, pageState).id,
  }));

// The Variant a step lands on from the one drawn now; the controls wrap, so no end of the list is a dead control.
export function steppedVariant(
  region: DraftRegion,
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

// The Page state change that steps a region of a Draft page one Variant, or null when the page declares no such region.
export function variantStep(
  page: DraftPage | null,
  pageState: PageState,
  regionId: string,
  direction: 1 | -1,
): PageState | null {
  const region = draftRegions(page).find(({ id }) => id === regionId);

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

const restingState: DraftStateId = 'populated';

/*
 * The state a Draft draws for a Page state: the chosen one, even when the Draft does not declare it, so the page
 * can say why it draws nothing; otherwise `populated`, or the first declared state in minimum order.
 */
export function currentDraftState(
  declared: readonly DraftStateId[],
  pageState: PageState,
): DraftStateId {
  const chosen = draftStateIds.find((id) => id === pageState[draftStateKey]);

  if (chosen) return chosen;

  if (declared.includes(restingState)) return restingState;

  return draftStateIds.find((id) => declared.includes(id)) ?? restingState;
}

// A page pattern's `:name` segments draw with a stand-in value, as a Draft's canned data does not read them.
export const draftDrawPath = (page: string): string =>
  page.replaceAll(/:[^/]+/g, 'draft');

// Every Variant of every region the Plugin declares, each to be drawn on its page as the App draws it once picked.
export const draftVariantDraws = (
  drafts: PluginDrafts | undefined,
): { page: string; region: string; variant: string }[] =>
  draftPages(drafts).flatMap(({ page, regions }) =>
    (regions ?? []).flatMap(({ id, variants }) =>
      variants.map((variant) => ({ page, region: id, variant: variant.id })),
    ),
  );

/*
 * The first place on one Draft page that a pick or comment names and the page does not declare, as a sentence for
 * the refusal, or null. A comment names a region and a Variant together, or neither when its node sits outside
 * every region, or only its region, whose first Variant then stands for it.
 */
function pageRefusal(
  page: DraftPage | null,
  picks: readonly RegionVariant[],
  comments: readonly CommentPlace[],
): string | null {
  const regions = draftRegions(page);

  const places = [
    ...picks,
    ...comments.flatMap(({ nodeKey, region, variant }) => {
      if (region === undefined && variant !== undefined)
        return [
          {
            refusal: `Comment on ${nodeKey} names Variant ${variant} without a region`,
          },
        ];

      return region === undefined ? [] : [{ region, variant }];
    }),
  ];

  for (const place of places) {
    if ('refusal' in place) return place.refusal;

    const declared = regions.find(({ id }) => id === place.region);

    if (!declared) return `The Draft declares no region ${place.region}`;

    const variant = place.variant ?? declared.variants[0]?.id ?? '-';

    if (!declared.variants.some(({ id }) => id === variant))
      return `Region ${place.region} declares no Variant ${variant}`;
  }

  return null;
}

/*
 * The first pick or comment place the Plugin's Drafts do not declare, as a sentence for the refusal, or null when
 * one Draft page declares them all. Region ids are unique only within a page, so a choice is checked against each
 * page on its own, never against the regions of every page together; a choice no page declares is refused with
 * the answer of the page that declares its first named region, else of the first page.
 */
export function draftChoiceRefusal(
  drafts: PluginDrafts | undefined,
  picks: readonly RegionVariant[],
  comments: readonly CommentPlace[],
): string | null {
  const pages = draftPages(drafts);

  if (!pages.length) return pageRefusal(null, picks, comments);

  const refusals = pages.map((page) => pageRefusal(page, picks, comments));

  if (refusals.includes(null)) return null;

  const named =
    picks[0]?.region ?? comments.find(({ region }) => region)?.region;

  const index = pages.findIndex(({ regions }) =>
    regions?.some(({ id }) => id === named),
  );

  return refusals[Math.max(0, index)] ?? null;
}
