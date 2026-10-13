import type { SessionUpdate } from '@repo/contracts';
import { FeedRowsJob } from '../src/feed';
import type { LiveHeaderHost } from './live-header-composition';

function runningTurnId(context: LiveHeaderHost): string {
  const turn = context.database.$client
    .prepare('SELECT id FROM turn WHERE session_id = ? AND status = ?')
    .get('session-1', 'running');

  if (typeof turn?.id !== 'string')
    throw new Error('Session has no running Turn');

  return turn.id;
}

export function writeStoredHeader(
  context: LiveHeaderHost,
  row: SessionUpdate,
): void {
  const turnId = runningTurnId(context);
  context.host.databaseWriter.send({
    type: 'writer.write',
    job: new FeedRowsJob({
      sessionId: 'session-1',
      rows: [{ ...row, sessionId: 'session-1', turnId }],
      maxRevision: row.revision,
      activityAt: Date.now(),
    }),
  });
}

export async function storedHeaderRevision(
  context: LiveHeaderHost,
  id: string,
): Promise<number | undefined> {
  const page = await context.caller.feed.page({
    sessionId: 'session-1',
    direction: 'tail',
  });

  return page.rows.find((stored) => stored.id === id)?.revision;
}
