import type { SessionInfo } from '@repo/contracts';
import type { ListItemProps } from '@repo/kit/primitives/lists/list-item';
import { Platform } from 'react-native';

// Desktop and web draw Session rows as Paper's sidebar rows ("SessionsList"); phones keep their cards and grouped lists.
export const sidebarRows = Platform.OS === 'web';

type SidebarDrawing = Pick<ListItemProps, 'sidebar' | 'emphasized'>;

// A sidebar row's title is semibold while unread.
export function sidebarDrawing(status: SessionInfo['status']): SidebarDrawing {
  if (!sidebarRows) return {};

  return { sidebar: true, emphasized: status === 'unread' };
}
