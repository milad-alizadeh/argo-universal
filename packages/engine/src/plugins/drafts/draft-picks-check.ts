import type {
  DraftComment,
  DraftPick,
} from '@repo/contracts/operations/plugin-drafts';
import type { PluginDrafts } from '@repo/contracts/plugins/drafts';

/*
 * The first pick a Plugin's declared Drafts do not allow, as a sentence for the refusal, or null when every pick
 * names a declared region and one of its Variants.
 */
export function undeclaredPick(
  picks: readonly DraftPick[],
  drafts: PluginDrafts | undefined,
): string | null {
  const regions = (drafts ?? []).flatMap((page) => page.regions ?? []);

  for (const { region, variant } of picks) {
    const declared = regions.find(({ id }) => id === region);

    if (!declared) return `The Draft declares no region ${region}`;

    if (!declared.variants.some(({ id }) => id === variant))
      return `Region ${region} declares no Variant ${variant}`;
  }

  return null;
}

/*
 * The first comment that names a place the Plugin's declared Drafts do not have, as a sentence for the refusal, or
 * null. A comment names a region and a Variant together, or neither when its node sits outside every region.
 */
export function undeclaredCommentPlace(
  comments: readonly DraftComment[],
  drafts: PluginDrafts | undefined,
): string | null {
  for (const { region, variant, nodeKey } of comments) {
    if (region === undefined && variant !== undefined)
      return `Comment on ${nodeKey} names Variant ${variant} without a region`;

    if (region === undefined) continue;

    const refusal = undeclaredPick(
      [{ region, variant: variant ?? declaredVariant(region, drafts) }],
      drafts,
    );

    if (refusal) return refusal;
  }

  return null;
}

// A comment may name only its region; that region's first Variant stands for it in the check.
function declaredVariant(
  region: string,
  drafts: PluginDrafts | undefined,
): string {
  const regions = (drafts ?? []).flatMap((page) => page.regions ?? []);

  return regions.find(({ id }) => id === region)?.variants[0]?.id ?? '-';
}
