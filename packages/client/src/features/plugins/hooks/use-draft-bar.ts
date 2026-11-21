import {
  draftStateKey,
  type DraftStateId,
} from '@repo/contracts/plugins/drafts';
import { useMutation } from '@tanstack/react-query';
import { useTRPC } from '#features/connection';
import { draftBarOf, type DraftBarModel } from '../utils/draft-bar-model';
import { draftPicksOf } from '../utils/draft-picks';
import type { PageOpening } from '../utils/page-addresses';
import { useDraftEntry } from './use-draft-entry';
import { usePageAddresses } from './use-page-addresses';

export type DraftBarState = DraftBarModel & {
  // Redraws the page at the state; each App keeps its own, as the Page state is.
  onStateChange: (state: DraftStateId) => void;
  // Sends this App's pick, one Variant per region, to the Session's Agent; each App sends its own. Null for a Draft page with no regions, which has nothing to pick.
  onChoose: (() => void) | null;
};

/*
 * The Draft bar's states for a Plugin page, or null when the page is not a Draft of a dev Plugin. The chosen
 * state is Page state, so it is part of the page's address and the Loader answers that state's canned data.
 */
export function useDraftBar(opening: PageOpening): DraftBarState | null {
  const addresses = usePageAddresses();
  const { entry, pageState } = useDraftEntry(opening);

  const bar = draftBarOf(entry, opening.path, pageState);
  const picks = draftPicksOf(entry, opening.path, pageState);
  const choose = useMutation(useTRPC().plugin.draft.choose.mutationOptions());

  if (!bar) return null;

  return {
    ...bar,
    onStateChange: (state) => {
      void addresses.change(opening, { [draftStateKey]: state });
    },
    onChoose:
      picks &&
      (() => {
        choose.mutate({ pluginId: opening.pluginId, picks, comments: [] });
      }),
  };
}
