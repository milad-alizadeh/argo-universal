import type {
  FeedPageOutput,
  SessionInfo,
  SessionUpdate,
  Notice,
  TurnEnd,
} from '@repo/contracts';
import type { useTRPCClient } from '#features/connection';

export type NotificationClient = ReturnType<typeof useTRPCClient>;

export interface NotificationBaseline {
  session: SessionInfo;
  epoch: number;
  position: number;
}

export async function readNotificationBaselines(
  client: NotificationClient,
): Promise<NotificationBaseline[]> {
  const baselines: NotificationBaseline[] = [];
  let cursor: string | undefined;

  do {
    const page = await client.session.list.query({ archived: false, cursor });

    baselines.push(...(await readBaselinesPage(client, page.sessions)));
    cursor = page.nextCursor ?? undefined;
  } while (cursor);

  return baselines;
}

async function readBaselinesPage(
  client: NotificationClient,
  sessions: SessionInfo[],
): Promise<NotificationBaseline[]> {
  const baselines: NotificationBaseline[] = [];

  for (const session of sessions)
    baselines.push(await readBaseline(client, session));

  return baselines;
}

async function readBaseline(
  client: NotificationClient,
  session: SessionInfo,
): Promise<NotificationBaseline> {
  const page = await client.feed.page.query({
    sessionId: session.sessionId,
    direction: 'tail',
    limit: 1,
  });

  return {
    session,
    epoch: page.epoch,
    position: page.rows.at(-1)?.position ?? -1,
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
