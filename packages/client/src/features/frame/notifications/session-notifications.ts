import type { FeedPageOutput, SessionInfo } from '@repo/contracts';
import {
  baselinePosition,
  endedTurn,
  type NotificationBaseline,
} from './notification-feed';
import { inputRequestChanged } from './notification-input';

export interface SessionNotification {
  session: SessionInfo;
  body: string;
}

export const isExcluded = (session: SessionInfo): boolean =>
  session.archivedAt !== null || session.parentSessionId !== null;

function newTurnEnds(
  page: FeedPageOutput,
  previous: NotificationBaseline | undefined,
): number {
  if (previous && previous.epoch !== page.epoch) return 0;

  return page.rows.filter(
    (row) => row.position > baselinePosition(previous) && endedTurn(row),
  ).length;
}

export interface SessionNotificationRead {
  session: SessionInfo;
  page: FeedPageOutput;
  inputId: string | null;
}

export function sessionNotifications(
  previous: NotificationBaseline | undefined,
  current: SessionNotificationRead,
): SessionNotification[] {
  if (isExcluded(current.session)) return [];
  const session = current.session;

  const endings = Array.from(
    { length: newTurnEnds(current.page, previous) },
    (): SessionNotification => ({ session, body: 'Turn ended' }),
  );

  if (needsInput(previous, current))
    endings.push({ session, body: 'Needs your input' });

  return endings;
}

function needsInput(
  previous: NotificationBaseline | undefined,
  current: SessionNotificationRead,
): boolean {
  return inputRequestChanged(previous?.inputId, current.inputId);
}

export const notificationBaseline = ({
  session,
  page,
  inputId,
}: SessionNotificationRead): NotificationBaseline => ({
  session,
  inputId,
  epoch: page.epoch,
  position: page.rows.at(-1)?.position ?? -1,
});
