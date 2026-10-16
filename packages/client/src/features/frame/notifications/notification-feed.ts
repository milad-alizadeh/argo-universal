import type {
  FeedPageOutput,
  SessionListOutput,
  SessionInfo,
  SessionUpdate,
  Notice,
  TurnEnd,
} from '@repo/contracts';
import type { useTRPCClient } from '#features/connection';
import { readNotificationInput } from './notification-input';

export type NotificationClient = ReturnType<typeof useTRPCClient>;

export interface NotificationBaseline {
  session: SessionInfo;
  epoch: number;
  position: number;
  inputId: string | null;
}

export async function readNotificationBaselines(
  client: NotificationClient,
  signal?: AbortSignal,
): Promise<NotificationBaseline[]> {
  const baselines: NotificationBaseline[] = [];
  let cursor: string | undefined;

  do {
    const page = await readSessionPage(client, cursor, signal);

    baselines.push(...(await readBaselinesPage(client, page.sessions, signal)));
    cursor = page.nextCursor ?? undefined;
  } while (cursor);

  return baselines;
}

async function readBaselinesPage(
  client: NotificationClient,
  sessions: SessionInfo[],
  signal: AbortSignal | undefined,
): Promise<NotificationBaseline[]> {
  const baselines: NotificationBaseline[] = [];

  for (const session of sessions)
    baselines.push(await readBaseline(client, session, signal));

  return baselines;
}

export async function readBaseline(
  client: NotificationClient,
  session: SessionInfo,
  signal?: AbortSignal,
): Promise<NotificationBaseline> {
  if (session.archivedAt !== null)
    return { session, epoch: 0, position: -1, inputId: null };
  const page = await readBaselinePage(client, session.sessionId, signal);

  return {
    session,
    inputId: await readNotificationInput(client, session, signal),
    epoch: page.epoch,
    position: lastPosition(page),
  };
}

export async function readNotificationFeed(
  client: NotificationClient,
  sessionId: string,
  baseline: NotificationBaseline | undefined,
): Promise<FeedPageOutput> {
  const page = await client.feed.page.query({ sessionId, direction: 'tail' });

  return readNotificationHistory(client, { sessionId, baseline, page });
}

interface NotificationHistory {
  sessionId: string;
  baseline: NotificationBaseline | undefined;
  page: FeedPageOutput;
}

async function readNotificationHistory(
  client: NotificationClient,
  { sessionId, baseline, page }: NotificationHistory,
): Promise<FeedPageOutput> {
  const rows = [...page.rows];
  let older = page;

  while (needsOlderRows(older, baseline)) {
    older = await readOlderPage(client, sessionId, older);

    if (older.epoch !== page.epoch) return older;
    rows.unshift(...older.rows);
  }

  return { ...page, rows };
}

async function readOlderPage(
  client: NotificationClient,
  sessionId: string,
  page: FeedPageOutput,
): Promise<FeedPageOutput> {
  return client.feed.page.query({
    sessionId,
    direction: 'before',
    cursor: page.startCursor ?? undefined,
    epoch: page.epoch,
  });
}

function needsOlderRows(
  page: FeedPageOutput,
  baseline: NotificationBaseline | undefined,
): boolean {
  if (!page.hasOlder) return false;

  return afterBaseline(page, baseline);
}

function afterBaseline(
  page: FeedPageOutput,
  baseline: NotificationBaseline | undefined,
): boolean {
  if (!hasSameEpoch(page, baseline)) return false;

  return (page.startCursor ?? -1) > baselinePosition(baseline);
}

export const baselinePosition = (
  baseline: NotificationBaseline | undefined,
): number => baseline?.position ?? -1;

const turnEndMetadata = (meta: Notice['_meta']): TurnEnd | undefined =>
  meta?.argo?.turnEnd;

export const endedTurn = (row: SessionUpdate): boolean =>
  row.sessionUpdate === 'notice' && turnEndMetadata(row._meta) !== undefined;

const hasSameEpoch = (
  page: FeedPageOutput,
  baseline: NotificationBaseline | undefined,
): boolean => baseline === undefined || baseline.epoch === page.epoch;

async function readBaselinePage(
  client: NotificationClient,
  sessionId: string,
  signal: AbortSignal | undefined,
): Promise<FeedPageOutput> {
  return client.feed.page.query(
    { sessionId, direction: 'tail', limit: 1 },
    { signal },
  );
}

export const baselineInputId = (
  baseline: NotificationBaseline | undefined,
): string | null => baseline?.inputId ?? null;

async function readSessionPage(
  client: NotificationClient,
  cursor: string | undefined,
  signal: AbortSignal | undefined,
): Promise<SessionListOutput> {
  return client.session.list.query(
    { archived: 'all', order: 'created', cursor },
    { signal },
  );
}

const lastPosition = (page: FeedPageOutput): number =>
  page.rows.at(-1)?.position ?? -1;
