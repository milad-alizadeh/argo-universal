import type { DraftPick } from '@repo/contracts/operations/plugin-drafts';
import { draftVariantKey } from '@repo/contracts/plugins/drafts';
import {
  matchPagePath,
  type PageState,
} from '@repo/contracts/plugins/page-address';
import type { DraftEntry } from './draft-bar-model';

/*
 * The pick Choose sends for a Draft page, one Variant per declared region, or null when the page declares no
 * regions: a dev Plugin only (ADR-0057). A region the author has not stepped, or whose picked Variant is no
 * longer declared, rests on its first Variant, which is what its tag shows.
 */
export function draftPicksOf(
  entry: DraftEntry | null,
  path: string,
  pageState: PageState,
): DraftPick[] | null {
  const regions =
    entry?.dev === true
      ? entry.manifest.contributes.drafts?.find(
          ({ page }) => matchPagePath(page, path) !== null,
        )?.regions
      : undefined;

  if (!regions?.length) return null;

  return regions.flatMap(({ id, variants }) => {
    const shown =
      variants.find(
        (variant) => variant.id === pageState[draftVariantKey(id)],
      ) ?? variants[0];

    return shown ? [{ region: id, variant: shown.id }] : [];
  });
}
