import {
  draftStateKey,
  type DraftStateId,
} from '@repo/contracts/plugins/drafts';
import { useMutation } from '@tanstack/react-query';
import { useTRPC } from '#features/connection';
import {
  draftComments,
  draftCommentsOf,
  useDraftComments,
} from '../stores/draft-comments';
import { draftBarOf, type DraftBarModel } from '../utils/draft-bar-model';
import { draftPicksOf } from '../utils/draft-picks';
import type { PageOpening } from '../utils/page-addresses';
import { useDraftEntry } from './use-draft-entry';
import { usePageAddresses } from './use-page-addresses';

export type DraftBarState = DraftBarModel & {
  // Redraws the page at the state; each App keeps its own, as the Page state is.
  onStateChange: (state: DraftStateId) => void;
  // Sends this App's pick, one Variant per region, and its comments to the Session's Agent; each App sends its own. Null for a Draft page with no regions and no comment, which has nothing to send.
  onChoose: (() => void) | null;
  // Whether this App is picking nodes to comment on, and how many notes Choose will carry.
  commenting: boolean;
  commentCount: number;
  onToggleComments: () => void;
};

/*
 * The Draft bar's states for a Plugin page, or null when the page is not a Draft of a dev Plugin. The chosen
 * state is Page state, so it is part of the page's address and the Loader answers that state's canned data.
 */
export function useDraftBar(opening: PageOpening): DraftBarState | null {
  const addresses = usePageAddresses();
  const { entry, pageState } = useDraftEntry(opening);

  const bar = draftBarOf(entry, opening.path, pageState);
  const { notes, commenting } = useDraftComments(opening);

  // A Draft with no regions has nothing to pick, so only a comment gives its author something to send.
  const picks =
    draftPicksOf(entry, opening.path, pageState) ??
    (notes.length > 0 ? [] : null);

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
