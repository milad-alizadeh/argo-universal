import type { DraftPick } from '@repo/contracts/operations/plugin-drafts';
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
