import type { SessionInfo } from '@repo/contracts';
import type { Tone } from '@repo/kit/primitives/content/text';
import type { ListItemProps } from '@repo/kit/primitives/lists/list-item';
import { Platform } from 'react-native';

// Desktop and web draw Session rows as Paper's sidebar rows ("SessionsList"); phones keep their cards and grouped lists.
export const sidebarRows = Platform.OS === 'web';

/*
 * Paper "SessionsList": the activity reads in the foreground while the Session works, warns while it waits on you,
 * and turns red when it failed; an unread or idle Session's activity is muted.
 */
const activityTones = {
  running: 'neutral',
  needs_input: 'warning',
  failed: 'danger',
  unread: 'muted',
  idle: 'muted',
} satisfies Record<SessionInfo['status'], Tone>;

type SidebarDrawing = Pick<
  ListItemProps,
  'sidebar' | 'emphasized' | 'subtitleTone'
>;

// A sidebar row's title is semibold while unread; a Regular row's activity takes the status's colour.
export function sidebarDrawing(status: SessionInfo['status']): SidebarDrawing {
  if (!sidebarRows) return {};

  return {
    sidebar: true,
    emphasized: status === 'unread',
    subtitleTone: activityTones[status],
  };
}
