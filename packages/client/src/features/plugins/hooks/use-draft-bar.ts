import {
  draftStateKey,
  shownPicks,
  type DraftStateId,
} from '@repo/contracts/plugins/drafts';
import { useMutation } from '@tanstack/react-query';
import { useTRPC } from '#features/connection';
import {
  draftComments,
  draftCommentsOf,
  useDraftComments,
} from '../stores/draft-comments';
import {
  draftBarOf,
  draftPageOf,
  type DraftBarModel,
} from '../utils/draft-bar-model';
import type { PageOpening } from '../utils/page-addresses';
import { useDraftEntry } from './use-draft-entry';
import { usePageAddresses } from './use-page-addresses';

export type DraftBarState = DraftBarModel & {
  onStateChange: (state: DraftStateId) => void;
  onChoose: (() => void) | null;
  commenting: boolean;
  commentCount: number;
  onToggleComments: () => void;
};

export function useDraftBar(opening: PageOpening): DraftBarState | null {
  const addresses = usePageAddresses();
  const { entry, pageState } = useDraftEntry(opening);

  const bar = draftBarOf(entry, opening.path, pageState);
  const { notes, commenting } = useDraftComments(opening);

  // A Draft with no regions has nothing to pick, so only a comment gives its author something to send.
  const shown = shownPicks(draftPageOf(entry, opening.path), pageState);
  const picks = shown.length > 0 ? shown : notes.length > 0 ? [] : null;

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
