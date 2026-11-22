import type { SessionInfo } from '@repo/contracts';
import type { ListItemProps } from '@repo/kit/primitives/lists/list-item';
import { createContext, use } from 'react';
import { Platform } from 'react-native';

// Desktop and web draw Session rows as Paper's sidebar rows ("SessionsList"); phones keep their cards and grouped lists.
export const sidebarRows = Platform.OS === 'web';

/*
 * Which look a Session row draws, decided once here: a row's parts read it, so none asks the Platform itself, and a
 * story or test draws either look by providing it.
 */
const SidebarRowsContext = createContext(sidebarRows);

export const SidebarRowsProvider = SidebarRowsContext.Provider;

export const useSidebarRows = (): boolean => use(SidebarRowsContext);

type SidebarDrawing = Pick<
  ListItemProps,
  'sidebar' | 'emphasized' | 'leadingSize'
>;

// A sidebar row's title is semibold while unread.
export function sidebarDrawing(
  status: SessionInfo['status'],
  sidebar: boolean,
): SidebarDrawing {
  // A phone's row leads with the avatar lane; a sidebar row keeps its compact one.
  if (!sidebar) return { leadingSize: 'avatar' };

  return { sidebar: true, emphasized: status === 'unread' };
}
