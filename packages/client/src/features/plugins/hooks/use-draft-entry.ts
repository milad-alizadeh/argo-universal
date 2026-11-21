import type { PageState } from '@repo/contracts/plugins/page-address';
import { useQuery } from '@tanstack/react-query';
import type { DraftEntry } from '../utils/draft-bar-model';
import type { PageOpening } from '../utils/page-addresses';
import { usePageAddresses } from './use-page-addresses';
import { usePluginEntries } from './use-plugin-entries';

export type DraftEntryState = {
  entry: DraftEntry | null;
  pageState: PageState;
};

// The listed Plugin a page opens in and the Page state its address holds, which every Draft control reads.
export function useDraftEntry(opening: PageOpening): DraftEntryState {
  const addresses = usePageAddresses();
  const { plugins } = usePluginEntries();
  const { data: pageState } = useQuery(addresses.state(opening));

  return {
    entry:
      plugins?.find(({ manifest }) => manifest.id === opening.pluginId) ?? null,
    pageState,
  };
}
