import {
  draftStateKey,
  type DraftStateId,
} from '@repo/contracts/plugins/drafts';
import { useQuery } from '@tanstack/react-query';
import { draftBarOf, type DraftBarModel } from '../utils/draft-bar-model';
import type { PageOpening } from '../utils/page-addresses';
import { usePageAddresses } from './use-page-addresses';
import { usePluginEntries } from './use-plugin-entries';

export type DraftBarState = DraftBarModel & {
  // Redraws the page at the state; each App keeps its own, as the Page state is.
  onStateChange: (state: DraftStateId) => void;
};

/*
 * The Draft bar's states for a Plugin page, or null when the page is not a Draft of a dev Plugin. The chosen
 * state is Page state, so it is part of the page's address and the Loader answers that state's canned data.
 */
export function useDraftBar(opening: PageOpening): DraftBarState | null {
  const addresses = usePageAddresses();
  const { plugins } = usePluginEntries();
  const { data: pageState } = useQuery(addresses.state(opening));

  const bar = draftBarOf(
    plugins?.find(({ manifest }) => manifest.id === opening.pluginId) ?? null,
    opening.path,
    pageState,
  );

  if (!bar) return null;

  return {
    ...bar,
    onStateChange: (state) => {
      void addresses.change(opening, { [draftStateKey]: state });
    },
  };
}
