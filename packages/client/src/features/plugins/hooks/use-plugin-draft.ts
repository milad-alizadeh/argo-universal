import {
  draftStateKey,
  shownPicks,
  variantStep,
  type DraftStateId,
} from '@repo/contracts/plugins/drafts';
import type { PageState } from '@repo/contracts/plugins/page-address';
import type { WireNode } from '@repo/contracts/plugins/wire';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useTRPC } from '#features/connection';
import type { PluginTreeProps } from '../../../lib/product/plugin-registry';
import {
  draftComments,
  draftCommentsOf,
  useDraftComments,
} from '../stores/draft-comments';
import { useDraftNaming } from '../stores/draft-namings';
import {
  draftBarOf,
  draftFrameOf,
  draftPageOf,
  type DraftBarModel,
  type DraftEntry,
} from '../utils/draft-bar-model';
import {
  draftRegionsOf,
  type DraftRegionTag,
} from '../utils/draft-regions-model';
import type { PageOpening } from '../utils/page-addresses';
import { usePageAddresses } from './use-page-addresses';
import { usePluginEntries } from './use-plugin-entries';

export type DraftBarState = DraftBarModel & {
  onStateChange: (state: DraftStateId) => void;
  onChoose: (() => void) | null;
  commenting: boolean;
  commentCount: number;
  onToggleComments: () => void;
};

export type DraftRegions = {
  tags: DraftRegionTag[];
  onStep: (regionId: string, direction: 1 | -1) => void;
};

export type PluginDraft = {
  bar: DraftBarState | null;
  regions: DraftRegions | null;
  // What the page's tree is given while the Agent draws it; none for a page that is no dev Plugin's Draft.
  tree: PluginTreeProps['draft'];
  // Drawn in place of the page's tree when the Draft cannot draw the chosen state.
  frame: WireNode | null;
};

type Looked = { entry: DraftEntry | null; pageState: PageState };

function useLooked(opening: PageOpening): Looked {
  const addresses = usePageAddresses();
  const { plugins } = usePluginEntries();
  const { data: pageState } = useQuery(addresses.state(opening));

  return {
    entry:
      plugins?.find(({ manifest }) => manifest.id === opening.pluginId) ?? null,
    pageState,
  };
}

// A Draft with no regions has nothing to pick, so only a comment gives its author something to send.
function picksOf<Pick>(shown: Pick[], noteCount: number): Pick[] | null {
  if (shown.length > 0) return shown;

  return noteCount > 0 ? [] : null;
}

function useDraftBar(
  opening: PageOpening,
  looked: Looked,
): DraftBarState | null {
  const addresses = usePageAddresses();
  const { entry, pageState } = looked;

  const bar = draftBarOf(entry, opening.path, pageState);
  const { notes, commenting } = useDraftComments(opening);

  const shown = shownPicks(draftPageOf(entry, opening.path), pageState);
  const picks = picksOf(shown, notes.length);

  const choose = useMutation({
    ...useTRPC().plugin.draft.choose.mutationOptions(),
    // The notes that went with the pick are gone, whichever call carried them.
    onSuccess: (_choice, { comments }) => draftComments.sent(opening, comments),
  });

  if (!bar) return null;

  return {
    ...bar,
    onStateChange: (state) => {
      void addresses.change(opening, { [draftStateKey]: state });
    },
    onChoose:
      picks &&
      (() => {
        choose.mutate({
          pluginId: opening.pluginId,
          picks,
          comments: draftCommentsOf(notes),
        });
      }),
    commenting,
    commentCount: notes.length,
    onToggleComments: () => draftComments.setCommenting(opening, !commenting),
  };
}

function useDraftRegions(
  opening: PageOpening,
  { entry, pageState }: Looked,
): DraftRegions | null {
  const addresses = usePageAddresses();

  const tags = draftRegionsOf(entry, opening.path, pageState);

  if (!tags) return null;

  const declared = draftPageOf(entry, opening.path);

  return {
    tags,
    onStep: (regionId, direction) => {
      const change = variantStep(declared, pageState, regionId, direction);

      if (change) void addresses.change(opening, change);
    },
  };
}

/*
 * Everything a Draft adds to a Plugin page: the bar, the region tags and what the tree is given. `error` is why the
 * page's latest draw failed.
 */
export function usePluginDraft(
  opening: PageOpening,
  error: string | null,
): PluginDraft {
  const looked = useLooked(opening);
  const bar = useDraftBar(opening, looked);
  const naming = useDraftNaming(opening.pluginId);
  const regions = useDraftRegions(opening, looked);

  return {
    bar,
    regions,
    tree: bar ? { naming: naming ?? null, regions: bar.regions } : undefined,
    frame: draftFrameOf(bar, error),
  };
}
