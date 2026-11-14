import type { ReactElement, ReactNode } from 'react';
import { RefreshControl } from 'react-native';
import { listRefreshFailure } from './list-refresh-failure';
import type { ListLoad } from './list-request';
import { useListRequest } from './list-request';

export function useListRefresh(refresh?: ListLoad): ReactElement | undefined {
  const request = useListRequest(listRefreshFailure);

  return refresh ? (
    <RefreshControl
      refreshing={request.loading}
      onRefresh={() => void request.run(refresh)}
    />
  ) : undefined;
}

// Phones refresh by pulling, so the shortcut is the web's alone.
export function ListRefreshShortcut(props: {
  refresh?: ListLoad;
  children: ReactNode;
}): ReactNode {
  return props.children;
}
