import type { PageState } from '@repo/contracts/plugins/page-address';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useState } from 'react';

type Remembered = { pluginId: string; path: string };

export type PageMemory = [PageState, (next: PageState) => void];

// The App's own cache entry for a Loader page's Page state; nothing asks the Server for it.
const memoryKey = ({ pluginId, path }: Remembered): readonly string[] => [
  'loaderPageState',
  pluginId,
  path,
];

const rememberedState = (client: QueryClient, page: Remembered): PageState =>
  client.getQueryData<PageState>(memoryKey(page)) ?? {};

/*
 * A Loader page's Page state, kept in the App beside its trees: Back and a later visit open the page at
 * the address it was left at, such as its search, so the kept tree draws at once with the pages it showed.
 */
export function usePageStateMemory(page: Remembered): PageMemory {
  const client = useQueryClient();

  const [pageState, setPageState] = useState(() =>
    rememberedState(client, page),
  );

  const remember = (next: PageState): void => {
    client.setQueryData(memoryKey(page), next);
    setPageState(next);
  };

  return [pageState, remember];
}
