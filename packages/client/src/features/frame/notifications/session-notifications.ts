import type { FeedPageOutput, SessionInfo } from '@repo/contracts';
import {
  baselinePosition,
  endedTurn,
  type NotificationBaseline,
} from './notification-feed';

export interface SessionNotification {
  session: SessionInfo;
  body: string;
}

const isExcluded = (session: SessionInfo): boolean =>
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

export function sessionNotifications(
  previous: NotificationBaseline | undefined,
  session: SessionInfo,
  page: FeedPageOutput,
): SessionNotification[] {
  if (isExcluded(session)) return [];

  const endings = Array.from(
    { length: newTurnEnds(page, previous) },
    (): SessionNotification => ({ session, body: 'Turn ended' }),
  );

  if (needsInput(previous, session))
    endings.push({ session, body: 'Needs your input' });

  return endings;
}

function needsInput(
  previous: NotificationBaseline | undefined,
  session: SessionInfo,
): boolean {
  if (session.status !== 'needs_input') return false;

  return previous?.session.status !== 'needs_input';
}

export const notificationBaseline = (
  session: SessionInfo,
  page: FeedPageOutput,
): NotificationBaseline => ({
  session,
  epoch: page.epoch,
  position: page.rows.at(-1)?.position ?? -1,
});
