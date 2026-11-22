import type { SessionInfo } from '@repo/contracts';
import type { ListItemProps } from '@repo/kit/primitives/lists/list-item';
import { Platform } from 'react-native';

// Desktop and web draw Session rows as Paper's sidebar rows ("SessionsList"); phones keep their cards and grouped lists.
export const sidebarRows = Platform.OS === 'web';

type SidebarDrawing = Pick<
  ListItemProps,
  'sidebar' | 'emphasized' | 'leadingSize'
>;

// A sidebar row's title is semibold while unread.
export function sidebarDrawing(status: SessionInfo['status']): SidebarDrawing {
  // A phone's row leads with the avatar lane; a sidebar row keeps its compact one.
  if (!sidebarRows) return { leadingSize: 'avatar' };

  return { sidebar: true, emphasized: status === 'unread' };
}
