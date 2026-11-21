import type { DraftPick } from '@repo/contracts/operations/plugin-drafts';
import { draftVariantKey } from '@repo/contracts/plugins/drafts';
import {
  matchPagePath,
  type PageState,
} from '@repo/contracts/plugins/page-address';
import type { DraftEntry } from './draft-bar-model';

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
