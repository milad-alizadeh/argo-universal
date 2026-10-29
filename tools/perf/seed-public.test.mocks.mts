import {
  FeedPageOutput,
  SessionListOutput,
  type SessionInfo,
  type SessionUpdate,
} from '@repo/contracts';
import { z } from 'zod';

const sessionsEnvelope = z.object({
  result: z.object({ data: SessionListOutput }),
});

const feedEnvelope = z.object({ result: z.object({ data: FeedPageOutput }) });

async function pageOf(
  httpUrl: string,
  cursor: string | null,
): Promise<SessionListOutput> {
  const input = encodeURIComponent(
    JSON.stringify({ ...(cursor && { cursor }) }),
  );

  const response = await fetch(`${httpUrl}/trpc/session.list?input=${input}`);

  return sessionsEnvelope.parse(await response.json()).result.data;
}

export async function listed(serverUrl: string): Promise<SessionInfo[]> {
  const rows: SessionInfo[] = [];
  let cursor: string | null = null;

  do {
    const page = await pageOf(serverUrl.replace('ws:', 'http:'), cursor);
    rows.push(...page.sessions);
    cursor = page.nextCursor;
  } while (cursor);

  return rows;
}

interface FeedCursor {
  cursor: number;
  epoch: number;
}

async function feedPage(
  serverUrl: string,
  sessionId: string,
  before?: FeedCursor,
): Promise<FeedPageOutput> {
  const input = encodeURIComponent(
    JSON.stringify({
      sessionId,
      direction: before ? 'before' : 'tail',
      limit: 200,
      ...before,
    }),
  );

  const response = await fetch(
    `${serverUrl.replace('ws:', 'http:')}/trpc/feed.page?input=${input}`,
  );

  return feedEnvelope.parse(await response.json()).result.data;
}

export async function history(
  serverUrl: string,
  sessionId: string,
): Promise<SessionUpdate[]> {
  const rows: SessionUpdate[] = [];
  let page = await feedPage(serverUrl, sessionId);

  for (;;) {
    rows.unshift(...page.rows);

    if (noOlderPage(page)) return rows;
    page = await feedPage(serverUrl, sessionId, {
      cursor: requiredCursor(page),
      epoch: page.epoch,
    });
  }
}

function noOlderPage(page: FeedPageOutput): boolean {
  return !page.hasOlder || page.startCursor === null;
}

function requiredCursor(page: FeedPageOutput): number {
  if (page.startCursor === null)
    throw new Error('An older page needs a cursor');

  return page.startCursor;
}
