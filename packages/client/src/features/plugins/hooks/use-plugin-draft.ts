import type { WireNode } from '@repo/contracts/plugins/wire';
import type { PluginTreeProps } from '../../../lib/product/plugin-registry';
import { useDraftNaming } from '../stores/draft-namings';
import { draftFrameOf } from '../utils/draft-frame';
import type { PageOpening } from '../utils/page-addresses';
import { useDraftBar, type DraftBarState } from './use-draft-bar';
import { useDraftRegions, type DraftRegions } from './use-draft-regions';

export type PluginDraft = {
  bar: DraftBarState | null;
  regions: DraftRegions | null;
  // What the page's tree is given while the Agent draws it; none for a page that is no dev Plugin's Draft.
  tree: PluginTreeProps['draft'];
  // Drawn in place of the page's tree when the Draft cannot draw the chosen state.
  frame: WireNode | null;
};

/*
 * Everything a Draft adds to a Plugin page, for any surface that draws one: a Plugin page or a Workbench card's
 * page. `error` is why the page's latest draw failed.
 */
export function usePluginDraft(
  opening: PageOpening,
  error: string | null,
): PluginDraft {
  const bar = useDraftBar(opening);
  const naming = useDraftNaming(opening.pluginId);
  const regions = useDraftRegions(opening);

  return {
    bar,
    regions,
    tree: bar ? { naming: naming ?? null, regions: bar.regions } : undefined,
    frame: draftFrameOf(bar, error),
  };
}
